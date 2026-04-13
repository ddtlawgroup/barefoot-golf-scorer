'use client';

import { useState } from 'react';
import { useTripContext } from '@/lib/context';
import { PLAYERS, ROUNDS } from '@/lib/types';
import { calcWolfRound, getWolfForHole } from '@/lib/games';
import Scorecard from './Scorecard';
import HoleExtrasPanel from './HoleExtrasPanel';
import BetPicker from './BetPicker';
import PressPanel from './PressPanel';

export default function WolfRound() {
  const round = 1;
  const { trip, getPlayerNetScores, getPlayerRoundScores, getPar, getHoleExtra, setHoleExtra, getBetAmount, setWolfTeeOrder } = useTripContext();
  const [activeWolfHole, setActiveWolfHole] = useState<number | null>(null);
  const [editingOrder, setEditingOrder] = useState(false);
  const [tempOrder, setTempOrder] = useState<number[]>([0, 1, 2, 3]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const hasOrder = !!trip?.wolf_tee_order;
  const teeOrder = trip?.wolf_tee_order ?? [0, 1, 2, 3];
  const players = (trip?.players ?? []).map(p => p.name);
  const pars = Array.from({ length: 18 }, (_, h) => getPar(round, h));
  const netScores = PLAYERS.map((_, p) => getPlayerNetScores(round, p));
  const grossScores = PLAYERS.map((_, p) => getPlayerRoundScores(round, p));

  const wolfPartners = Array.from({ length: 18 }, (_, h) => getHoleExtra(round, h)?.wolf_partner ?? null);
  const wolfSpits = Array.from({ length: 18 }, (_, h) => getHoleExtra(round, h)?.wolf_spit ?? false);
  const girPlayers = Array.from({ length: 18 }, (_, h) => getHoleExtra(round, h)?.closest_gir_player ?? null);
  const pressMults = Array.from({ length: 18 }, (_, h) => { const e = getHoleExtra(round, h); return (e?.double_pressed ? 4 : e?.pressed ? 2 : 1); });

  const result = calcWolfRound(netScores, grossScores, teeOrder, wolfPartners, wolfSpits, pars, girPlayers);
  const bet = getBetAmount(round);

  // Per-player dollars with presses
  const playerDollars = PLAYERS.map((_, p) => {
    let total = 0;
    for (let h = 0; h < 18; h++) {
      const hr = result.holeResults[h];
      const mult = pressMults[h];
      if (hr.wolfTeam.includes(p)) total += hr.wolfTeamPoints * bet * mult;
      else total += hr.otherTeamPoints * bet * mult;
    }
    return total;
  });

  const handleWolfPick = async (hole: number, partner: number | null, spit: boolean = false) => {
    await setHoleExtra(round, hole, { wolf_partner: partner as any, wolf_spit: spit });
    setActiveWolfHole(null);
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="text-center">
        <h2 className="font-serif text-2xl text-gold font-bold">{ROUNDS[round].name}</h2>
        <p className="text-cream-dim text-sm">
          Round 2 {'\u00B7'} Par {ROUNDS[round].par} {'\u00B7'} {ROUNDS[round].tee} {'\u00B7'} Wolf
        </p>
      </div>

      {/* Settings (collapsible) */}
      <div className="bg-green-card rounded-xl border border-gold/20 p-3">
        <button
          onClick={() => { setSettingsOpen(!settingsOpen); if (!settingsOpen) setEditingOrder(false); }}
          className="w-full flex items-center justify-between"
        >
          <h3 className="text-xs text-gold font-medium uppercase tracking-wider">Settings</h3>
          <div className="flex items-center gap-2">
            <span className="text-cream-dim/60 text-[10px]">${bet}/pt {'\u00B7'} {teeOrder.map(i => (players[i] ?? PLAYERS[i])[0]).join('-')}</span>
            <span className="text-cream-dim text-xs">{settingsOpen ? '\u25B2' : '\u25BC'}</span>
          </div>
        </button>
        {settingsOpen && (
          <div className="mt-3 space-y-3 pt-3 border-t border-gold/10">
            {/* Tee Order */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-cream-dim text-[10px]">Tee Order (Wolf tees off first)</span>
                <button
                  onClick={() => { setEditingOrder(!editingOrder); setTempOrder([...teeOrder]); }}
                  className="text-[10px] px-2 py-1 rounded bg-gold/10 border border-gold/20 text-gold active:scale-95"
                >
                  {editingOrder ? 'Cancel' : hasOrder ? 'Change' : 'Set Order'}
                </button>
              </div>
              {!editingOrder ? (
                <p className="text-cream text-xs">
                  {teeOrder.map(i => players[i] ?? PLAYERS[i]).join(' \u2192 ')}
                </p>
              ) : (
                <div className="space-y-2">
                  {tempOrder.map((playerIdx, pos) => (
                    <div key={pos} className="flex items-center gap-3">
                      <span className="text-gold text-sm font-bold w-6">{pos + 1}.</span>
                      <span className="text-cream text-sm flex-1">{players[playerIdx] ?? PLAYERS[playerIdx]}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => { if (pos > 0) { const n = [...tempOrder]; [n[pos - 1], n[pos]] = [n[pos], n[pos - 1]]; setTempOrder(n); } }}
                          disabled={pos === 0}
                          className="w-7 h-7 rounded bg-green-deeper border border-gold/20 text-cream-dim text-xs disabled:opacity-20"
                        >{'\u25B2'}</button>
                        <button
                          onClick={() => { if (pos < 3) { const n = [...tempOrder]; [n[pos], n[pos + 1]] = [n[pos + 1], n[pos]]; setTempOrder(n); } }}
                          disabled={pos === 3}
                          className="w-7 h-7 rounded bg-green-deeper border border-gold/20 text-cream-dim text-xs disabled:opacity-20"
                        >{'\u25BC'}</button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={async () => { await setWolfTeeOrder(tempOrder); setEditingOrder(false); }}
                    className="w-full py-2 bg-gold text-green-deeper font-bold rounded-lg text-sm active:scale-95"
                  >
                    Save Tee Order
                  </button>
                </div>
              )}
            </div>
            <BetPicker round={round} />
          </div>
        )}
      </div>

      {/* Player Point Totals */}
      <div className="bg-green-card rounded-xl border border-gold/20 p-3">
        <h3 className="text-xs text-gold font-medium mb-2 uppercase tracking-wider">Wolf Points</h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          {PLAYERS.map((name, p) => (
            <div key={p} className="bg-green-deeper/50 rounded-lg py-2">
              <div className="text-cream-dim text-xs mb-1">{players[p] ?? name}</div>
              <div className="text-lg font-bold text-gold">{result.playerPoints[p]}</div>
              <div className="text-[10px] text-cream-dim/50">${playerDollars[p].toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Wolf Picks Per Hole */}
      <div className="bg-green-card rounded-xl border border-gold/20 p-3">
        <h3 className="text-xs text-gold font-medium mb-2 uppercase tracking-wider">Wolf Decisions</h3>
        <p className="text-cream-dim/60 text-[10px] mb-2">Tap a hole to set the Wolf's pick.</p>
        <div className="grid grid-cols-6 gap-1.5">
          {Array.from({ length: 18 }, (_, h) => {
            const wolf = getWolfForHole(h, teeOrder);
            const extra = getHoleExtra(round, h);
            const partner = extra?.wolf_partner;
            const spit = extra?.wolf_spit ?? false;
            const isExpanded = activeWolfHole === h;

            let label = '';
            let labelColor = 'text-cream-dim/40';
            if (partner !== null && partner !== undefined && !spit) {
              label = `+${players[partner]?.[0] ?? ''}`;
              labelColor = 'text-green-400';
            } else if (spit) {
              label = 'Spit';
              labelColor = 'text-red-400';
            } else if (extra) {
              label = 'Lone';
              labelColor = 'text-orange-400';
            }

            return (
              <button
                key={h}
                onClick={() => setActiveWolfHole(isExpanded ? null : h)}
                className={`py-1 rounded border text-[10px] transition-colors ${isExpanded ? 'ring-1 ring-gold border-gold/40' : 'border-gold/10'} bg-green-deeper/50`}
              >
                <div className="text-cream-dim">H{h + 1}</div>
                <div className="text-[8px] text-gold">{players[wolf]?.[0] ?? ''}{'\u{1F43A}'}</div>
                {label && <div className={`text-[8px] ${labelColor}`}>{label}</div>}
              </button>
            );
          })}
        </div>

        {activeWolfHole !== null && (
          <div className="mt-3 bg-green-deeper/50 rounded-lg p-3 space-y-2">
            {(() => {
              const h = activeWolfHole;
              const wolf = getWolfForHole(h, teeOrder);
              const others = [0, 1, 2, 3].filter(p => p !== wolf);
              return (
                <>
                  <p className="text-cream text-xs">
                    Hole {h + 1}: <span className="text-gold font-medium">{players[wolf] ?? PLAYERS[wolf]}</span> is Wolf (tees off first, watches others)
                  </p>
                  <p className="text-cream-dim/60 text-[10px]">Wolf picks after each tee shot. Can't go back once you pass.</p>
                  <div className="space-y-1.5">
                    {others.map(p => (
                      <div key={p} className="flex gap-2">
                        <button
                          onClick={() => handleWolfPick(h, p)}
                          className="flex-1 py-2 rounded bg-green-card border border-gold/20 text-cream text-xs active:scale-95"
                        >
                          Pick {players[p] ?? PLAYERS[p]}
                        </button>
                        <button
                          onClick={() => handleWolfPick(h, p, true)}
                          className="py-2 px-3 rounded bg-red-900/30 border border-red-500/20 text-red-400 text-xs active:scale-95"
                        >
                          Spit
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => handleWolfPick(h, null)}
                      className="w-full py-2 rounded bg-orange-900/20 border border-orange-500/20 text-orange-400 text-xs font-medium active:scale-95"
                    >
                      Lone Wolf (2x points)
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      <PressPanel round={round} />
      <Scorecard round={round} />
      <HoleExtrasPanel round={round} showGir showCtp />
    </div>
  );
}
