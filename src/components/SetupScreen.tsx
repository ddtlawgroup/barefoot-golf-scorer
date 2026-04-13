'use client';

import { useState } from 'react';
import { useTripContext } from '@/lib/context';
import { PLAYERS, ROUNDS, PlayerData } from '@/lib/types';

export default function SetupScreen() {
  const { trip, currentPlayer, startTrip, createTrip, updatePlayers } = useTripContext();
  const [handicaps, setHandicaps] = useState<Record<string, string>>({});

  if (!trip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold text-gold">No Active Trip</h1>
          <p className="text-cream-dim text-sm mt-2">Start a new trip to get scoring.</p>
        </div>
        <button
          onClick={() => currentPlayer && createTrip(currentPlayer)}
          className="w-full max-w-xs py-4 bg-gold text-green-deeper font-bold text-lg rounded-xl transition-all active:scale-95 hover:bg-gold-light"
        >
          Create New Trip
        </button>
      </div>
    );
  }

  const isCommissioner = currentPlayer === trip.commissioner;
  const players = trip.players as PlayerData[];

  const handleHandicapChange = (idx: number, value: string) => {
    setHandicaps(prev => ({ ...prev, [idx]: value }));
  };

  const saveHandicaps = async () => {
    const updated = players.map((p, i) => ({
      ...p,
      handicapIndex: parseFloat(handicaps[i] ?? '') || p.handicapIndex,
    }));
    await updatePlayers(updated);
  };

  const canStart = players.every(p => p.handicapIndex > 0);

  return (
    <div className="min-h-screen px-4 py-8 space-y-6">
      <div className="text-center mb-4">
        <h1 className="font-serif text-3xl font-bold text-gold">Trip Setup</h1>
        <p className="text-cream-dim text-sm mt-2">
          Commissioner: <span className="text-gold">{trip.commissioner}</span>
        </p>
      </div>

      {/* Courses & Formats */}
      <div className="bg-green-card rounded-xl border border-gold/20 p-4">
        <h3 className="font-serif text-lg text-gold mb-3">Schedule</h3>
        <div className="space-y-2">
          {ROUNDS.map((round, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-cream-dim">R{i + 1} ({round.tee}):</span>
              <span className="text-cream">{round.name.replace('Barefoot ', '')} <span className="text-gold-light">({round.format})</span></span>
            </div>
          ))}
        </div>
        <p className="text-cream-dim/60 text-[10px] mt-3">Teams, handicaps, and bet amounts are set in each round's settings.</p>
      </div>

      {/* Handicaps (base) */}
      <div className="bg-green-card rounded-xl border border-gold/20 p-4">
        <h3 className="font-serif text-lg text-gold mb-3">Default Handicap Index</h3>
        <p className="text-cream-dim text-xs mb-4">Set a base handicap here. You can override per round in each round's settings.</p>
        <div className="space-y-3">
          {players.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <span className="text-cream text-sm font-medium w-16">{p.name}</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="e.g. 14.2"
                value={handicaps[i] ?? (p.handicapIndex > 0 ? p.handicapIndex.toString() : '')}
                onChange={(e) => handleHandicapChange(i, e.target.value)}
                className="flex-1 max-w-[120px] bg-green-deeper border border-gold/30 rounded-lg px-3 py-2 text-cream text-sm text-right outline-none focus:border-gold"
              />
            </div>
          ))}
        </div>
        {isCommissioner && (
          <button
            onClick={saveHandicaps}
            className="mt-4 w-full py-2.5 bg-gold/20 hover:bg-gold/30 border border-gold/40 rounded-lg text-gold font-medium text-sm transition-all active:scale-95"
          >
            Save Handicaps
          </button>
        )}
      </div>

      {/* Start Trip */}
      {isCommissioner && (
        <button
          onClick={startTrip}
          disabled={!canStart}
          className={`w-full py-4 font-bold text-lg rounded-xl transition-all active:scale-95 ${canStart ? 'bg-gold text-green-deeper hover:bg-gold-light' : 'bg-gold/20 text-gold/40 cursor-not-allowed'}`}
        >
          Start Trip
        </button>
      )}

      {!canStart && isCommissioner && (
        <p className="text-cream-dim/60 text-xs text-center">Set all handicaps to start.</p>
      )}

      {!isCommissioner && (
        <div className="text-center text-cream-dim text-sm">
          Waiting for {trip.commissioner} to finish setup...
        </div>
      )}
    </div>
  );
}
