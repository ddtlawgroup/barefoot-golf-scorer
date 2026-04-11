'use client';

import { useTripContext } from '@/lib/context';
import { PLAYERS, ROUNDS } from '@/lib/types';
import { calcScotchRound } from '@/lib/games';
import Scorecard from './Scorecard';
import HoleExtrasPanel from './HoleExtrasPanel';
import BetPicker from './BetPicker';

export default function ScotchRound({ round }: { round: number }) {
  const { trip, getPlayerNetScores, getPlayerRoundScores, getPar, getHoleExtra, getBetAmount } = useTripContext();

  const scotchTeams = trip?.scotch_teams;
  if (!scotchTeams) return <div className="p-4 text-cream-dim">Scotch teams not configured.</div>;

  const pars = Array.from({ length: 18 }, (_, h) => getPar(round, h));
  const netScores = PLAYERS.map((_, p) => getPlayerNetScores(round, p));
  const grossScores = PLAYERS.map((_, p) => getPlayerRoundScores(round, p));
  const girPlayers = Array.from({ length: 18 }, (_, h) => getHoleExtra(round, h)?.closest_gir_player ?? null);

  const result = calcScotchRound(netScores, grossScores, scotchTeams, pars, girPlayers);

  const players = (trip?.players ?? []).map(p => p.name);
  const teamNames = (indices: number[]) => indices.map(i => players[i] ?? PLAYERS[i]).join(' & ');

  const holesWithScores = netScores[0].filter(s => s !== null).length;
  const currentSegment = Math.min(Math.floor(holesWithScores / 6), 2);

  const bet = getBetAmount(round);

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
            return (
              <div key={i} className={`flex items-center justify-between text-sm p-2 rounded-lg ${isActive ? 'bg-green-deeper/50 border border-gold/20' : ''}`}>
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
            );
          })}
        </div>
        <div className="flex justify-between items-center mt-3 pt-2 border-t border-gold/20">
          <span className="text-cream-dim text-xs">Player Totals:</span>
          <div className="flex gap-3 text-xs">
            {PLAYERS.map((name, p) => (
              <span key={p} className="text-cream">
                {players[p]?.[0] ?? name[0]}: <span className="text-gold font-bold">{result.playerPoints[p]}</span>
                <span className="text-cream-dim/50 ml-0.5">(${(result.playerPoints[p] * bet).toFixed(2)})</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <HoleExtrasPanel round={round} showGir showCtp />
      <Scorecard round={round} />
    </div>
  );
}
