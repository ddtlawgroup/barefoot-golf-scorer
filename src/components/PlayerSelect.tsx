'use client';

import { PLAYERS } from '@/lib/types';
import { useTripContext } from '@/lib/context';

export default function PlayerSelect() {
  const { setCurrentPlayer, createTrip, trip, loading } = useTripContext();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gold text-xl font-serif">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="text-center mb-10">
        <h1 className="font-serif text-4xl font-bold text-gold mb-2">Barefoot Resort</h1>
        <h2 className="font-serif text-2xl text-gold-light">Golf Trip Scorer</h2>
        <p className="text-cream-dim mt-3 text-sm">72 holes. 4 rounds. 1 champion.</p>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <p className="text-center text-cream-dim text-sm mb-4">Who are you?</p>
        {PLAYERS.map((name) => (
          <button
            key={name}
            onClick={async () => {
              setCurrentPlayer(name);
              if (!trip) {
                await createTrip(name);
              }
            }}
            className="w-full py-4 px-6 bg-green-card hover:bg-green-card-hover border border-gold/30 rounded-xl text-cream text-lg font-medium transition-all active:scale-95"
          >
            {name}
          </button>
        ))}
      </div>

      <p className="text-cream-dim/50 text-xs mt-8">First player in creates the trip as Commissioner</p>
    </div>
  );
}
