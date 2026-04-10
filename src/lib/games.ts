import { RoundTeams } from './types';

// ── Best Ball ──
// For a 2-person team, return the lower score on each hole
export function bestBall(
  scoresA: (number | null)[],
  scoresB: (number | null)[]
): (number | null)[] {
  return scoresA.map((a, i) => {
    const b = scoresB[i];
    if (a === null && b === null) return null;
    if (a === null) return b;
    if (b === null) return a;
    return Math.min(a, b);
  });
}

// ── Nassau ──
// Returns { front: 0|1|null, back: 0|1|null, overall: 0|1|null }
// 0 = team A wins, 1 = team B wins, null = tie
export function calcNassau(
  teamABestBall: (number | null)[],
  teamBBestBall: (number | null)[]
): { front: number | null; back: number | null; overall: number | null } {
  let frontA = 0, frontB = 0, backA = 0, backB = 0;

  for (let h = 0; h < 9; h++) {
    const a = teamABestBall[h];
    const b = teamBBestBall[h];
    if (a !== null && b !== null) {
      if (a < b) frontA++;
      else if (b < a) frontB++;
    }
  }
  for (let h = 9; h < 18; h++) {
    const a = teamABestBall[h];
    const b = teamBBestBall[h];
    if (a !== null && b !== null) {
      if (a < b) backA++;
      else if (b < a) backB++;
    }
  }

  const front = frontA > frontB ? 0 : frontB > frontA ? 1 : null;
  const back = backA > backB ? 0 : backB > backA ? 1 : null;
  const totalA = frontA + backA;
  const totalB = frontB + backB;
  const overall = totalA > totalB ? 0 : totalB > totalA ? 1 : null;

  return { front, back, overall };
}

// ── Skins (Round 4, individual) ──
// Returns { skins: number[] (count per player 0-3), carries: number }
export function calcSkins(
  allScores: (number | null)[][] // [player][hole]
): { skins: number[]; carries: number } {
  const skinCount = [0, 0, 0, 0];
  let carry = 0;

  for (let h = 0; h < 18; h++) {
    const scores = allScores.map(s => s[h]);
    if (scores.some(s => s === null)) {
      // If any score missing, carry
      carry++;
      continue;
    }
    const min = Math.min(...(scores as number[]));
    const winners = scores.filter(s => s === min);
    if (winners.length === 1) {
      const winnerIdx = scores.indexOf(min);
      skinCount[winnerIdx] += 1 + carry;
      carry = 0;
    } else {
      carry++;
    }
  }

  return { skins: skinCount, carries: carry };
}

// ── Stableford ──
// Double bogey or worse = 0, Bogey = 1, Par = 2, Birdie = 3, Eagle = 5
export function stablefordPoints(score: number | null, par: number): number {
  if (score === null) return 0;
  const diff = score - par;
  if (diff >= 2) return 0; // double bogey+
  if (diff === 1) return 1; // bogey
  if (diff === 0) return 2; // par
  if (diff === -1) return 3; // birdie
  return 5; // eagle or better
}

export function calcStableford(
  scores: (number | null)[],
  pars: number[]
): number {
  return scores.reduce<number>((total, score, i) => total + stablefordPoints(score, pars[i]), 0);
}

// ── Nassau points for a player across rounds 1-3 ──
export function calcNassauPoints(
  allScores: (number | null)[][][], // [round][player][hole]
  roundTeams: RoundTeams,
  playerIdx: number
): number {
  let points = 0;

  for (let r = 0; r < 3; r++) {
    const teams = roundTeams[r.toString()];
    if (!teams) continue;

    const [teamA, teamB] = teams;
    const isTeamA = teamA.includes(playerIdx);
    const isTeamB = teamB.includes(playerIdx);
    if (!isTeamA && !isTeamB) continue;

    const teamAScores = bestBall(
      allScores[r][teamA[0]] || [],
      allScores[r][teamA[1]] || []
    );
    const teamBScores = bestBall(
      allScores[r][teamB[0]] || [],
      allScores[r][teamB[1]] || []
    );

    const nassau = calcNassau(teamAScores, teamBScores);
    const myTeam = isTeamA ? 0 : 1;

    if (nassau.front === myTeam) points++;
    if (nassau.back === myTeam) points++;
    if (nassau.overall === myTeam) points++;
  }

  return points;
}
