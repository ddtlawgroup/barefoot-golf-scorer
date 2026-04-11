'use client';

import { useTripContext } from '@/lib/context';
import { PLAYERS, ROUNDS } from '@/lib/types';
import { calcScotchRound } from '@/lib/games';
import Scorecard from './Scorecard';
import HoleExtrasPanel from './HoleExtrasPanel';
import BetPicker from './BetPicker';
import PressPanel from './PressPanel';

export default function ScotchRound({ round }: { round: number }) {
  const { trip, getPlayerNetScores, getPlayerRoundScores, getPar, getHoleExtra, getBetAmount } = useTripContext();

  const scotchTeams = trip?.scotch_teams;
  if (!scotchTeams) return <div className="p-4 text-cream-dim">Scotch teams not configured.</div>;

  const pars = Array.from({ length: 18 }, (_, h) => getPar(round, h));
  const netScores = PLAYERS.map((_, p) => getPlayerNetScores(round, p));
  const grossScores = PLAYERS.map((_, p) => getPlayerRoundScores(round, p));
  const girPlayers = Array.from({ length: 18 }, (_, h) => getHoleExtra(round, h)?.closest_gir_player ?? null);
  const pressedHoles = Array.from({ length: 18 }, (_, h) => getHoleExtra(round, h)?.pressed ?? false);

  const result = calcScotchRound(netScores, grossScores, scotchTeams, pars, girPlayers);

  const players = (trip?.players ?? []).map(p => p.name);
  const teamNames = (indices: number[]) => indices.map(i => players[i] ?? PLAYERS[i]).join(' & ');

  const holesWithScores = netScores[0].filter(s => s !== null).length;
  const currentSegment = Math.min(Math.floor(holesWithScores / 6), 2);
  const bet = getBetAmount(round);

  // Calculate per-player dollars factoring in presses
  const playerDollars = PLAYERS.map((_, p) => {
    let total = 0;
    for (let h = 0; h < 18; h++) {
      const seg = Math.floor(h / 6);
      const [teamA, teamB] = scotchTeams[seg];
      const mult = pressedHoles[h] ? 2 : 1;
      const holeResult = result.holeResults[h];
      if (teamA.includes(p)) total += holeResult.teamAPoints * bet * mult;
      else if (teamB.includes(p)) total += holeResult.teamBPoints * bet * mult;
    }
    return total;
  });

  // Segment dollars
  const segmentDollars = result.segments.map((seg, i) => {
    let aTotal = 0, bTotal = 0;
    for (let h = i * 6; h < (i + 1) * 6; h++) {
      const mult = pressedHoles[h] ? 2 : 1;
      aTotal += result.holeResults[h].teamAPoints * bet * mult;
      bTotal += result.holeResults[h].teamBPoints * bet * mult;
    }
    return { aTotal, bTotal };
  });

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="text-center">
        <h2 className="font-serif text-2xl text-gold font-bold">{ROUNDS[round].name}</h2>
        <p className="text-cream-dim text-sm">
          Round {round + 1} {'\u00B7'} Par {ROUNDS[round].par} {'\u00B7'} 6-6-6 Scotch
        </p>
      </div>

      <BetPicker round={round} />

      {/* Segment Scores */}
      <div className="bg-green-card rounded-xl border border-gold/20 p-3">
        <h3 className="text-xs text-gold font-medium mb-2 uppercase tracking-wider">Scotch Points by Segment</h3>
        <div className="space-y-2">
          {result.segments.map((seg, i) => {
            const isActive = i === currentSegment;
            const sd = segmentDollars[i];
            return (
              <div key={i} className={`p-2 rounded-lg ${isActive ? 'bg-green-deeper/50 border border-gold/20' : ''}`}>
                <div className="flex items-center justify-between text-sm">
                  <div className="text-cream-dim text-xs">
                    H{i * 6 + 1}-{(i + 1) * 6}
                    {isActive && <span className="text-gold ml-1">{'\u25C0'}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-yellow-400 font-bold">{teamNames(seg.pairing[0])}: {seg.teamA}</span>
                    <span className="text-cream-dim">vs</span>
                    <span className="text-blue-400 font-bold">{teamNames(seg.pairing[1])}: {seg.teamB}</span>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-0.5 text-[10px]">
                  <span className="text-yellow-400/60">${sd.aTotal.toFixed(2)}</span>
                  <span className="text-blue-400/60">${sd.bTotal.toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between items-center mt-3 pt-2 border-t border-gold/20">
          <span className="text-cream-dim text-xs">Player Totals:</span>
          <div className="flex gap-3 text-xs">
            {PLAYERS.map((name, p) => (
              <span key={p} className="text-cream">
                {players[p]?.[0] ?? name[0]}: <span className="text-gold font-bold">{result.playerPoints[p]}</span>
                <span className="text-cream-dim/50 ml-0.5">(${playerDollars[p].toFixed(2)})</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <PressPanel round={round} />
      <HoleExtrasPanel round={round} showGir showCtp />
      <Scorecard round={round} />
    </div>
  );
}
