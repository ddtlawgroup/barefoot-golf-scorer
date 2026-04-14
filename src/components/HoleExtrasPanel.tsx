'use client';

import { useState } from 'react';
import { useTripContext } from '@/lib/context';
import { PLAYERS, getPar3Holes } from '@/lib/types';

interface Props {
  round: number;
  showGir?: boolean;
  showCtp?: boolean;
}

export default function HoleExtrasPanel({ round, showGir = false, showCtp = true }: Props) {
  const { trip, getPar, getHoleExtra, setHoleExtra, getScore } = useTripContext();
  const [expandedHole, setExpandedHole] = useState<number | null>(null);

  const players = (trip?.players ?? []).map(p => p.name);
  const pars = Array.from({ length: 18 }, (_, h) => getPar(round, h));
  const par3s = getPar3Holes(pars);

  // Check if all 4 scores are entered for a hole
  const holeComplete = (h: number) => PLAYERS.every((_, p) => getScore(round, p, h) !== null);

  // GIR is "set" if closest_gir_player is defined (even if -1 meaning "none")
  // We use -1 to mean "nobody hit GIR" vs null meaning "not answered yet"
  const girAnswered = (h: number) => {
    const extra = getHoleExtra(round, h);
    if (!extra) return false;
    return extra.closest_gir_player !== null && extra.closest_gir_player !== undefined;
  };

  const girPlayer = (h: number) => getHoleExtra(round, h)?.closest_gir_player;

  return (
    <div className="space-y-3">
      {/* GIR per hole (required for Scotch/Wolf) */}
      {showGir && (
        <div className="bg-green-card rounded-xl border border-gold/20 p-3">
          <h3 className="text-xs text-gold font-medium mb-2 uppercase tracking-wider">Closest to Pin in Regulation</h3>
          <p className="text-cream-dim/60 text-[10px] mb-2">Required per hole. Tap to set winner or "None".</p>
          <div className="grid grid-cols-9 gap-1">
            {Array.from({ length: 18 }, (_, h) => {
              const answered = girAnswered(h);
              const complete = holeComplete(h);
              const gir = girPlayer(h);
              const isExpanded = expandedHole === h;
              const needsAttention = complete && !answered;

              return (
                <button
                  key={h}
                  onClick={() => setExpandedHole(isExpanded ? null : h)}
                  className={`py-1.5 rounded text-[10px] border transition-colors ${
                    isExpanded ? 'ring-1 ring-gold border-gold/40' :
                    answered ? 'border-green-500/40 bg-green-900/20' :
                    needsAttention ? 'border-orange-500/40 bg-orange-900/20 animate-pulse' :
                    'border-gold/10 bg-green-deeper/50'
                  }`}
                >
                  <div className={answered ? 'text-green-400 line-through decoration-green-500/50' : needsAttention ? 'text-orange-400' : 'text-cream-dim/40'}>{h + 1}</div>
                  {answered && gir !== null && gir !== undefined && gir >= 0 && (
                    <div className="text-[8px] text-green-400">{players[gir]?.[0] ?? ''}</div>
                  )}
                  {answered && (gir === null || gir === undefined || gir < 0) && (
                    <div className="text-[8px] text-cream-dim/40">-</div>
                  )}
                  {needsAttention && <div className="text-[8px] text-orange-400">?</div>}
                </button>
              );
            })}
          </div>
          {expandedHole !== null && (
            <div className="mt-2 bg-green-deeper/50 rounded-lg p-2">
              <p className="text-cream-dim text-xs mb-1.5">Hole {expandedHole + 1} - Who was closest to pin in regulation?</p>
              <div className="flex gap-1">
                {PLAYERS.map((name, p) => (
                  <button
                    key={p}
                    onClick={() => { setHoleExtra(round, expandedHole, { closest_gir_player: p }); setExpandedHole(null); }}
                    className={`flex-1 py-1.5 rounded text-xs active:scale-95 ${
                      girPlayer(expandedHole) === p ? 'bg-gold text-green-deeper font-bold' : 'bg-green-card border border-gold/20 text-cream'
                    }`}
                  >
                    {players[p]?.[0] ?? name[0]}
                  </button>
                ))}
                <button
                  onClick={() => { setHoleExtra(round, expandedHole, { closest_gir_player: -1 as any }); setExpandedHole(null); }}
                  className={`px-3 py-1.5 rounded text-xs active:scale-95 ${
                    girPlayer(expandedHole) !== null && girPlayer(expandedHole) !== undefined && girPlayer(expandedHole)! < 0
                      ? 'bg-cream-dim/30 text-cream font-bold'
                      : 'bg-green-card border border-gold/20 text-cream-dim'
                  }`}
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
          <h3 className="text-xs text-gold font-medium mb-2 uppercase tracking-wider">Closest to Pin (Par 3s) - $5/hole</h3>
          <div className="space-y-2">
            {par3s.map(h => {
              const extra = getHoleExtra(round, h);
              const winner = extra?.ctp_winner;
              const complete = holeComplete(h);
              const answered = winner !== null && winner !== undefined;
              const needsAttention = complete && !answered;

              return (
                <div key={h} className={`flex items-center gap-2 ${answered ? 'opacity-60' : ''}`}>
                  <span className={`text-xs w-12 ${answered ? 'text-green-400 line-through' : needsAttention ? 'text-orange-400' : 'text-cream-dim'}`}>
                    Hole {h + 1}{needsAttention ? ' ?' : ''}
                  </span>
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
                      onClick={() => setHoleExtra(round, h, { ctp_winner: -1 as any })}
                      className={`px-2 py-1.5 rounded text-xs transition-colors active:scale-95 ${
                        winner !== null && winner !== undefined && winner < 0
                          ? 'bg-cream-dim/30 text-cream font-bold'
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
