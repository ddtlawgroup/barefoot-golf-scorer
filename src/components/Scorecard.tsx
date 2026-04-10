'use client';

import { useState, useRef } from 'react';
import { useTripContext } from '@/lib/context';
import { PLAYERS, ROUNDS, getScoreColor, getScoreBg } from '@/lib/types';
import { bestBall, stablefordPoints } from '@/lib/games';

interface ScorecardProps {
  round: number;
}

export default function Scorecard({ round }: ScorecardProps) {
  const { getScore, setScore, getPar, setPar, trip, getPlayerRoundScores } = useTripContext();
  const [nine, setNine] = useState<'front' | 'back'>('front');
  const [editingPar, setEditingPar] = useState(false);
  const [activeInput, setActiveInput] = useState<{ player: number; hole: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const startHole = nine === 'front' ? 0 : 9;
  const holes = Array.from({ length: 9 }, (_, i) => startHole + i);
  const isTeamRound = round < 3;
  const teams = isTeamRound && trip?.round_teams ? trip.round_teams[round.toString()] : null;

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

  const handleParInput = (hole: number, value: string) => {
    const num = parseInt(value);
    if (!isNaN(num) && num >= 3 && num <= 5) {
      setPar(round, hole, num);
    }
  };

  // Calculate team best balls if team round
  const teamABestBall = teams
    ? bestBall(getPlayerRoundScores(round, teams[0][0]), getPlayerRoundScores(round, teams[0][1]))
    : null;
  const teamBBestBall = teams
    ? bestBall(getPlayerRoundScores(round, teams[1][0]), getPlayerRoundScores(round, teams[1][1]))
    : null;

  // Calculate totals for the visible 9
  const calcNineTotal = (scores: (number | null)[], start: number) =>
    scores.slice(start, start + 9).reduce<number>((sum, s) => sum + (s ?? 0), 0);

  const calcNineCount = (scores: (number | null)[], start: number) =>
    scores.slice(start, start + 9).filter(s => s !== null).length;

  const parNineTotal = holes.reduce((sum, h) => sum + getPar(round, h), 0);

  return (
    <div className="w-full">
      {/* Nine toggle + Edit Par */}
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
        <button
          onClick={() => setEditingPar(!editingPar)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${editingPar ? 'bg-gold/20 border-gold text-gold' : 'border-gold/20 text-cream-dim'}`}
        >
          Edit Par
        </button>
      </div>

      {/* Scorecard Table */}
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-center text-sm border-collapse min-w-[360px]">
          <thead>
            <tr className="border-b border-gold/20">
              <th className="py-2 px-1 text-left text-cream-dim text-xs w-16">Hole</th>
              {holes.map(h => (
                <th key={h} className="py-2 px-0.5 text-cream-dim text-xs w-8">{h + 1}</th>
              ))}
              <th className="py-2 px-1 text-cream-dim text-xs w-10">Tot</th>
            </tr>
          </thead>
          <tbody>
            {/* Par row */}
            <tr className="border-b border-gold/10">
              <td className="py-1.5 px-1 text-left text-cream-dim text-xs">Par</td>
              {holes.map(h => (
                <td key={h} className="py-1.5 px-0.5">
                  {editingPar ? (
                    <select
                      value={getPar(round, h)}
                      onChange={(e) => handleParInput(h, e.target.value)}
                      className="w-8 bg-green-card text-cream text-xs text-center rounded border border-gold/30 py-0.5"
                    >
                      <option value={3}>3</option>
                      <option value={4}>4</option>
                      <option value={5}>5</option>
                    </select>
                  ) : (
                    <span className="text-cream-dim text-xs">{getPar(round, h)}</span>
                  )}
                </td>
              ))}
              <td className="py-1.5 px-1 text-cream-dim text-xs font-medium">{parNineTotal}</td>
            </tr>

            {/* Player rows */}
            {PLAYERS.map((name, p) => {
              const playerScores = getPlayerRoundScores(round, p);
              const nineTotal = calcNineTotal(playerScores, startHole);
              const nineCount = calcNineCount(playerScores, startHole);
              const teamColor = teams
                ? teams[0].includes(p) ? 'border-l-yellow-400' : 'border-l-blue-400'
                : '';

              return (
                <tr key={p} className={`border-b border-gold/10 ${teamColor ? `border-l-2 ${teamColor}` : ''}`}>
                  <td className="py-1.5 px-1 text-left text-xs font-medium text-cream">{name}</td>
                  {holes.map(h => {
                    const score = getScore(round, p, h);
                    const par = getPar(round, h);
                    const isActive = activeInput?.player === p && activeInput?.hole === h;

                    return (
                      <td key={h} className={`py-1 px-0.5 ${getScoreBg(score, par)}`}>
                        {isActive ? (
                          <input
                            ref={inputRef}
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            defaultValue={score ?? ''}
                            onBlur={(e) => handleScoreInput(p, h, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleScoreInput(p, h, (e.target as HTMLInputElement).value);
                                // Move to next hole
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
                            className={`w-8 h-7 rounded text-sm ${score !== null ? getScoreColor(score, par) : 'text-cream-dim/30'}`}
                          >
                            {score ?? '-'}
                          </button>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-1.5 px-1 text-xs font-medium text-cream">
                    {nineCount > 0 ? nineTotal : '-'}
                  </td>
                </tr>
              );
            })}

            {/* Team best ball rows */}
            {teams && teamABestBall && teamBBestBall && (
              <>
                <tr className="border-b border-gold/10 border-l-2 border-l-yellow-400 bg-yellow-900/10">
                  <td className="py-1.5 px-1 text-left text-xs font-medium text-yellow-400">
                    {PLAYERS[teams[0][0]][0]}&{PLAYERS[teams[0][1]][0]}
                  </td>
                  {holes.map(h => {
                    const score = teamABestBall[h];
                    const par = getPar(round, h);
                    return (
                      <td key={h} className={`py-1 px-0.5 text-xs ${score !== null ? getScoreColor(score, par) : 'text-cream-dim/30'}`}>
                        {score ?? '-'}
                      </td>
                    );
                  })}
                  <td className="py-1.5 px-1 text-xs font-medium text-yellow-400">
                    {calcNineCount(teamABestBall, startHole) > 0 ? calcNineTotal(teamABestBall, startHole) : '-'}
                  </td>
                </tr>
                <tr className="border-b border-gold/10 border-l-2 border-l-blue-400 bg-blue-900/10">
                  <td className="py-1.5 px-1 text-left text-xs font-medium text-blue-400">
                    {PLAYERS[teams[1][0]][0]}&{PLAYERS[teams[1][1]][0]}
                  </td>
                  {holes.map(h => {
                    const score = teamBBestBall[h];
                    const par = getPar(round, h);
                    return (
                      <td key={h} className={`py-1 px-0.5 text-xs ${score !== null ? getScoreColor(score, par) : 'text-cream-dim/30'}`}>
                        {score ?? '-'}
                      </td>
                    );
                  })}
                  <td className="py-1.5 px-1 text-xs font-medium text-blue-400">
                    {calcNineCount(teamBBestBall, startHole) > 0 ? calcNineTotal(teamBBestBall, startHole) : '-'}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
