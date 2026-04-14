'use client';

import { useState } from 'react';
import { useTripContext } from '@/lib/context';
import { PLAYERS, getScoreColor, getScoreBg } from '@/lib/types';

interface ScorecardProps {
  round: number;
  showNetRow?: boolean;
  holePoints?: { teamAPoints: number; teamBPoints: number }[];
  // Per-player points per hole: [hole][player] => points
  playerHolePoints?: number[][];
}

export default function Scorecard({ round, showNetRow = true, holePoints, playerHolePoints }: ScorecardProps) {
  const { getScore, setScore, getPar, getStrokeHoles, getPlayerRoundScores, getPlayerNetScores, trip, getHoleExtra, setHoleExtra } = useTripContext();
  const [nine, setNine] = useState<'front' | 'back'>('front');
  const [activeInput, setActiveInput] = useState<{ player: number; hole: number } | null>(null);
  const [girPromptHole, setGirPromptHole] = useState<number | null>(null);

  const startHole = nine === 'front' ? 0 : 9;
  const holes = Array.from({ length: 9 }, (_, i) => startHole + i);
  const pars = holes.map(h => getPar(round, h));
  const parNineTotal = pars.reduce((s, p) => s + p, 0);

  const isPar3 = (hole: number) => getPar(round, hole) === 3;

  const players = (trip?.players ?? []).map(p => p.name);

  // Check if a hole has all 4 scores entered
  const holeComplete = (h: number) => PLAYERS.every((_, p) => getScore(round, p, h) !== null);

  // Check if GIR has been set for a hole
  const girSet = (h: number) => {
    const extra = getHoleExtra(round, h);
    return extra?.closest_gir_player !== null && extra?.closest_gir_player !== undefined;
  };

  // Find first incomplete GIR hole before the given hole
  const findMissingGir = (beforeHole: number): number | null => {
    for (let h = 0; h < beforeHole; h++) {
      if (holeComplete(h) && !girSet(h)) return h;
    }
    return null;
  };

  const advanceToNext = (player: number, hole: number) => {
    const nextPlayer = player + 1;
    if (nextPlayer < 4) {
      setTimeout(() => setActiveInput({ player: nextPlayer, hole }), 50);
    } else {
      // All 4 scores entered for this hole - check for missing GIR on prior holes
      const missingGir = findMissingGir(hole + 1);
      if (missingGir !== null) {
        setActiveInput(null);
        setGirPromptHole(missingGir);
        return;
      }
      const lastHole = nine === 'front' ? 8 : 17;
      if (hole < lastHole) {
        setTimeout(() => setActiveInput({ player: 0, hole: hole + 1 }), 50);
      } else {
        setActiveInput(null);
      }
    }
  };

  const handleScoreInput = (player: number, hole: number, value: string) => {
    if (value === '') {
      setScore(round, player, hole, null);
      setActiveInput(null);
    } else {
      const num = parseInt(value);
      if (!isNaN(num) && num >= 1 && num <= 9) {
        setScore(round, player, hole, num);
        advanceToNext(player, hole);
      }
    }
  };

  const handleKeyInput = (player: number, hole: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length === 1) {
      const num = parseInt(val);
      if (!isNaN(num) && num >= 1 && num <= 9) {
        setScore(round, player, hole, num);
        advanceToNext(player, hole);
      }
    }
  };

  const calcNineTotal = (scores: (number | null)[], start: number) =>
    scores.slice(start, start + 9).reduce<number>((sum, s) => sum + (s ?? 0), 0);

  const calcNineCount = (scores: (number | null)[], start: number) =>
    scores.slice(start, start + 9).filter(s => s !== null).length;

  return (
    <div className="w-full">
      {/* GIR missing prompt */}
      {girPromptHole !== null && (
        <div className="bg-orange-900/30 border border-orange-500/30 rounded-xl p-3 mb-3 mx-1">
          <p className="text-orange-400 text-xs font-medium">Hole {girPromptHole + 1}: Who was closest to the pin in regulation?</p>
          <div className="flex gap-1 mt-2">
            {PLAYERS.map((name, p) => (
              <button
                key={p}
                onClick={() => {
                  setHoleExtra(round, girPromptHole!, { closest_gir_player: p });
                  setGirPromptHole(null);
                }}
                className="flex-1 py-1.5 rounded bg-green-card border border-gold/20 text-cream text-xs active:scale-95"
              >
                {players[p]?.[0] ?? name[0]}
              </button>
            ))}
            <button
              onClick={() => setGirPromptHole(null)}
              className="px-3 py-1.5 rounded bg-green-card border border-gold/20 text-cream-dim text-xs active:scale-95"
            >
              None
            </button>
          </div>
        </div>
      )}

      {/* Nine toggle */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex bg-green-card rounded-lg overflow-hidden border border-gold/20">
          <button
            onClick={() => setNine('front')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${nine === 'front' ? 'bg-gold text-green-deeper' : 'text-cream-dim'}`}
          >
            Front 9
          </button>
          <button
            onClick={() => setNine('back')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${nine === 'back' ? 'bg-gold text-green-deeper' : 'text-cream-dim'}`}
          >
            Back 9
          </button>
        </div>
      </div>

      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-center text-sm border-collapse min-w-[360px]">
          <thead>
            <tr className="border-b border-gold/20">
              <th className="py-2 px-1 text-left text-cream-dim text-xs w-16">Hole</th>
              {holes.map(h => (
                <th key={h} className="py-2 px-0.5 text-cream-dim text-xs w-8">
                  <div className="flex flex-col items-center">
                    <span>{h + 1}</span>
                    {isPar3(h) && <span className="text-[8px] text-gold leading-none">CTP</span>}
                  </div>
                </th>
              ))}
              <th className="py-2 px-1 text-cream-dim text-xs w-10">Tot</th>
            </tr>
          </thead>
          <tbody>
            {/* Par row */}
            <tr className="border-b border-gold/10">
              <td className="py-1.5 px-1 text-left text-cream-dim text-xs">Par</td>
              {holes.map(h => (
                <td key={h} className="py-1.5 px-0.5 text-cream-dim text-xs">{getPar(round, h)}</td>
              ))}
              <td className="py-1.5 px-1 text-cream-dim text-xs font-medium">{parNineTotal}</td>
            </tr>

            {/* Player rows */}
            {PLAYERS.map((name, p) => {
              const grossScores = getPlayerRoundScores(round, p);
              const netScores = getPlayerNetScores(round, p);
              const strokeHolesArr = getStrokeHoles(p, round);
              const grossTotal = calcNineTotal(grossScores, startHole);
              const grossCount = calcNineCount(grossScores, startHole);
              const netTotal = calcNineTotal(netScores, startHole);

              return (
                <tr key={p} className="border-b border-gold/10">
                  <td className="py-1.5 px-1 text-left text-xs font-medium text-cream">{players[p] ?? name}</td>
                  {holes.map(h => {
                    const gross = getScore(round, p, h);
                    const net = netScores[h];
                    const par = getPar(round, h);
                    const getsStroke = strokeHolesArr[h];
                    const isActive = activeInput?.player === p && activeInput?.hole === h;

                    return (
                      <td key={h} className={`py-1 px-0.5 ${getScoreBg(net, par)}`}>
                        <div className="relative inline-block">
                          {isActive ? (
                            <input
                              type="number"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              defaultValue={gross ?? ''}
                              onChange={(e) => handleKeyInput(p, h, e)}
                              onBlur={(e) => {
                                if (e.target.value === '') handleScoreInput(p, h, '');
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleScoreInput(p, h, (e.target as HTMLInputElement).value);
                                if (e.key === 'Escape') setActiveInput(null);
                              }}
                              autoFocus
                              className="w-8 h-7 bg-gold/20 border border-gold rounded text-center text-cream text-sm outline-none"
                            />
                          ) : (
                            <button
                              onClick={() => setActiveInput({ player: p, hole: h })}
                              className={`w-8 h-7 rounded text-sm ${gross !== null ? getScoreColor(net ?? gross, par) : 'text-cream-dim/30'}`}
                            >
                              {gross ?? '-'}
                            </button>
                          )}
                          {getsStroke && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-gold rounded-full pointer-events-none" />}
                        </div>
                      </td>
                    );
                  })}
                  <td className="py-1.5 px-1 text-xs font-medium text-cream">
                    {grossCount > 0 ? (
                      <div>
                        <div>{grossTotal}</div>
                        {showNetRow && <div className="text-[10px] text-gold-light">{netTotal}</div>}
                      </div>
                    ) : '-'}
                  </td>
                </tr>
              );
            })}

            {/* Per-player points rows */}
            {playerHolePoints && (
              <tr className="border-t-2 border-gold/30">
                <td className="py-1.5 px-1 text-left text-xs font-medium text-gold">Pts</td>
                {holes.map(h => {
                  const pts = playerHolePoints[h];
                  if (!pts) return <td key={h} className="py-1.5 px-0.5 text-xs text-cream-dim/30">-</td>;
                  const lines = PLAYERS.map((_, p) => pts[p]).filter(v => v > 0);
                  return (
                    <td key={h} className="py-1 px-0.5 text-[9px] leading-tight">
                      {PLAYERS.map((name, p) => {
                        if (pts[p] === 0) return null;
                        return (
                          <div key={p} className="text-gold">
                            {(players[p] ?? name)[0]}{pts[p]}
                          </div>
                        );
                      })}
                      {lines.length === 0 && <span className="text-cream-dim/30">-</span>}
                    </td>
                  );
                })}
                <td className="py-1.5 px-1 text-[9px] font-bold text-gold">
                  {PLAYERS.map((name, p) => {
                    const total = holes.reduce((s, h) => s + (playerHolePoints[h]?.[p] ?? 0), 0);
                    if (total === 0) return null;
                    return <div key={p}>{(players[p] ?? name)[0]}{total}</div>;
                  })}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 px-1 text-[10px] text-cream-dim/60">
        <span className="text-orange-400">Eagle</span>
        <span className="text-yellow-400">Birdie</span>
        <span className="text-cream">Par</span>
        <span className="text-blue-400">Bogey</span>
        <span className="text-red-400">Dbl+</span>
        <span><span className="inline-block w-1.5 h-1.5 bg-gold rounded-full mr-0.5" />Stroke</span>
        <span><span className="text-gold">CTP</span> Par 3</span>
      </div>
    </div>
  );
}

