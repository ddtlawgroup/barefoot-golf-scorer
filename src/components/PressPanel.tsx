'use client';

import { useTripContext } from '@/lib/context';

interface Props {
  round: number;
}

export default function PressPanel({ round }: Props) {
  const { getHoleExtra, setHoleExtra } = useTripContext();

  return (
    <div className="bg-green-card rounded-xl border border-gold/20 p-3">
      <h3 className="text-xs text-gold font-medium mb-2 uppercase tracking-wider">
        Press (2x) {'\u00B7'} <span className="normal-case text-cream-dim/60">Tap to double a hole's bet</span>
      </h3>
      <div className="grid grid-cols-9 gap-1">
        {Array.from({ length: 18 }, (_, h) => {
          const pressed = getHoleExtra(round, h)?.pressed ?? false;
          return (
            <button
              key={h}
              onClick={() => setHoleExtra(round, h, { pressed: !pressed })}
              className={`py-1.5 rounded text-[10px] font-medium transition-colors active:scale-95 ${
                pressed
                  ? 'bg-gold text-green-deeper border border-gold'
                  : 'bg-green-deeper/50 border border-gold/10 text-cream-dim/40'
              }`}
            >
              <div>{h + 1}</div>
              {pressed && <div className="text-[8px] font-bold">2x</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Helper: calculate total dollar value factoring in presses
export function calcDollarsWithPresses(
  holePoints: { teamAPoints: number; teamBPoints: number }[],
  betAmount: number,
  pressedHoles: boolean[],
  playerTeamByHole: (0 | 1 | null)[], // which team (0=A, 1=B) the player is on per hole
): number {
  let total = 0;
  for (let h = 0; h < holePoints.length; h++) {
    const mult = pressedHoles[h] ? 2 : 1;
    const team = playerTeamByHole[h];
    if (team === 0) total += holePoints[h].teamAPoints * betAmount * mult;
    else if (team === 1) total += holePoints[h].teamBPoints * betAmount * mult;
  }
  return total;
}
