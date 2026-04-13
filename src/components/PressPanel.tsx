'use client';

import { useTripContext } from '@/lib/context';

interface Props {
  round: number;
}

export default function PressPanel({ round }: Props) {
  const { getHoleExtra, setHoleExtra } = useTripContext();

  const cyclePress = (h: number) => {
    const extra = getHoleExtra(round, h);
    const pressed = extra?.pressed ?? false;
    const doubled = extra?.double_pressed ?? false;

    if (!pressed && !doubled) {
      setHoleExtra(round, h, { pressed: true, double_pressed: false });
    } else if (pressed && !doubled) {
      setHoleExtra(round, h, { pressed: true, double_pressed: true });
    } else {
      setHoleExtra(round, h, { pressed: false, double_pressed: false });
    }
  };

  return (
    <div className="bg-green-card rounded-xl border border-gold/20 p-3">
      <h3 className="text-xs text-gold font-medium mb-2 uppercase tracking-wider">
        Press {'\u00B7'} <span className="normal-case text-cream-dim/60">Tap to cycle: off {'\u2192'} 2x {'\u2192'} 4x</span>
      </h3>
      <div className="grid grid-cols-9 gap-1">
        {Array.from({ length: 18 }, (_, h) => {
          const extra = getHoleExtra(round, h);
          const pressed = extra?.pressed ?? false;
          const doubled = extra?.double_pressed ?? false;
          const mult = doubled ? 4 : pressed ? 2 : 1;

          return (
            <button
              key={h}
              onClick={() => cyclePress(h)}
              className={`py-1.5 rounded text-[10px] font-medium transition-colors active:scale-95 ${
                doubled
                  ? 'bg-red-500 text-white border border-red-400'
                  : pressed
                  ? 'bg-gold text-green-deeper border border-gold'
                  : 'bg-green-deeper/50 border border-gold/10 text-cream-dim/40'
              }`}
            >
              <div>{h + 1}</div>
              {mult > 1 && <div className="text-[8px] font-bold">{mult}x</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Get press multiplier for a hole
export function getPressMult(pressed: boolean, doublePressed: boolean): number {
  if (doublePressed) return 4;
  if (pressed) return 2;
  return 1;
}
