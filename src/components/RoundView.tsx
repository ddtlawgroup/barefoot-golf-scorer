'use client';

import { useTripContext } from '@/lib/context';
import { PLAYERS, ROUNDS } from '@/lib/types';
import { bestBall, calcNassau, calcSkins, calcStableford, stablefordPoints } from '@/lib/games';
import Scorecard from './Scorecard';
import { NassauInfo, SkinsInfo, StablefordInfo, BestBallInfo } from './InfoModal';

interface RoundViewProps {
  round: number;
}

export default function RoundView({ round }: RoundViewProps) {
  const { trip, getPlayerRoundScores, getPar } = useTripContext();

  const isTeamRound = round < 3;
  const isSkins = round === 3;
  const teams = isTeamRound && trip?.round_teams ? trip.round_teams[round.toString()] : null;
  const pars = Array.from({ length: 18 }, (_, h) => getPar(round, h));

  // Get all player scores for this round
  const allScores = PLAYERS.map((_, p) => getPlayerRoundScores(round, p));

  // Nassau for team rounds
  let nassau = null;
  if (teams) {
    const teamABB = bestBall(allScores[teams[0][0]], allScores[teams[0][1]]);
    const teamBBB = bestBall(allScores[teams[1][0]], allScores[teams[1][1]]);
    nassau = calcNassau(teamABB, teamBBB);
  }

  // Skins for round 4
  const skins = isSkins ? calcSkins(allScores) : null;

  // Stableford for this round
  const stablefordScores = PLAYERS.map((_, p) => calcStableford(allScores[p], pars));

  const teamNames = (indices: number[]) => indices.map(i => PLAYERS[i]).join(' & ');

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Round Header */}
      <div className="text-center">
        <h2 className="font-serif text-2xl text-gold font-bold">{ROUNDS[round].name}</h2>
        <p className="text-cream-dim text-sm">
          Round {round + 1} {'\u00B7'} Par {ROUNDS[round].par}
          {isTeamRound ? <>{' \u00B7 Best Ball'}<BestBallInfo /></> : <>{' \u00B7 Individual Skins'}<SkinsInfo /></>}
        </p>
      </div>

      {/* Nassau Status (team rounds) */}
      {nassau && teams && (
        <div className="bg-green-card rounded-xl border border-gold/20 p-3">
          <h3 className="text-xs text-gold font-medium mb-2 uppercase tracking-wider inline-flex items-center">Nassau<NassauInfo /></h3>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            {(['front', 'back', 'overall'] as const).map(seg => {
              const winner = nassau[seg];
              return (
                <div key={seg} className="bg-green-deeper/50 rounded-lg py-2 px-1">
                  <div className="text-cream-dim text-xs mb-1 capitalize">
                    {seg === 'overall' ? '18' : seg === 'front' ? 'Front' : 'Back'}
                  </div>
                  <div className={`font-medium ${winner === null ? 'text-cream-dim/50' : winner === 0 ? 'text-yellow-400' : 'text-blue-400'}`}>
                    {winner === null ? 'Tied' : teamNames(teams[winner])}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Skins Status (round 4) */}
      {skins && (
        <div className="bg-green-card rounded-xl border border-gold/20 p-3">
          <h3 className="text-xs text-gold font-medium mb-2 uppercase tracking-wider inline-flex items-center">Skins<SkinsInfo /></h3>
          <div className="grid grid-cols-4 gap-2 text-center">
            {PLAYERS.map((name, p) => (
              <div key={p} className="bg-green-deeper/50 rounded-lg py-2">
                <div className="text-cream-dim text-xs mb-1">{name}</div>
                <div className={`text-lg font-bold ${skins.skins[p] > 0 ? 'text-gold' : 'text-cream-dim/50'}`}>
                  {skins.skins[p]}
                </div>
              </div>
            ))}
          </div>
          {skins.carries > 0 && (
            <p className="text-cream-dim/60 text-xs text-center mt-2">{skins.carries} skin{skins.carries !== 1 ? 's' : ''} carrying</p>
          )}
        </div>
      )}

      {/* Stableford for this round */}
      <div className="bg-green-card rounded-xl border border-gold/20 p-3">
        <h3 className="text-xs text-gold font-medium mb-2 uppercase tracking-wider inline-flex items-center">Stableford Points<StablefordInfo /></h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          {PLAYERS.map((name, p) => (
            <div key={p} className="bg-green-deeper/50 rounded-lg py-2">
              <div className="text-cream-dim text-xs mb-1">{name}</div>
              <div className="text-lg font-bold text-cream">{stablefordScores[p]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scorecard */}
      <Scorecard round={round} />
    </div>
  );
}
