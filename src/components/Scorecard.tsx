'use client';

import { useState } from 'react';
import { useTripContext } from '@/lib/context';
import { PLAYERS, getScoreColor, getScoreBg } from '@/lib/types';

interface ScorecardProps {
  round: number;
  showNetRow?: boolean; // show net score row below gross
}

export default function Scorecard({ round, showNetRow = true }: ScorecardProps) {
  const { getScore, setScore, getPar, getStrokeHoles, getPlayerRoundScores, getPlayerNetScores, trip } = useTripContext();
  const [nine, setNine] = useState<'front' | 'back'>('front');
  const [activeInput, setActiveInput] = useState<{ player: number; hole: number } | null>(null);

  const startHole = nine === 'front' ? 0 : 9;
  const holes = Array.from({ length: 9 }, (_, i) => startHole + i);
  const pars = holes.map(h => getPar(round, h));
  const parNineTotal = pars.reduce((s, p) => s + p, 0);

  const isPar3 = (hole: number) => getPar(round, hole) === 3;

  const handleScoreInput = (player: number, hole: number, value: string) => {
    if (value === '') {
      setScore(round, player, hole, null);
    } else {
      const num = parseInt(value);
      if (!isNaN(num) && num >= 1 && num <= 15) {
        setScore(round, player, hole, num);
      }
    }
    setActiveInput(null);
  };

  const calcNineTotal = (scores: (number | null)[], start: number) =>
    scores.slice(start, start + 9).reduce<number>((sum, s) => sum + (s ?? 0), 0);

  const calcNineCount = (scores: (number | null)[], start: number) =>
    scores.slice(start, start + 9).filter(s => s !== null).length;

  const players = (trip?.players ?? []).map(p => p.name);

  return (
    <div className="w-full">
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
                        {isActive ? (
                          <input
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            defaultValue={gross ?? ''}
                            onBlur={(e) => handleScoreInput(p, h, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleScoreInput(p, h, (e.target as HTMLInputElement).value);
                                if (h < (nine === 'front' ? 8 : 17)) {
                                  setTimeout(() => setActiveInput({ player: p, hole: h + 1 }), 50);
                                }
                              }
                            }}
                            autoFocus
                            className="w-8 h-7 bg-gold/20 border border-gold rounded text-center text-cream text-sm outline-none"
                          />
                        ) : (
                          <button
                            onClick={() => setActiveInput({ player: p, hole: h })}
                            className={`w-8 h-7 rounded text-sm relative ${gross !== null ? getScoreColor(net ?? gross, par) : 'text-cream-dim/30'}`}
                          >
                            {gross ?? '-'}
                            {getsStroke && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-gold rounded-full" />}
                          </button>
                        )}
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
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4 mt-2 px-1 text-[10px] text-cream-dim/60">
        <span><span className="inline-block w-1.5 h-1.5 bg-gold rounded-full mr-1" />= gets stroke</span>
        <span className="text-gold">CTP</span><span>= closest to pin (par 3)</span>
      </div>
    </div>
  );
}
