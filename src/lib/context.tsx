'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from './supabase';
import { Trip, Score, PLAYERS, DEFAULT_PARS, RoundTeams, ALL_PAIRINGS } from './types';

interface TripContext {
  // Auth
  currentPlayer: string | null;
  setCurrentPlayer: (name: string) => void;
  // Trip
  trip: Trip | null;
  loading: boolean;
  createTrip: (commissioner: string) => Promise<void>;
  // Scores
  scores: Score[];
  getScore: (round: number, player: number, hole: number) => number | null;
  setScore: (round: number, player: number, hole: number, score: number | null) => Promise<void>;
  // Pars
  getPar: (round: number, hole: number) => number;
  setPar: (round: number, hole: number, par: number) => Promise<void>;
  // Setup
  drawTeams: () => Promise<void>;
  startTrip: () => Promise<void>;
  // Player scores helper
  getPlayerRoundScores: (round: number, player: number) => (number | null)[];
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
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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

  // Load trip (get the first active/setup trip)
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

  // Load scores for trip
  const loadScores = useCallback(async (tripId: string) => {
    const { data } = await supabase
      .from('scores')
      .select('*')
      .eq('trip_id', tripId);

    if (data) {
      setScores(data as Score[]);
    }
  }, []);

  // Subscribe to real-time changes
  useEffect(() => {
    if (!trip?.id) return;

    loadScores(trip.id);

    // Clean up existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    const channel = supabase
      .channel(`scores-${trip.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scores', filter: `trip_id=eq.${trip.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setScores(prev => {
              const existing = prev.find(s =>
                s.round === (payload.new as Score).round &&
                s.player === (payload.new as Score).player &&
                s.hole === (payload.new as Score).hole
              );
              if (existing) {
                return prev.map(s => s.id === existing.id ? payload.new as Score : s);
              }
              return [...prev, payload.new as Score];
            });
          } else if (payload.eventType === 'UPDATE') {
            setScores(prev => prev.map(s => s.id === (payload.new as Score).id ? payload.new as Score : s));
          } else if (payload.eventType === 'DELETE') {
            setScores(prev => prev.filter(s => s.id !== (payload.old as any).id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${trip.id}` },
        (payload) => {
          setTrip(payload.new as Trip);
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trip?.id, loadScores]);

  // Initial load
  useEffect(() => {
    loadTrip();
  }, [loadTrip]);

  const createTrip = useCallback(async (commissioner: string) => {
    const { data, error } = await supabase
      .from('trips')
      .insert({
        players: [...PLAYERS],
        pars: DEFAULT_PARS,
        status: 'setup',
        commissioner,
      })
      .select()
      .single();

    if (data && !error) {
      setTrip(data as Trip);
    }
  }, []);

  const getScore = useCallback((round: number, player: number, hole: number): number | null => {
    const s = scores.find(s => s.round === round && s.player === player && s.hole === hole);
    return s?.score ?? null;
  }, [scores]);

  const setScore = useCallback(async (round: number, player: number, hole: number, score: number | null) => {
    if (!trip) return;

    const { data, error } = await supabase
      .from('scores')
      .upsert(
        {
          trip_id: trip.id,
          round,
          player,
          hole,
          score,
        },
        { onConflict: 'trip_id,round,player,hole' }
      )
      .select()
      .single();

    if (data && !error) {
      setScores(prev => {
        const idx = prev.findIndex(s => s.round === round && s.player === player && s.hole === hole);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = data as Score;
          return updated;
        }
        return [...prev, data as Score];
      });
    }
  }, [trip]);

  const getPar = useCallback((round: number, hole: number): number => {
    const pars = trip?.pars ?? DEFAULT_PARS;
    return pars[round]?.[hole] ?? 4;
  }, [trip]);

  const setPar = useCallback(async (round: number, hole: number, par: number) => {
    if (!trip) return;
    const newPars = [...(trip.pars ?? DEFAULT_PARS)].map(r => [...r]);
    newPars[round][hole] = par;
    await supabase.from('trips').update({ pars: newPars }).eq('id', trip.id);
    setTrip(prev => prev ? { ...prev, pars: newPars } : null);
  }, [trip]);

  const drawTeams = useCallback(async () => {
    if (!trip) return;
    // Shuffle the 3 pairings and assign to rounds 0-2
    const shuffled = [...ALL_PAIRINGS].sort(() => Math.random() - 0.5);
    const roundTeams: RoundTeams = {
      '0': shuffled[0],
      '1': shuffled[1],
      '2': shuffled[2],
    };
    await supabase.from('trips').update({ round_teams: roundTeams }).eq('id', trip.id);
    setTrip(prev => prev ? { ...prev, round_teams: roundTeams } : null);
  }, [trip]);

  const startTrip = useCallback(async () => {
    if (!trip) return;
    await supabase.from('trips').update({ status: 'active' }).eq('id', trip.id);
    setTrip(prev => prev ? { ...prev, status: 'active' } : null);
  }, [trip]);

  const getPlayerRoundScores = useCallback((round: number, player: number): (number | null)[] => {
    const result: (number | null)[] = new Array(18).fill(null);
    scores.forEach(s => {
      if (s.round === round && s.player === player) {
        result[s.hole] = s.score;
      }
    });
    return result;
  }, [scores]);

  return (
    <Context.Provider value={{
      currentPlayer,
      setCurrentPlayer,
      trip,
      loading,
      createTrip,
      scores,
      getScore,
      setScore,
      getPar,
      setPar,
      drawTeams,
      startTrip,
      getPlayerRoundScores,
    }}>
      {children}
    </Context.Provider>
  );
}
