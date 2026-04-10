'use client';

import { useTripContext } from '@/lib/context';
import { PLAYERS, ROUNDS } from '@/lib/types';
import { calcStableford, calcSkins, calcNassauPoints } from '@/lib/games';

export default function Summary() {
  const { trip, getPlayerRoundScores, getPar } = useTripContext();

  // Stableford per round per player
  const stablefordByRound = PLAYERS.map((_, p) =>
    [0, 1, 2, 3].map(r => {
      const scores = getPlayerRoundScores(r, p);
      const pars = Array.from({ length: 18 }, (_, h) => getPar(r, h));
      return calcStableford(scores, pars);
    })
  );

  const totalStableford = stablefordByRound.map(rounds => rounds.reduce((a, b) => a + b, 0));
  const maxStableford = Math.max(...totalStableford);

  // Total strokes per player
  const totalStrokes = PLAYERS.map((_, p) => {
    let total = 0;
    let count = 0;
    for (let r = 0; r < 4; r++) {
      const scores = getPlayerRoundScores(r, p);
      scores.forEach(s => {
        if (s !== null) {
          total += s;
          count++;
        }
      });
    }
    return { total, count };
  });

  // Total par for all played holes (per player)
  const totalPar = PLAYERS.map((_, p) => {
    let par = 0;
    for (let r = 0; r < 4; r++) {
      const scores = getPlayerRoundScores(r, p);
      scores.forEach((s, h) => {
        if (s !== null) {
          par += getPar(r, h);
        }
      });
    }
    return par;
  });

  // Nassau points
  const nassauPoints = PLAYERS.map((_, p) => {
    if (!trip?.round_teams) return 0;
    const allScores = [0, 1, 2, 3].map(r =>
      PLAYERS.map((_, pl) => getPlayerRoundScores(r, pl))
    );
    return calcNassauPoints(allScores, trip.round_teams, p);
  });

  // Skins (Round 4)
  const r4Scores = PLAYERS.map((_, p) => getPlayerRoundScores(3, p));
  const skins = calcSkins(r4Scores);

  // Stableford round winners
  const roundWinners = [0, 1, 2, 3].map(r => {
    const roundScores = stablefordByRound.map(p => p[r]);
    const max = Math.max(...roundScores);
    if (max === 0) return null;
    const winners = roundScores.filter(s => s === max);
    if (winners.length > 1) return null; // tie
    return roundScores.indexOf(max);
  });

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
          <span className="text-3xl">👑</span>
          <span className="font-serif text-3xl font-bold text-gold">
            {totalStableford.every(s => s === 0)
              ? 'TBD'
              : PLAYERS[totalStableford.indexOf(maxStableford)]}
          </span>
        </div>
        {maxStableford > 0 && (
          <p className="text-cream-dim text-sm mt-1">{maxStableford} Stableford points</p>
        )}
      </div>

      {/* Stableford Breakdown */}
      <div className="bg-green-card rounded-xl border border-gold/20 p-4">
        <h3 className="text-xs text-gold font-medium mb-3 uppercase tracking-wider">Stableford Points</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-center">
            <thead>
              <tr className="border-b border-gold/20">
                <th className="py-2 text-left text-cream-dim text-xs">Player</th>
                {[1, 2, 3, 4].map(r => (
                  <th key={r} className="py-2 text-cream-dim text-xs">R{r}</th>
                ))}
                <th className="py-2 text-gold text-xs">Total</th>
              </tr>
            </thead>
            <tbody>
              {PLAYERS.map((name, p) => (
                <tr key={p} className="border-b border-gold/10">
                  <td className="py-2 text-left text-cream font-medium text-xs">{name}</td>
                  {[0, 1, 2, 3].map(r => (
                    <td
                      key={r}
                      className={`py-2 text-xs ${roundWinners[r] === p ? 'text-gold font-bold' : 'text-cream'}`}
                    >
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

      {/* Total Strokes */}
      <div className="bg-green-card rounded-xl border border-gold/20 p-4">
        <h3 className="text-xs text-gold font-medium mb-3 uppercase tracking-wider">Total Strokes</h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          {PLAYERS.map((name, p) => {
            const diff = totalStrokes[p].total - totalPar[p];
            return (
              <div key={p} className="bg-green-deeper/50 rounded-lg py-3">
                <div className="text-cream-dim text-xs mb-1">{name}</div>
                <div className="text-xl font-bold text-cream">
                  {totalStrokes[p].count > 0 ? totalStrokes[p].total : '-'}
                </div>
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

      {/* Nassau Points */}
      <div className="bg-green-card rounded-xl border border-gold/20 p-4">
        <h3 className="text-xs text-gold font-medium mb-3 uppercase tracking-wider">Nassau Points (R1-R3)</h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          {PLAYERS.map((name, p) => (
            <div key={p} className="bg-green-deeper/50 rounded-lg py-3">
              <div className="text-cream-dim text-xs mb-1">{name}</div>
              <div className={`text-xl font-bold ${nassauPoints[p] > 0 ? 'text-gold' : 'text-cream-dim/50'}`}>
                {nassauPoints[p]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Skins */}
      <div className="bg-green-card rounded-xl border border-gold/20 p-4">
        <h3 className="text-xs text-gold font-medium mb-3 uppercase tracking-wider">Skins (R4: Dye)</h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          {PLAYERS.map((name, p) => (
            <div key={p} className="bg-green-deeper/50 rounded-lg py-3">
              <div className="text-cream-dim text-xs mb-1">{name}</div>
              <div className={`text-xl font-bold ${skins.skins[p] > 0 ? 'text-gold' : 'text-cream-dim/50'}`}>
                {skins.skins[p]}
              </div>
            </div>
          ))}
        </div>
        {skins.carries > 0 && (
          <p className="text-cream-dim/60 text-xs text-center mt-2">{skins.carries} unclaimed</p>
        )}
      </div>
    </div>
  );
}
