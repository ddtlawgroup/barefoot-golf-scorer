'use client';

import { useTripContext } from '@/lib/context';
import { PLAYERS, ROUNDS } from '@/lib/types';

export default function SetupScreen() {
  const { trip, currentPlayer, drawTeams, startTrip } = useTripContext();

  if (!trip) return null;

  const isCommissioner = currentPlayer === trip.commissioner;
  const hasTeams = !!trip.round_teams;

  const teamNames = (playerIndices: number[]) =>
    playerIndices.map(i => PLAYERS[i]).join(' & ');

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="font-serif text-3xl font-bold text-gold">Trip Setup</h1>
        <p className="text-cream-dim text-sm mt-2">
          Commissioner: <span className="text-gold">{trip.commissioner}</span>
        </p>
      </div>

      {/* Courses */}
      <div className="bg-green-card rounded-xl border border-gold/20 p-4 mb-6">
        <h3 className="font-serif text-lg text-gold mb-3">Courses</h3>
        <div className="space-y-2">
          {ROUNDS.map((round, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-cream-dim">Round {i + 1}:</span>
              <span className="text-cream">{round.name} (Par {round.par})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Team Draw */}
      <div className="bg-green-card rounded-xl border border-gold/20 p-4 mb-6">
        <h3 className="font-serif text-lg text-gold mb-3">Team Pairings</h3>
        <p className="text-cream-dim text-xs mb-4">
          Rounds 1-3 are best ball (2v2). Each duo plays together once. Round 4 is individual skins.
        </p>

        {hasTeams ? (
          <div className="space-y-3">
            {[0, 1, 2].map(r => {
              const teams = trip.round_teams![r.toString()];
              return (
                <div key={r} className="flex items-center justify-between text-sm border-b border-gold/10 pb-2 last:border-0 last:pb-0">
                  <span className="text-cream-dim">R{r + 1}: {ROUNDS[r].name.replace('Barefoot ', '')}</span>
                  <div className="text-right">
                    <span className="text-yellow-400">{teamNames(teams[0])}</span>
                    <span className="text-cream-dim mx-2">vs</span>
                    <span className="text-blue-400">{teamNames(teams[1])}</span>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between text-sm pt-1">
              <span className="text-cream-dim">R4: Dye</span>
              <span className="text-cream">Individual Skins</span>
            </div>
          </div>
        ) : (
          <p className="text-cream-dim/60 text-sm italic">No teams drawn yet.</p>
        )}

        {isCommissioner && (
          <button
            onClick={drawTeams}
            className="mt-4 w-full py-3 bg-gold/20 hover:bg-gold/30 border border-gold/40 rounded-lg text-gold font-medium transition-all active:scale-95"
          >
            {hasTeams ? 'Re-Draw Teams' : 'Draw Teams'}
          </button>
        )}
      </div>

      {/* Start Trip */}
      {isCommissioner && hasTeams && (
        <button
          onClick={startTrip}
          className="w-full py-4 bg-gold text-green-deeper font-bold text-lg rounded-xl transition-all active:scale-95 hover:bg-gold-light"
        >
          Start Trip
        </button>
      )}

      {!isCommissioner && (
        <div className="text-center text-cream-dim text-sm mt-4">
          Waiting for {trip.commissioner} to set up the trip...
        </div>
      )}
    </div>
  );
}
