'use client';

import { useState } from 'react';
import { useTripContext } from '@/lib/context';
import { PLAYERS, ROUNDS, PlayerData } from '@/lib/types';

export default function SetupScreen() {
  const { trip, currentPlayer, drawScotchTeams, setWolfTeeOrder, startTrip, createTrip, updatePlayers } = useTripContext();
  const [handicaps, setHandicaps] = useState<Record<string, string>>({});
  const [wolfOrder, setWolfOrder] = useState<number[]>([0, 1, 2, 3]);

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
  const hasScotchTeams = !!trip.scotch_teams;
  const hasWolfOrder = !!trip.wolf_tee_order;

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

  const moveWolf = (from: number, to: number) => {
    const newOrder = [...wolfOrder];
    const [item] = newOrder.splice(from, 1);
    newOrder.splice(to, 0, item);
    setWolfOrder(newOrder);
  };

  const saveWolfOrder = async () => {
    await setWolfTeeOrder(wolfOrder);
  };

  const playerName = (idx: number) => players[idx]?.name ?? PLAYERS[idx];

  const canStart = hasScotchTeams && hasWolfOrder && players.every(p => p.handicapIndex > 0);

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
              <span className="text-cream-dim">R{i + 1}:</span>
              <span className="text-cream">{round.name.replace('Barefoot ', '')} <span className="text-gold-light">({round.format})</span></span>
            </div>
          ))}
        </div>
      </div>

      {/* Handicaps */}
      <div className="bg-green-card rounded-xl border border-gold/20 p-4">
        <h3 className="font-serif text-lg text-gold mb-3">Handicap Index</h3>
        <p className="text-cream-dim text-xs mb-4">Enter each player's GHIN handicap index. All games use net scores.</p>
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
        {players.some(p => p.handicapIndex > 0) && (
          <div className="mt-3 space-y-1">
            {ROUNDS.map((round, r) => (
              <div key={r} className="text-xs text-cream-dim flex justify-between">
                <span>{round.name.replace('Barefoot ', '')} (Slope {round.slope}):</span>
                <span>{players.map(p => {
                  const ch = Math.round(p.handicapIndex * (round.slope / 113));
                  return `${p.name[0]}:${ch}`;
                }).join('  ')}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6-6-6 Scotch Team Draw */}
      <div className="bg-green-card rounded-xl border border-gold/20 p-4">
        <h3 className="font-serif text-lg text-gold mb-3">6-6-6 Scotch Teams</h3>
        <p className="text-cream-dim text-xs mb-4">
          Teams rotate every 6 holes. All 3 pairings used. Same order for R1 (Fazio) and R3 (Norman).
        </p>

        {hasScotchTeams && trip.scotch_teams ? (
          <div className="space-y-2">
            {trip.scotch_teams.map((pairing, seg) => (
              <div key={seg} className="flex items-center justify-between text-sm border-b border-gold/10 pb-2 last:border-0 last:pb-0">
                <span className="text-cream-dim">Holes {seg * 6 + 1}-{(seg + 1) * 6}:</span>
                <div>
                  <span className="text-yellow-400">{pairing[0].map(i => playerName(i)).join(' & ')}</span>
                  <span className="text-cream-dim mx-2">vs</span>
                  <span className="text-blue-400">{pairing[1].map(i => playerName(i)).join(' & ')}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-cream-dim/60 text-sm italic">No teams drawn yet.</p>
        )}

        {isCommissioner && (
          <button
            onClick={drawScotchTeams}
            className="mt-4 w-full py-2.5 bg-gold/20 hover:bg-gold/30 border border-gold/40 rounded-lg text-gold font-medium text-sm transition-all active:scale-95"
          >
            {hasScotchTeams ? 'Re-Draw Teams' : 'Randomize Teams'}
          </button>
        )}
      </div>

      {/* Wolf Tee Order */}
      <div className="bg-green-card rounded-xl border border-gold/20 p-4">
        <h3 className="font-serif text-lg text-gold mb-3">Wolf Tee Order (R2)</h3>
        <p className="text-cream-dim text-xs mb-4">
          Set the fixed tee order for the Wolf round. Wolf rotates in this order every hole.
        </p>

        <div className="space-y-2">
          {wolfOrder.map((playerIdx, pos) => (
            <div key={pos} className="flex items-center gap-3">
              <span className="text-gold text-sm font-bold w-6">{pos + 1}.</span>
              <span className="text-cream text-sm flex-1">{playerName(playerIdx)}</span>
              {isCommissioner && (
                <div className="flex gap-1">
                  <button
                    onClick={() => pos > 0 && moveWolf(pos, pos - 1)}
                    disabled={pos === 0}
                    className="w-7 h-7 rounded bg-green-deeper border border-gold/20 text-cream-dim text-xs disabled:opacity-20"
                  >
                    {'\u25B2'}
                  </button>
                  <button
                    onClick={() => pos < 3 && moveWolf(pos, pos + 1)}
                    disabled={pos === 3}
                    className="w-7 h-7 rounded bg-green-deeper border border-gold/20 text-cream-dim text-xs disabled:opacity-20"
                  >
                    {'\u25BC'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {isCommissioner && (
          <button
            onClick={saveWolfOrder}
            className="mt-4 w-full py-2.5 bg-gold/20 hover:bg-gold/30 border border-gold/40 rounded-lg text-gold font-medium text-sm transition-all active:scale-95"
          >
            {hasWolfOrder ? 'Update Tee Order' : 'Save Tee Order'}
          </button>
        )}
        {hasWolfOrder && trip.wolf_tee_order && (
          <p className="text-green-400 text-xs mt-2 text-center">
            Saved: {trip.wolf_tee_order.map(i => playerName(i)).join(' \u2192 ')}
          </p>
        )}
      </div>

      {/* R4 Info */}
      <div className="bg-green-card rounded-xl border border-gold/20 p-4">
        <h3 className="font-serif text-lg text-gold mb-2">R4: 2-Man Scramble (Dye)</h3>
        <p className="text-cream-dim text-xs">
          Teams auto-assigned after R3 based on Stableford standings: 1st + 4th vs 2nd + 3rd.
        </p>
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
        <p className="text-cream-dim/60 text-xs text-center">
          {!players.every(p => p.handicapIndex > 0) && 'Set all handicaps. '}
          {!hasScotchTeams && 'Draw Scotch teams. '}
          {!hasWolfOrder && 'Save Wolf tee order.'}
        </p>
      )}

      {!isCommissioner && (
        <div className="text-center text-cream-dim text-sm">
          Waiting for {trip.commissioner} to finish setup...
        </div>
      )}
    </div>
  );
}
