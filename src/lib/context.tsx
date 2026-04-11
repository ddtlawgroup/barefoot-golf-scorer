'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from './supabase';
import {
  Trip, Score, HoleExtra, ScrambleScore, PLAYERS, DEFAULT_PARS,
  DEFAULT_HOLE_HANDICAPS, ScotchTeams, ALL_PAIRINGS, DEFAULT_PLAYERS,
  PlayerData, courseHandicap, strokeHoles, ROUNDS,
} from './types';

interface TripContext {
  currentPlayer: string | null;
  setCurrentPlayer: (name: string) => void;
  trip: Trip | null;
  loading: boolean;
  createTrip: (commissioner: string) => Promise<void>;
  // Scores (gross)
  scores: Score[];
  getScore: (round: number, player: number, hole: number) => number | null;
  setScore: (round: number, player: number, hole: number, score: number | null) => Promise<void>;
  getPlayerRoundScores: (round: number, player: number) => (number | null)[];
  // Net scores
  getPlayerNetScores: (round: number, player: number) => (number | null)[];
  getPlayerCourseHcp: (player: number, round: number) => number;
  getStrokeHoles: (player: number, round: number) => boolean[];
  // Pars
  getPar: (round: number, hole: number) => number;
  getHoleHcp: (round: number, hole: number) => number;
  // Hole extras (GIR, wolf, CTP)
  holeExtras: HoleExtra[];
  getHoleExtra: (round: number, hole: number) => HoleExtra | null;
  setHoleExtra: (round: number, hole: number, data: Partial<HoleExtra>) => Promise<void>;
  // Scramble scores
  scrambleScores: ScrambleScore[];
  getScrambleScore: (hole: number, team: number) => number | null;
  setScrambleScore: (hole: number, team: number, score: number | null) => Promise<void>;
  // Setup
  updatePlayers: (players: PlayerData[]) => Promise<void>;
  drawScotchTeams: () => Promise<void>;
  setWolfTeeOrder: (order: number[]) => Promise<void>;
  startTrip: () => Promise<void>;
  resetTrip: () => Promise<void>;
  // Betting
  setBetAmount: (round: number, amount: number) => Promise<void>;
  getBetAmount: (round: number) => number;
  // Scramble strokes toggle
  toggleScrambleStrokes: () => Promise<void>;
  setScrambleTeamsOverride: (teams: [number[], number[]] | null) => Promise<void>;
}

const Context = createContext<TripContext | null>(null);

export function useTripContext() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useTripContext must be inside TripProvider');
  return ctx;
}

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [currentPlayer, setCurrentPlayerState] = useState<string | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [holeExtras, setHoleExtras] = useState<HoleExtra[]>([]);
  const [scrambleScores, setScrambleScores] = useState<ScrambleScore[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Load player from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('golf-player');
    if (saved && PLAYERS.includes(saved as any)) {
      setCurrentPlayerState(saved);
    }
    setLoading(false);
  }, []);

  const setCurrentPlayer = useCallback((name: string) => {
    localStorage.setItem('golf-player', name);
    setCurrentPlayerState(name);
  }, []);

  // Load trip
  const loadTrip = useCallback(async () => {
    const { data } = await supabase
      .from('trips')
      .select('*')
      .in('status', ['setup', 'active'])
      .order('created_at', { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      setTrip(data[0] as Trip);
      return data[0] as Trip;
    }
    return null;
  }, []);

  // Load all data for a trip
  const loadTripData = useCallback(async (tripId: string) => {
    const [scoresRes, extrasRes, scrambleRes] = await Promise.all([
      supabase.from('scores').select('*').eq('trip_id', tripId),
      supabase.from('hole_extras').select('*').eq('trip_id', tripId),
      supabase.from('scramble_scores').select('*').eq('trip_id', tripId),
    ]);
    if (scoresRes.data) setScores(scoresRes.data as Score[]);
    if (extrasRes.data) setHoleExtras(extrasRes.data as HoleExtra[]);
    if (scrambleRes.data) setScrambleScores(scrambleRes.data as ScrambleScore[]);
  }, []);

  // Real-time subscriptions
  useEffect(() => {
    if (!trip?.id) return;
    loadTripData(trip.id);

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`trip-${trip.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores', filter: `trip_id=eq.${trip.id}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setScores(prev => prev.filter(s => s.id !== (payload.old as any).id));
          } else {
            const newScore = payload.new as Score;
            setScores(prev => {
              const idx = prev.findIndex(s => s.round === newScore.round && s.player === newScore.player && s.hole === newScore.hole);
              if (idx >= 0) { const u = [...prev]; u[idx] = newScore; return u; }
              return [...prev, newScore];
            });
          }
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hole_extras', filter: `trip_id=eq.${trip.id}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setHoleExtras(prev => prev.filter(e => e.id !== (payload.old as any).id));
          } else {
            const newExtra = payload.new as HoleExtra;
            setHoleExtras(prev => {
              const idx = prev.findIndex(e => e.round === newExtra.round && e.hole === newExtra.hole);
              if (idx >= 0) { const u = [...prev]; u[idx] = newExtra; return u; }
              return [...prev, newExtra];
            });
          }
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scramble_scores', filter: `trip_id=eq.${trip.id}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setScrambleScores(prev => prev.filter(s => s.id !== (payload.old as any).id));
          } else {
            const newSS = payload.new as ScrambleScore;
            setScrambleScores(prev => {
              const idx = prev.findIndex(s => s.hole === newSS.hole && s.team === newSS.team);
              if (idx >= 0) { const u = [...prev]; u[idx] = newSS; return u; }
              return [...prev, newSS];
            });
          }
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${trip.id}` },
        (payload) => { setTrip(payload.new as Trip); })
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [trip?.id, loadTripData]);

  useEffect(() => { loadTrip(); }, [loadTrip]);

  // ── Trip CRUD ──

  const createTrip = useCallback(async (commissioner: string) => {
    const { data, error } = await supabase
      .from('trips')
      .insert({
        players: DEFAULT_PLAYERS,
        pars: DEFAULT_PARS,
        hole_handicaps: DEFAULT_HOLE_HANDICAPS,
        status: 'setup',
        commissioner,
      })
      .select()
      .single();
    if (data && !error) setTrip(data as Trip);
  }, []);

  const updatePlayers = useCallback(async (players: PlayerData[]) => {
    if (!trip) return;
    await supabase.from('trips').update({ players }).eq('id', trip.id);
    setTrip(prev => prev ? { ...prev, players } : null);
  }, [trip]);

  const drawScotchTeams = useCallback(async () => {
    if (!trip) return;
    const shuffled = [...ALL_PAIRINGS].sort(() => Math.random() - 0.5);
    const scotchTeams: ScotchTeams = [shuffled[0], shuffled[1], shuffled[2]];
    await supabase.from('trips').update({ scotch_teams: scotchTeams }).eq('id', trip.id);
    setTrip(prev => prev ? { ...prev, scotch_teams: scotchTeams } : null);
  }, [trip]);

  const setWolfTeeOrder = useCallback(async (order: number[]) => {
    if (!trip) return;
    await supabase.from('trips').update({ wolf_tee_order: order }).eq('id', trip.id);
    setTrip(prev => prev ? { ...prev, wolf_tee_order: order } : null);
  }, [trip]);

  const startTrip = useCallback(async () => {
    if (!trip) return;
    await supabase.from('trips').update({ status: 'active' }).eq('id', trip.id);
    setTrip(prev => prev ? { ...prev, status: 'active' } : null);
  }, [trip]);

  const resetTrip = useCallback(async () => {
    if (!trip) return;
    await Promise.all([
      supabase.from('scores').delete().eq('trip_id', trip.id),
      supabase.from('hole_extras').delete().eq('trip_id', trip.id),
      supabase.from('scramble_scores').delete().eq('trip_id', trip.id),
    ]);
    await supabase.from('trips').delete().eq('id', trip.id);
    setTrip(null);
    setScores([]);
    setHoleExtras([]);
    setScrambleScores([]);
  }, [trip]);

  // ── Score access ──

  const getScore = useCallback((round: number, player: number, hole: number): number | null => {
    return scores.find(s => s.round === round && s.player === player && s.hole === hole)?.score ?? null;
  }, [scores]);

  const setScore = useCallback(async (round: number, player: number, hole: number, score: number | null) => {
    if (!trip) return;
    const { data, error } = await supabase
      .from('scores')
      .upsert({ trip_id: trip.id, round, player, hole, score }, { onConflict: 'trip_id,round,player,hole' })
      .select().single();
    if (data && !error) {
      setScores(prev => {
        const idx = prev.findIndex(s => s.round === round && s.player === player && s.hole === hole);
        if (idx >= 0) { const u = [...prev]; u[idx] = data as Score; return u; }
        return [...prev, data as Score];
      });
    }
  }, [trip]);

  const getPlayerRoundScores = useCallback((round: number, player: number): (number | null)[] => {
    const result: (number | null)[] = new Array(18).fill(null);
    scores.forEach(s => {
      if (s.round === round && s.player === player) result[s.hole] = s.score;
    });
    return result;
  }, [scores]);

  // ── Handicap / Net ──

  const getPlayerCourseHcpFn = useCallback((player: number, round: number): number => {
    const players = trip?.players ?? DEFAULT_PLAYERS;
    return courseHandicap(players[player].handicapIndex, ROUNDS[round].slope);
  }, [trip]);

  const getStrokeHolesFn = useCallback((player: number, round: number): boolean[] => {
    const hcp = getPlayerCourseHcpFn(player, round);
    const holeHcps = trip?.hole_handicaps?.[round] ?? DEFAULT_HOLE_HANDICAPS[round];
    return strokeHoles(hcp, holeHcps);
  }, [trip, getPlayerCourseHcpFn]);

  const getPlayerNetScores = useCallback((round: number, player: number): (number | null)[] => {
    const gross = getPlayerRoundScores(round, player);
    const strokes = getStrokeHolesFn(player, round);
    return gross.map((g, i) => g === null ? null : (strokes[i] ? g - 1 : g));
  }, [getPlayerRoundScores, getStrokeHolesFn]);

  const getPar = useCallback((round: number, hole: number): number => {
    return (trip?.pars ?? DEFAULT_PARS)[round]?.[hole] ?? 4;
  }, [trip]);

  const getHoleHcp = useCallback((round: number, hole: number): number => {
    return (trip?.hole_handicaps ?? DEFAULT_HOLE_HANDICAPS)[round]?.[hole] ?? 9;
  }, [trip]);

  // ── Hole extras ──

  const getHoleExtra = useCallback((round: number, hole: number): HoleExtra | null => {
    return holeExtras.find(e => e.round === round && e.hole === hole) ?? null;
  }, [holeExtras]);

  const setHoleExtra = useCallback(async (round: number, hole: number, data: Partial<HoleExtra>) => {
    if (!trip) return;
    const payload = { trip_id: trip.id, round, hole, ...data };
    const { data: res, error } = await supabase
      .from('hole_extras')
      .upsert(payload, { onConflict: 'trip_id,round,hole' })
      .select().single();
    if (res && !error) {
      setHoleExtras(prev => {
        const idx = prev.findIndex(e => e.round === round && e.hole === hole);
        if (idx >= 0) { const u = [...prev]; u[idx] = res as HoleExtra; return u; }
        return [...prev, res as HoleExtra];
      });
    }
  }, [trip]);

  // ── Betting ──

  const setBetAmount = useCallback(async (round: number, amount: number) => {
    if (!trip) return;
    const betAmounts = [...(trip.bet_amounts ?? [1, 1, 1, 1])];
    betAmounts[round] = amount;
    await supabase.from('trips').update({ bet_amounts: betAmounts }).eq('id', trip.id);
    setTrip(prev => prev ? { ...prev, bet_amounts: betAmounts } : null);
  }, [trip]);

  const getBetAmount = useCallback((round: number): number => {
    return trip?.bet_amounts?.[round] ?? 1;
  }, [trip]);

  const toggleScrambleStrokes = useCallback(async () => {
    if (!trip) return;
    const newVal = !(trip.scramble_strokes ?? true);
    await supabase.from('trips').update({ scramble_strokes: newVal }).eq('id', trip.id);
    setTrip(prev => prev ? { ...prev, scramble_strokes: newVal } : null);
  }, [trip]);

  const setScrambleTeamsOverride = useCallback(async (teams: [number[], number[]] | null) => {
    if (!trip) return;
    await supabase.from('trips').update({ scramble_teams_override: teams }).eq('id', trip.id);
    setTrip(prev => prev ? { ...prev, scramble_teams_override: teams } : null);
  }, [trip]);

  // ── Scramble scores ──

  const getScrambleScore = useCallback((hole: number, team: number): number | null => {
    return scrambleScores.find(s => s.hole === hole && s.team === team)?.gross_score ?? null;
  }, [scrambleScores]);

  const setScrambleScore = useCallback(async (hole: number, team: number, score: number | null) => {
    if (!trip) return;
    const { data, error } = await supabase
      .from('scramble_scores')
      .upsert({ trip_id: trip.id, hole, team, gross_score: score }, { onConflict: 'trip_id,hole,team' })
      .select().single();
    if (data && !error) {
      setScrambleScores(prev => {
        const idx = prev.findIndex(s => s.hole === hole && s.team === team);
        if (idx >= 0) { const u = [...prev]; u[idx] = data as ScrambleScore; return u; }
        return [...prev, data as ScrambleScore];
      });
    }
  }, [trip]);

  return (
    <Context.Provider value={{
      currentPlayer, setCurrentPlayer, trip, loading, createTrip,
      scores, getScore, setScore, getPlayerRoundScores,
      getPlayerNetScores, getPlayerCourseHcp: getPlayerCourseHcpFn, getStrokeHoles: getStrokeHolesFn,
      getPar, getHoleHcp,
      holeExtras, getHoleExtra, setHoleExtra,
      scrambleScores, getScrambleScore, setScrambleScore,
      updatePlayers, drawScotchTeams, setWolfTeeOrder,
      startTrip, resetTrip,
      setBetAmount, getBetAmount, toggleScrambleStrokes, setScrambleTeamsOverride,
    }}>
      {children}
    </Context.Provider>
  );
}
