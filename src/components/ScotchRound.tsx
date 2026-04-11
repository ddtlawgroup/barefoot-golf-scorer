'use client';

import { useState } from 'react';
import { useTripContext } from '@/lib/context';
import { PLAYERS, ROUNDS } from '@/lib/types';
import { calcScotchRound } from '@/lib/games';
import Scorecard from './Scorecard';
import HoleExtrasPanel from './HoleExtrasPanel';
import BetPicker from './BetPicker';
import PressPanel from './PressPanel';

export default function ScotchRound({ round }: { round: number }) {
  const { trip, getPlayerNetScores, getPlayerRoundScores, getPar, getHoleExtra, getBetAmount, drawScotchTeams } = useTripContext();

  const [settingsOpen, setSettingsOpen] = useState(false);

  const scotchTeams = trip?.scotch_teams;
  const players = (trip?.players ?? []).map(p => p.name);
  const playerName = (idx: number) => players[idx] ?? PLAYERS[idx];
  const teamNames = (indices: number[]) => indices.map(i => playerName(i)).join(' & ');

  // If no teams drawn yet, show setup
  if (!scotchTeams) {
    return (
      <div className="px-4 py-4 space-y-4">
        <div className="text-center">
          <h2 className="font-serif text-2xl text-gold font-bold">{ROUNDS[round].name}</h2>
          <p className="text-cream-dim text-sm">
            Round {round + 1} {'\u00B7'} Par {ROUNDS[round].par} {'\u00B7'} 6-6-6 Scotch
          </p>
        </div>
        <div className="bg-green-card rounded-xl border border-gold/20 p-4 text-center space-y-4">
          <h3 className="font-serif text-lg text-gold">Draw Teams</h3>
          <p className="text-cream-dim text-xs">Teams rotate every 6 holes. All 3 pairings used. Same order for R1 and R3.</p>
          <button
            onClick={drawScotchTeams}
            className="w-full py-3 bg-gold text-green-deeper font-bold rounded-xl transition-all active:scale-95 hover:bg-gold-light"
          >
            Randomize 6-6-6 Teams
          </button>
        </div>
      </div>
    );
  }

  const pars = Array.from({ length: 18 }, (_, h) => getPar(round, h));
  const netScores = PLAYERS.map((_, p) => getPlayerNetScores(round, p));
  const grossScores = PLAYERS.map((_, p) => getPlayerRoundScores(round, p));
  const girPlayers = Array.from({ length: 18 }, (_, h) => getHoleExtra(round, h)?.closest_gir_player ?? null);
  const pressedHoles = Array.from({ length: 18 }, (_, h) => getHoleExtra(round, h)?.pressed ?? false);

  const result = calcScotchRound(netScores, grossScores, scotchTeams, pars, girPlayers);

  const holesWithScores = netScores[0].filter(s => s !== null).length;
  const currentSegment = Math.min(Math.floor(holesWithScores / 6), 2);
  const bet = getBetAmount(round);

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

      {/* Settings (collapsible) */}
      <div className="bg-green-card rounded-xl border border-gold/20 p-3">
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="w-full flex items-center justify-between"
        >
          <h3 className="text-xs text-gold font-medium uppercase tracking-wider">Settings</h3>
          <div className="flex items-center gap-2">
            <span className="text-cream-dim/60 text-[10px]">${bet}/pt</span>
            <span className="text-cream-dim text-xs">{settingsOpen ? '\u25B2' : '\u25BC'}</span>
          </div>
        </button>
        {settingsOpen && (
          <div className="mt-3 space-y-3 pt-3 border-t border-gold/10">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-cream-dim text-[10px]">Teams (same for R1 + R3)</span>
                <button
                  onClick={drawScotchTeams}
                  className="text-[10px] px-2 py-1 rounded bg-gold/10 border border-gold/20 text-gold active:scale-95"
                >
                  Re-Draw
                </button>
              </div>
              <div className="space-y-1">
                {scotchTeams.map((pairing, seg) => (
                  <div key={seg} className="flex items-center justify-between text-xs">
                    <span className="text-cream-dim">H{seg * 6 + 1}-{(seg + 1) * 6}:</span>
                    <div>
                      <span className="text-yellow-400">{teamNames(pairing[0])}</span>
                      <span className="text-cream-dim mx-1.5">vs</span>
                      <span className="text-blue-400">{teamNames(pairing[1])}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <BetPicker round={round} />
          </div>
        )}
      </div>

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
