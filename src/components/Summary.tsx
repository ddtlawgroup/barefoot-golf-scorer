'use client';

import { useState } from 'react';
import { useTripContext } from '@/lib/context';
import { PLAYERS, ROUNDS, DEFAULT_PARS, DEFAULT_HOLE_HANDICAPS, scrambleHandicap, getPar3Holes } from '@/lib/types';
import { calcStableford, calcScotchRound, calcWolfRound, getScrambleTeams, scrambleNetScore } from '@/lib/games';
import { StablefordInfo, ScotchInfo, WolfInfo, ScrambleInfo, CtpInfo } from './InfoModal';

export default function Summary() {
  const { trip, getPlayerNetScores, getPlayerRoundScores, getPar, getPlayerCourseHcp, getHoleExtra, getScrambleScore, currentPlayer, resetTrip } = useTripContext();
  const [showReset, setShowReset] = useState(false);
  const isCommissioner = currentPlayer === trip?.commissioner;

  const players = (trip?.players ?? []).map(p => p.name);
  const holeHcps = trip?.hole_handicaps ?? DEFAULT_HOLE_HANDICAPS;

  // Stableford per round per player (using NET scores)
  // For R4 scramble, both players share team net score
  const stablefordByRound = PLAYERS.map((_, p) => {
    return [0, 1, 2, 3].map(r => {
      if (r === 3) {
        // Scramble: find which team this player is on, use team net scores
        const totals = PLAYERS.map((_, pl) => {
          let t = 0;
          for (let rr = 0; rr < 3; rr++) {
            const net = getPlayerNetScores(rr, pl);
            const rPars = Array.from({ length: 18 }, (_, h) => getPar(rr, h));
            t += calcStableford(net, rPars);
          }
          return t;
        });
        const teams = getScrambleTeams(totals);
        const teamIdx = teams[0].includes(p) ? 0 : 1;
        const teamHcp = scrambleHandicap(
          getPlayerCourseHcp(teams[teamIdx][0], 3),
          getPlayerCourseHcp(teams[teamIdx][1], 3)
        );
        const netScores = Array.from({ length: 18 }, (_, h) => {
          const g = getScrambleScore(h, teamIdx);
          return scrambleNetScore(g, teamHcp, h, holeHcps[3]);
        });
        const rPars = Array.from({ length: 18 }, (_, h) => getPar(3, h));
        return calcStableford(netScores, rPars);
      }
      const net = getPlayerNetScores(r, p);
      const rPars = Array.from({ length: 18 }, (_, h) => getPar(r, h));
      return calcStableford(net, rPars);
    });
  });

  const totalStableford = stablefordByRound.map(rounds => rounds.reduce((a, b) => a + b, 0));
  const maxStableford = Math.max(...totalStableford);

  // Total gross strokes
  const totalStrokes = PLAYERS.map((_, p) => {
    let total = 0, count = 0, par = 0;
    for (let r = 0; r < 4; r++) {
      const scores = getPlayerRoundScores(r, p);
      scores.forEach((s, h) => {
        if (s !== null) { total += s; par += getPar(r, h); count++; }
      });
    }
    return { total, count, par };
  });

  // Scotch points (R1 + R3 combined)
  const scotchPlayerPoints = [0, 0, 0, 0];
  if (trip?.scotch_teams) {
    for (const r of [0, 2]) {
      const pars = Array.from({ length: 18 }, (_, h) => getPar(r, h));
      const netScores = PLAYERS.map((_, p) => getPlayerNetScores(r, p));
      const girPlayers = Array.from({ length: 18 }, (_, h) => getHoleExtra(r, h)?.closest_gir_player ?? null);
      const result = calcScotchRound(netScores, trip.scotch_teams, pars, girPlayers);
      result.playerPoints.forEach((pts, p) => { scotchPlayerPoints[p] += pts; });
    }
  }

  // Wolf points (R2)
  const wolfPlayerPoints = [0, 0, 0, 0];
  if (trip?.wolf_tee_order) {
    const pars = Array.from({ length: 18 }, (_, h) => getPar(1, h));
    const netScores = PLAYERS.map((_, p) => getPlayerNetScores(1, p));
    const girPlayers = Array.from({ length: 18 }, (_, h) => getHoleExtra(1, h)?.closest_gir_player ?? null);
    const wolfPartners = Array.from({ length: 18 }, (_, h) => getHoleExtra(1, h)?.wolf_partner ?? null);
    const wolfSpits = Array.from({ length: 18 }, (_, h) => getHoleExtra(1, h)?.wolf_spit ?? false);
    const result = calcWolfRound(netScores, trip.wolf_tee_order, wolfPartners, wolfSpits, pars, girPlayers);
    result.playerPoints.forEach((pts, p) => { wolfPlayerPoints[p] = pts; });
  }

  // Scramble result
  const stablefordR3 = PLAYERS.map((_, p) => {
    let t = 0;
    for (let r = 0; r < 3; r++) {
      const net = getPlayerNetScores(r, p);
      const rPars = Array.from({ length: 18 }, (_, h) => getPar(r, h));
      t += calcStableford(net, rPars);
    }
    return t;
  });
  const scrambleTeams = getScrambleTeams(stablefordR3);
  const scrambleTeamHcps = scrambleTeams.map(team =>
    scrambleHandicap(getPlayerCourseHcp(team[0], 3), getPlayerCourseHcp(team[1], 3))
  );
  const scrambleTotals = [0, 1].map(t => {
    let gross = 0, net = 0, count = 0;
    for (let h = 0; h < 18; h++) {
      const g = getScrambleScore(h, t);
      if (g !== null) {
        gross += g;
        net += scrambleNetScore(g, scrambleTeamHcps[t], h, holeHcps[3]) ?? g;
        count++;
      }
    }
    return { gross, net, count };
  });

  // CTP leaderboard
  const ctpCounts = [0, 0, 0, 0];
  for (let r = 0; r < 4; r++) {
    const pars = Array.from({ length: 18 }, (_, h) => getPar(r, h));
    const par3s = getPar3Holes(pars);
    par3s.forEach(h => {
      const winner = getHoleExtra(r, h)?.ctp_winner;
      if (winner !== null && winner !== undefined) ctpCounts[winner]++;
    });
  }

  const roundWinners = [0, 1, 2, 3].map(r => {
    const scores = stablefordByRound.map(p => p[r]);
    const max = Math.max(...scores);
    if (max === 0) return null;
    const winners = scores.filter(s => s === max);
    if (winners.length > 1) return null;
    return scores.indexOf(max);
  });

  const teamName = (indices: number[]) => indices.map(i => players[i] ?? PLAYERS[i]).join(' & ');

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="text-center">
        <h2 className="font-serif text-2xl text-gold font-bold">Leaderboard</h2>
        <p className="text-cream-dim text-sm">72-Hole Weekend Summary</p>
      </div>

      {/* Weekend Champion */}
      <div className="bg-green-card rounded-xl border-2 border-gold p-4 text-center">
        <p className="text-gold text-xs uppercase tracking-wider mb-1">Weekend Champion</p>
        <div className="flex items-center justify-center gap-2">
          <span className="text-3xl">{'\uD83D\uDC51'}</span>
          <span className="font-serif text-3xl font-bold text-gold">
            {totalStableford.every(s => s === 0) ? 'TBD' : players[totalStableford.indexOf(maxStableford)] ?? PLAYERS[totalStableford.indexOf(maxStableford)]}
          </span>
        </div>
        {maxStableford > 0 && <p className="text-cream-dim text-sm mt-1">{maxStableford} Stableford pts</p>}
      </div>

      {/* Stableford */}
      <div className="bg-green-card rounded-xl border border-gold/20 p-4">
        <h3 className="text-xs text-gold font-medium mb-3 uppercase tracking-wider inline-flex items-center">Stableford Points<StablefordInfo /></h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-center">
            <thead>
              <tr className="border-b border-gold/20">
                <th className="py-2 text-left text-cream-dim text-xs">Player</th>
                {['R1', 'R2', 'R3', 'R4'].map(r => <th key={r} className="py-2 text-cream-dim text-xs">{r}</th>)}
                <th className="py-2 text-gold text-xs">Tot</th>
              </tr>
            </thead>
            <tbody>
              {PLAYERS.map((name, p) => (
                <tr key={p} className="border-b border-gold/10">
                  <td className="py-2 text-left text-cream font-medium text-xs">{players[p] ?? name}</td>
                  {[0, 1, 2, 3].map(r => (
                    <td key={r} className={`py-2 text-xs ${roundWinners[r] === p ? 'text-gold font-bold' : 'text-cream'}`}>
                      {stablefordByRound[p][r]}
                    </td>
                  ))}
                  <td className={`py-2 text-xs font-bold ${totalStableford[p] === maxStableford && maxStableford > 0 ? 'text-gold' : 'text-cream'}`}>
                    {totalStableford[p]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scotch Points */}
      <div className="bg-green-card rounded-xl border border-gold/20 p-4">
        <h3 className="text-xs text-gold font-medium mb-3 uppercase tracking-wider inline-flex items-center">6-6-6 Scotch (R1 + R3)<ScotchInfo /></h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          {PLAYERS.map((name, p) => (
            <div key={p} className="bg-green-deeper/50 rounded-lg py-3">
              <div className="text-cream-dim text-xs mb-1">{players[p] ?? name}</div>
              <div className={`text-xl font-bold ${scotchPlayerPoints[p] > 0 ? 'text-gold' : 'text-cream-dim/50'}`}>
                {scotchPlayerPoints[p]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Wolf Points */}
      <div className="bg-green-card rounded-xl border border-gold/20 p-4">
        <h3 className="text-xs text-gold font-medium mb-3 uppercase tracking-wider inline-flex items-center">Wolf (R2)<WolfInfo /></h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          {PLAYERS.map((name, p) => (
            <div key={p} className="bg-green-deeper/50 rounded-lg py-3">
              <div className="text-cream-dim text-xs mb-1">{players[p] ?? name}</div>
              <div className={`text-xl font-bold ${wolfPlayerPoints[p] > 0 ? 'text-gold' : 'text-cream-dim/50'}`}>
                {wolfPlayerPoints[p]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scramble */}
      <div className="bg-green-card rounded-xl border border-gold/20 p-4">
        <h3 className="text-xs text-gold font-medium mb-3 uppercase tracking-wider inline-flex items-center">Scramble (R4: Dye)<ScrambleInfo /></h3>
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map(t => (
            <div key={t} className={`rounded-lg p-3 text-center ${t === 0 ? 'bg-yellow-900/10 border border-yellow-400/20' : 'bg-blue-900/10 border border-blue-400/20'}`}>
              <div className={`text-xs mb-1 ${t === 0 ? 'text-yellow-400' : 'text-blue-400'}`}>{teamName(scrambleTeams[t])}</div>
              <div className="text-xl font-bold text-cream">{scrambleTotals[t].count > 0 ? scrambleTotals[t].net : '-'}</div>
              {scrambleTotals[t].count > 0 && <div className="text-[10px] text-cream-dim">Gross: {scrambleTotals[t].gross}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* CTP Leaderboard */}
      <div className="bg-green-card rounded-xl border border-gold/20 p-4">
        <h3 className="text-xs text-gold font-medium mb-3 uppercase tracking-wider inline-flex items-center">Closest to Pin (Par 3s)<CtpInfo /></h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          {PLAYERS.map((name, p) => (
            <div key={p} className="bg-green-deeper/50 rounded-lg py-3">
              <div className="text-cream-dim text-xs mb-1">{players[p] ?? name}</div>
              <div className={`text-xl font-bold ${ctpCounts[p] > 0 ? 'text-gold' : 'text-cream-dim/50'}`}>
                {ctpCounts[p]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total Strokes */}
      <div className="bg-green-card rounded-xl border border-gold/20 p-4">
        <h3 className="text-xs text-gold font-medium mb-3 uppercase tracking-wider">Total Gross Strokes</h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          {PLAYERS.map((name, p) => {
            const diff = totalStrokes[p].total - totalStrokes[p].par;
            return (
              <div key={p} className="bg-green-deeper/50 rounded-lg py-3">
                <div className="text-cream-dim text-xs mb-1">{players[p] ?? name}</div>
                <div className="text-xl font-bold text-cream">{totalStrokes[p].count > 0 ? totalStrokes[p].total : '-'}</div>
                {totalStrokes[p].count > 0 && (
                  <div className={`text-xs mt-0.5 ${diff > 0 ? 'text-red-400' : diff < 0 ? 'text-green-400' : 'text-cream-dim'}`}>
                    {diff > 0 ? '+' : ''}{diff}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Reset */}
      {isCommissioner && (
        <div className="pt-12 pb-4">
          {!showReset ? (
            <button onClick={() => setShowReset(true)} className="w-full text-center text-cream-dim/30 text-xs py-2">
              Reset Trip
            </button>
          ) : (
            <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-4 text-center space-y-3">
              <p className="text-red-400 font-medium text-sm">Delete this trip and all scores?</p>
              <p className="text-cream-dim/60 text-xs">This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowReset(false)} className="flex-1 py-2.5 bg-green-card border border-gold/20 rounded-lg text-cream-dim text-sm active:scale-95">Cancel</button>
                <button onClick={resetTrip} className="flex-1 py-2.5 bg-red-600 rounded-lg text-white font-medium text-sm active:scale-95">Yes, Reset Everything</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
