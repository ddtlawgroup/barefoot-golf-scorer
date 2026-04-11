'use client';

import { useState } from 'react';
import { useTripContext } from '@/lib/context';
import { PLAYERS, getPar3Holes, DEFAULT_PARS } from '@/lib/types';

interface Props {
  round: number;
  showGir?: boolean;
  showCtp?: boolean;
}

export default function HoleExtrasPanel({ round, showGir = false, showCtp = true }: Props) {
  const { trip, getPar, getHoleExtra, setHoleExtra } = useTripContext();
  const [expandedHole, setExpandedHole] = useState<number | null>(null);

  const players = (trip?.players ?? []).map(p => p.name);
  const pars = Array.from({ length: 18 }, (_, h) => getPar(round, h));
  const par3s = getPar3Holes(pars);

  return (
    <div className="space-y-3">
      {/* Closest GIR (all holes, for Scotch/Wolf) */}
      {showGir && (
        <div className="bg-green-card rounded-xl border border-gold/20 p-3">
          <h3 className="text-xs text-gold font-medium mb-2 uppercase tracking-wider">Closest to Pin in Regulation</h3>
          <p className="text-cream-dim/60 text-[10px] mb-2">Tap a hole to set the closest GIR player (1 team point).</p>
          <div className="grid grid-cols-9 gap-1">
            {Array.from({ length: 18 }, (_, h) => {
              const extra = getHoleExtra(round, h);
              const girPlayer = extra?.closest_gir_player;
              return (
                <button
                  key={h}
                  onClick={() => setExpandedHole(expandedHole === h ? null : h)}
                  className={`py-1.5 rounded text-[10px] border transition-colors ${
                    girPlayer !== null && girPlayer !== undefined
                      ? 'bg-gold/20 border-gold/40 text-gold'
                      : 'bg-green-deeper/50 border-gold/10 text-cream-dim/40'
                  } ${expandedHole === h ? 'ring-1 ring-gold' : ''}`}
                >
                  <div>{h + 1}</div>
                  {girPlayer !== null && girPlayer !== undefined && (
                    <div className="text-[8px]">{players[girPlayer]?.[0] ?? ''}</div>
                  )}
                </button>
              );
            })}
          </div>
          {expandedHole !== null && (
            <div className="mt-2 flex gap-2 items-center bg-green-deeper/50 rounded-lg p-2">
              <span className="text-cream-dim text-xs">Hole {expandedHole + 1} GIR:</span>
              <div className="flex gap-1 flex-1">
                {PLAYERS.map((name, p) => (
                  <button
                    key={p}
                    onClick={() => { setHoleExtra(round, expandedHole, { closest_gir_player: p }); setExpandedHole(null); }}
                    className="flex-1 py-1.5 rounded bg-green-card border border-gold/20 text-cream text-xs active:scale-95"
                  >
                    {players[p]?.[0] ?? name[0]}
                  </button>
                ))}
                <button
                  onClick={() => { setHoleExtra(round, expandedHole, { closest_gir_player: null as any }); setExpandedHole(null); }}
                  className="py-1.5 px-2 rounded bg-green-card border border-gold/20 text-cream-dim text-xs active:scale-95"
                >
                  None
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CTP on Par 3s */}
      {showCtp && par3s.length > 0 && (
        <div className="bg-green-card rounded-xl border border-gold/20 p-3">
          <h3 className="text-xs text-gold font-medium mb-2 uppercase tracking-wider">Closest to Pin (Par 3s)</h3>
          <div className="space-y-2">
            {par3s.map(h => {
              const extra = getHoleExtra(round, h);
              const winner = extra?.ctp_winner;
              return (
                <div key={h} className="flex items-center gap-2">
                  <span className="text-cream-dim text-xs w-12">Hole {h + 1}:</span>
                  <div className="flex gap-1 flex-1">
                    {PLAYERS.map((name, p) => (
                      <button
                        key={p}
                        onClick={() => setHoleExtra(round, h, { ctp_winner: p })}
                        className={`flex-1 py-1.5 rounded text-xs transition-colors active:scale-95 ${
                          winner === p
                            ? 'bg-gold text-green-deeper font-bold'
                            : 'bg-green-deeper/50 border border-gold/10 text-cream-dim'
                        }`}
                      >
                        {players[p]?.[0] ?? name[0]}
                      </button>
                    ))}
                    <button
                      onClick={() => setHoleExtra(round, h, { ctp_winner: null as any })}
                      className={`px-2 py-1.5 rounded text-xs transition-colors active:scale-95 ${
                        winner === null || winner === undefined
                          ? 'bg-cream-dim/20 text-cream-dim'
                          : 'bg-green-deeper/50 border border-gold/10 text-cream-dim/50'
                      }`}
                    >
                      -
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
