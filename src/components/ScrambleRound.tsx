'use client';

import { useState } from 'react';
import { useTripContext } from '@/lib/context';
import { PLAYERS, ROUNDS, DEFAULT_HOLE_HANDICAPS, scrambleHandicap, getPar3Holes } from '@/lib/types';
import { getScrambleTeams, scrambleNetScore, calcStableford, stablefordPoints } from '@/lib/games';
import HoleExtrasPanel from './HoleExtrasPanel';

export default function ScrambleRound() {
  const round = 3;
  const { trip, getPlayerNetScores, getPar, getPlayerCourseHcp, getScrambleScore, setScrambleScore, getHoleExtra } = useTripContext();
  const [nine, setNine] = useState<'front' | 'back'>('front');
  const [activeInput, setActiveInput] = useState<{ team: number; hole: number } | null>(null);

  const players = (trip?.players ?? []).map(p => p.name);
  const pars = Array.from({ length: 18 }, (_, h) => getPar(round, h));
  const holeHcps = trip?.hole_handicaps?.[round] ?? DEFAULT_HOLE_HANDICAPS[round];

  // Calculate Stableford standings from first 3 rounds to determine teams
  const stablefordTotals = PLAYERS.map((_, p) => {
    let total = 0;
    for (let r = 0; r < 3; r++) {
      const netScores = getPlayerNetScores(r, p);
      const rPars = Array.from({ length: 18 }, (_, h) => getPar(r, h));
      total += calcStableford(netScores, rPars);
    }
    return total;
  });

  const teams = getScrambleTeams(stablefordTotals);
  const allZero = stablefordTotals.every(s => s === 0);

  // Scramble handicaps per team
  const teamHcps = teams.map(team => {
    const hcp1 = getPlayerCourseHcp(team[0], round);
    const hcp2 = getPlayerCourseHcp(team[1], round);
    return scrambleHandicap(hcp1, hcp2);
  });

  const startHole = nine === 'front' ? 0 : 9;
  const holes = Array.from({ length: 9 }, (_, i) => startHole + i);
  const parNineTotal = holes.reduce((s, h) => s + getPar(round, h), 0);

  const handleInput = (team: number, hole: number, value: string) => {
    if (value === '') {
      setScrambleScore(hole, team, null);
    } else {
      const num = parseInt(value);
      if (!isNaN(num) && num >= 1 && num <= 15) {
        setScrambleScore(hole, team, num);
      }
    }
    setActiveInput(null);
  };

  const teamName = (teamIdx: number) => teams[teamIdx].map(i => players[i] ?? PLAYERS[i]).join(' & ');

  // Team totals
  const teamTotals = teams.map((_, t) => {
    let gross = 0, net = 0, count = 0;
    for (let h = 0; h < 18; h++) {
      const g = getScrambleScore(h, t);
      if (g !== null) {
        gross += g;
        net += scrambleNetScore(g, teamHcps[t], h, holeHcps) ?? g;
        count++;
      }
    }
    return { gross, net, count };
  });

  const isPar3 = (hole: number) => getPar(round, hole) === 3;

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="text-center">
        <h2 className="font-serif text-2xl text-gold font-bold">{ROUNDS[round].name}</h2>
        <p className="text-cream-dim text-sm">
          Round 4 {'\u00B7'} Par {ROUNDS[round].par} {'\u00B7'} 2-Man Scramble
        </p>
      </div>

      {/* Teams */}
      <div className="bg-green-card rounded-xl border border-gold/20 p-3">
        <h3 className="text-xs text-gold font-medium mb-2 uppercase tracking-wider">Scramble Teams</h3>
        {allZero ? (
          <p className="text-cream-dim/60 text-sm italic">Teams TBD (based on Stableford standings after R3)</p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-yellow-400 font-medium">{teamName(0)}</span>
              <span className="text-cream-dim text-xs">HCP: {teamHcps[0]}</span>
            </div>
            <div className="text-cream-dim text-xs text-center">vs</div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-400 font-medium">{teamName(1)}</span>
              <span className="text-cream-dim text-xs">HCP: {teamHcps[1]}</span>
            </div>
            <p className="text-cream-dim/60 text-[10px]">
              Based on Stableford: {stablefordTotals.map((s, i) => `${players[i]?.[0] ?? PLAYERS[i][0]}:${s}`).join(' ')}
            </p>
          </div>
        )}
      </div>

      {/* Score Totals */}
      <div className="bg-green-card rounded-xl border border-gold/20 p-3">
        <h3 className="text-xs text-gold font-medium mb-2 uppercase tracking-wider">Score</h3>
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map(t => (
            <div key={t} className={`rounded-lg p-3 text-center ${t === 0 ? 'bg-yellow-900/10 border border-yellow-400/20' : 'bg-blue-900/10 border border-blue-400/20'}`}>
              <div className={`text-xs mb-1 ${t === 0 ? 'text-yellow-400' : 'text-blue-400'}`}>{teamName(t)}</div>
              <div className="text-2xl font-bold text-cream">
                {teamTotals[t].count > 0 ? teamTotals[t].net : '-'}
              </div>
              {teamTotals[t].count > 0 && (
                <div className="text-[10px] text-cream-dim">
                  Gross: {teamTotals[t].gross} | Net: {teamTotals[t].net}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Scramble Scorecard */}
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
            <tr className="border-b border-gold/10">
              <td className="py-1.5 px-1 text-left text-cream-dim text-xs">Par</td>
              {holes.map(h => (
                <td key={h} className="py-1.5 px-0.5 text-cream-dim text-xs">{getPar(round, h)}</td>
              ))}
              <td className="py-1.5 px-1 text-cream-dim text-xs font-medium">{parNineTotal}</td>
            </tr>
            {[0, 1].map(t => {
              const nineGross = holes.reduce<number>((s, h) => s + (getScrambleScore(h, t) ?? 0), 0);
              const nineNet = holes.reduce<number>((s, h) => {
                const g = getScrambleScore(h, t);
                return s + (scrambleNetScore(g, teamHcps[t], h, holeHcps) ?? 0);
              }, 0);
              const nineCount = holes.filter(h => getScrambleScore(h, t) !== null).length;
              const getsStroke = (hole: number) => holeHcps[hole] <= teamHcps[t];

              return (
                <tr key={t} className={`border-b border-gold/10 border-l-2 ${t === 0 ? 'border-l-yellow-400' : 'border-l-blue-400'}`}>
                  <td className={`py-1.5 px-1 text-left text-xs font-medium ${t === 0 ? 'text-yellow-400' : 'text-blue-400'}`}>
                    {teams[t].map(i => (players[i] ?? PLAYERS[i])[0]).join('&')}
                  </td>
                  {holes.map(h => {
                    const gross = getScrambleScore(h, t);
                    const net = scrambleNetScore(gross, teamHcps[t], h, holeHcps);
                    const par = getPar(round, h);
                    const stroke = getsStroke(h);
                    const isActive = activeInput?.team === t && activeInput?.hole === h;

                    return (
                      <td key={h} className="py-1 px-0.5">
                        {isActive ? (
                          <input
                            type="number"
                            inputMode="numeric"
                            defaultValue={gross ?? ''}
                            onBlur={(e) => handleInput(t, h, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleInput(t, h, (e.target as HTMLInputElement).value);
                                if (h < (nine === 'front' ? 8 : 17)) {
                                  setTimeout(() => setActiveInput({ team: t, hole: h + 1 }), 50);
                                }
                              }
                            }}
                            autoFocus
                            className="w-8 h-7 bg-gold/20 border border-gold rounded text-center text-cream text-sm outline-none"
                          />
                        ) : (
                          <button
                            onClick={() => setActiveInput({ team: t, hole: h })}
                            className={`w-8 h-7 rounded text-sm relative ${gross !== null ? 'text-cream' : 'text-cream-dim/30'}`}
                          >
                            {gross ?? '-'}
                            {stroke && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-gold rounded-full" />}
                          </button>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-1.5 px-1 text-xs font-medium text-cream">
                    {nineCount > 0 ? (
                      <div>
                        <div>{nineGross}</div>
                        <div className="text-[10px] text-gold-light">{nineNet}</div>
                      </div>
                    ) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* CTP */}
      <HoleExtrasPanel round={round} showCtp />
    </div>
  );
}
