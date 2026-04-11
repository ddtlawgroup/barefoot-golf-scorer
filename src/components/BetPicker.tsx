'use client';

import { useTripContext } from '@/lib/context';

const BET_OPTIONS = [0.5, 1, 2, 3, 5, 10];

export default function BetPicker({ round }: { round: number }) {
  const { getBetAmount, setBetAmount } = useTripContext();
  const current = getBetAmount(round);

  return (
    <div className="bg-green-card rounded-xl border border-gold/20 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gold font-medium uppercase tracking-wider">Per Point</span>
        <div className="flex gap-1.5">
          {BET_OPTIONS.map(amt => (
            <button
              key={amt}
              onClick={() => setBetAmount(round, amt)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors active:scale-95 ${
                current === amt
                  ? 'bg-gold text-green-deeper'
                  : 'bg-green-deeper/50 border border-gold/10 text-cream-dim'
              }`}
            >
              ${amt % 1 === 0 ? amt : amt.toFixed(2)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
