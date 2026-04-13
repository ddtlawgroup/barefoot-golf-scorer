'use client';

import { useState } from 'react';
import { useTripContext } from '@/lib/context';
import { PLAYERS, ROUNDS, PlayerData } from '@/lib/types';

export default function RoundHandicapEditor({ round }: { round: number }) {
  const { trip, updatePlayers, getPlayerCourseHcp } = useTripContext();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<number, string>>({});

  const players = (trip?.players ?? []) as PlayerData[];
  const slope = ROUNDS[round].slope;

  const getHcpIndex = (p: PlayerData) => p.roundHandicaps?.[round] ?? p.handicapIndex;

  const save = async () => {
    const updated = players.map((p, i) => {
      const newVal = parseFloat(values[i] ?? '');
      const roundHcps = [...(p.roundHandicaps ?? [0, 0, 0, 0])];
      if (!isNaN(newVal) && newVal > 0) {
        roundHcps[round] = newVal;
      }
      return { ...p, roundHandicaps: roundHcps };
    });
    await updatePlayers(updated);
    setEditing(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-cream-dim text-[10px]">Handicaps ({ROUNDS[round].name.replace('Barefoot ', '')}, Slope {slope})</span>
        <button
          onClick={() => { setEditing(!editing); setValues({}); }}
          className="text-[10px] px-2 py-1 rounded bg-gold/10 border border-gold/20 text-gold active:scale-95"
        >
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>
      {!editing ? (
        <div className="flex gap-3 text-xs">
          {players.map((p, i) => (
            <span key={i} className="text-cream">
              {p.name[0]}: <span className="text-gold">{getHcpIndex(p)}</span>
              <span className="text-cream-dim/40 ml-0.5">({getPlayerCourseHcp(i, round)})</span>
            </span>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {players.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-cream text-xs w-14">{p.name}</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder={getHcpIndex(p).toString()}
                value={values[i] ?? ''}
                onChange={(e) => setValues(prev => ({ ...prev, [i]: e.target.value }))}
                className="flex-1 max-w-[80px] bg-green-deeper border border-gold/30 rounded px-2 py-1.5 text-cream text-xs text-right outline-none focus:border-gold"
              />
              <span className="text-cream-dim/40 text-[10px]">
                = {Math.round((parseFloat(values[i] ?? '') || getHcpIndex(p)) * slope / 113)} strokes
              </span>
            </div>
          ))}
          <button
            onClick={save}
            className="w-full py-2 bg-gold text-green-deeper font-bold rounded-lg text-xs active:scale-95"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}
