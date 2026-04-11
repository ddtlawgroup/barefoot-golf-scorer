import {
  ScotchTeams, PlayerData, ROUNDS, DEFAULT_HOLE_HANDICAPS,
  courseHandicap, strokeHoles, netScore, scrambleHandicap,
} from './types';

// ── Handicap helpers ──

// Get course handicap for a player on a given round
export function getPlayerCourseHcp(player: PlayerData, round: number): number {
  return courseHandicap(player.handicapIndex, ROUNDS[round].slope);
}

// Get net scores for a player on a round (gross scores + handicap strokes)
export function getNetScores(
  grossScores: (number | null)[],
  courseHcp: number,
  holeHcps: number[]
): (number | null)[] {
  const strokes = strokeHoles(courseHcp, holeHcps);
  return grossScores.map((g, i) => netScore(g, strokes[i]));
}

// ── 6-6-6 Scotch Scoring ──
// Per-hole: up to 6 points (2 low individual, 2 low team total, 1 closest GIR, 1 birdie)
// Sweep + birdie = doubles to 12

export interface ScotchHoleResult {
  lowIndividualTeam: number | null; // 0 or 1 (team index) or null (tie)
  lowTeamTotalTeam: number | null;
  girTeam: number | null; // team of closest GIR player
  birdieTeams: number[]; // which teams had a net birdie
  sweep: boolean; // one team got all 6 non-birdie points AND has birdie
  teamAPoints: number;
  teamBPoints: number;
}

export function calcScotchHole(
  netScores: (number | null)[], // all 4 players' net scores for this hole
  teamA: number[], // player indices
  teamB: number[],
  par: number,
  closestGirPlayer: number | null
): ScotchHoleResult {
  const aScores = teamA.map(p => netScores[p]);
  const bScores = teamB.map(p => netScores[p]);

  let teamAPoints = 0;
  let teamBPoints = 0;

  // 2 pts: Low Individual NET
  let lowIndividualTeam: number | null = null;
  const allValid = netScores.filter(s => s !== null) as number[];
  if (allValid.length > 0) {
    const minNet = Math.min(...allValid);
    const winnersA = teamA.filter(p => netScores[p] === minNet);
    const winnersB = teamB.filter(p => netScores[p] === minNet);
    if (winnersA.length > 0 && winnersB.length === 0) {
      lowIndividualTeam = 0;
      teamAPoints += 2;
    } else if (winnersB.length > 0 && winnersA.length === 0) {
      lowIndividualTeam = 1;
      teamBPoints += 2;
    }
    // Tie across teams = no points
  }

  // 2 pts: Low Team Total
  let lowTeamTotalTeam: number | null = null;
  const aTotal = aScores.every(s => s !== null)
    ? (aScores as number[]).reduce((a, b) => a + b, 0)
    : null;
  const bTotal = bScores.every(s => s !== null)
    ? (bScores as number[]).reduce((a, b) => a + b, 0)
    : null;
  if (aTotal !== null && bTotal !== null) {
    if (aTotal < bTotal) {
      lowTeamTotalTeam = 0;
      teamAPoints += 2;
    } else if (bTotal < aTotal) {
      lowTeamTotalTeam = 1;
      teamBPoints += 2;
    }
  }

  // 1 pt: Closest GIR
  let girTeam: number | null = null;
  if (closestGirPlayer !== null) {
    if (teamA.includes(closestGirPlayer)) {
      girTeam = 0;
      teamAPoints += 1;
    } else if (teamB.includes(closestGirPlayer)) {
      girTeam = 1;
      teamBPoints += 1;
    }
  }

  // 1 pt: Birdie (net birdie or better) - both teams can get it
  const birdieTeams: number[] = [];
  const aBirdie = teamA.some(p => netScores[p] !== null && netScores[p]! < par);
  const bBirdie = teamB.some(p => netScores[p] !== null && netScores[p]! < par);
  if (aBirdie) { birdieTeams.push(0); teamAPoints += 1; }
  if (bBirdie) { birdieTeams.push(1); teamBPoints += 1; }

  // Sweep + Birdie bonus: if one team has all 6 AND birdie, double to 12
  let sweep = false;
  if (teamAPoints >= 6 && birdieTeams.includes(0) && teamBPoints === 0) {
    sweep = true;
    teamAPoints = 12;
  } else if (teamBPoints >= 6 && birdieTeams.includes(1) && teamAPoints === 0) {
    sweep = true;
    teamBPoints = 12;
  }

  return { lowIndividualTeam, lowTeamTotalTeam, girTeam, birdieTeams, sweep, teamAPoints, teamBPoints };
}

// Calc all 18 holes for a Scotch round, returns points per segment and total
export interface ScotchRoundResult {
  segments: { teamA: number; teamB: number; pairing: [number[], number[]] }[];
  totalA: number;
  totalB: number;
  holeResults: ScotchHoleResult[];
  // Per-player point totals (a player's team points across their segments)
  playerPoints: number[];
}

export function calcScotchRound(
  netScores: (number | null)[][], // [player][hole]
  scotchTeams: ScotchTeams, // 3 pairings, one per 6-hole segment
  pars: number[],
  closestGirPlayers: (number | null)[] // per hole
): ScotchRoundResult {
  const holeResults: ScotchHoleResult[] = [];
  const segments: { teamA: number; teamB: number; pairing: [number[], number[]] }[] = [];
  const playerPoints = [0, 0, 0, 0];

  for (let seg = 0; seg < 3; seg++) {
    const [teamA, teamB] = scotchTeams[seg];
    let segA = 0, segB = 0;

    for (let h = seg * 6; h < (seg + 1) * 6; h++) {
      const holeNet = [0, 1, 2, 3].map(p => netScores[p][h]);
      const result = calcScotchHole(holeNet, teamA, teamB, pars[h], closestGirPlayers[h]);
      holeResults.push(result);
      segA += result.teamAPoints;
      segB += result.teamBPoints;
    }

    segments.push({ teamA: segA, teamB: segB, pairing: [teamA, teamB] });

    // Distribute points to players
    teamA.forEach(p => { playerPoints[p] += segA; });
    teamB.forEach(p => { playerPoints[p] += segB; });
  }

  const totalA = segments.reduce((s, seg) => s + seg.teamA, 0);
  const totalB = segments.reduce((s, seg) => s + seg.teamB, 0);

  return { segments, totalA, totalB, holeResults, playerPoints };
}

// ── Wolf Scoring ──
// Uses same point system as Scotch but with Wolf pick mechanics

export interface WolfHoleResult {
  wolfPlayer: number;
  partner: number | null; // null = lone wolf
  spit: boolean;
  isLoneWolf: boolean;
  // Teams for this hole: wolfTeam vs otherTeam
  wolfTeam: number[];
  otherTeam: number[];
  wolfTeamPoints: number;
  otherTeamPoints: number;
  doubled: boolean; // lone wolf or spit = doubled
}

export function getWolfForHole(hole: number, teeOrder: number[]): number {
  return teeOrder[hole % 4];
}

export function calcWolfHole(
  netScores: (number | null)[],
  wolf: number,
  partner: number | null,
  spit: boolean,
  par: number,
  closestGirPlayer: number | null
): WolfHoleResult {
  const allPlayers = [0, 1, 2, 3];
  const isLoneWolf = partner === null || spit;
  const doubled = isLoneWolf;

  let wolfTeam: number[];
  let otherTeam: number[];

  if (spit && partner !== null) {
    // Spit: the picked player goes alone vs other 3
    wolfTeam = allPlayers.filter(p => p !== partner);
    otherTeam = [partner];
  } else if (partner === null) {
    // Lone wolf: wolf alone vs other 3
    wolfTeam = [wolf];
    otherTeam = allPlayers.filter(p => p !== wolf);
  } else {
    // Normal: wolf + partner vs other 2
    wolfTeam = [wolf, partner];
    otherTeam = allPlayers.filter(p => !wolfTeam.includes(p));
  }

  // For lone wolf/spit, team total uses doubled individual score
  // Calculate points using same scotch system
  let wolfTeamPoints = 0;
  let otherTeamPoints = 0;

  // 2 pts: Low Individual NET
  const allValid = allPlayers.filter(p => netScores[p] !== null);
  if (allValid.length > 0) {
    const minNet = Math.min(...allValid.map(p => netScores[p]!));
    const wWinners = wolfTeam.filter(p => netScores[p] === minNet);
    const oWinners = otherTeam.filter(p => netScores[p] === minNet);
    if (wWinners.length > 0 && oWinners.length === 0) wolfTeamPoints += 2;
    else if (oWinners.length > 0 && wWinners.length === 0) otherTeamPoints += 2;
  }

  // 2 pts: Low Team Total
  const wolfScores = wolfTeam.map(p => netScores[p]).filter(s => s !== null) as number[];
  const otherScoresArr = otherTeam.map(p => netScores[p]).filter(s => s !== null) as number[];
  if (wolfScores.length === wolfTeam.length && otherScoresArr.length === otherTeam.length) {
    let wTotal = wolfScores.reduce((a, b) => a + b, 0);
    let oTotal = otherScoresArr.reduce((a, b) => a + b, 0);
    // Lone wolf: double wolf's score for team total
    if (isLoneWolf && wolfTeam.length === 1) {
      wTotal = wTotal * 2;
    }
    if (isLoneWolf && otherTeam.length === 1) {
      oTotal = oTotal * 2;
    }
    if (wTotal < oTotal) wolfTeamPoints += 2;
    else if (oTotal < wTotal) otherTeamPoints += 2;
  }

  // 1 pt: Closest GIR
  if (closestGirPlayer !== null) {
    if (wolfTeam.includes(closestGirPlayer)) wolfTeamPoints += 1;
    else if (otherTeam.includes(closestGirPlayer)) otherTeamPoints += 1;
  }

  // 1 pt: Birdie
  const wBirdie = wolfTeam.some(p => netScores[p] !== null && netScores[p]! < par);
  const oBirdie = otherTeam.some(p => netScores[p] !== null && netScores[p]! < par);
  if (wBirdie) wolfTeamPoints += 1;
  if (oBirdie) otherTeamPoints += 1;

  // Sweep + Birdie doubles to 12
  if (wolfTeamPoints >= 6 && wBirdie && otherTeamPoints === 0) {
    wolfTeamPoints = 12;
  } else if (otherTeamPoints >= 6 && oBirdie && wolfTeamPoints === 0) {
    otherTeamPoints = 12;
  }

  // Lone wolf / spit: all points doubled
  if (doubled) {
    wolfTeamPoints *= 2;
    otherTeamPoints *= 2;
  }

  return {
    wolfPlayer: wolf,
    partner,
    spit,
    isLoneWolf,
    wolfTeam,
    otherTeam,
    wolfTeamPoints,
    otherTeamPoints,
    doubled,
  };
}

// Calc full wolf round, return per-player point totals
export function calcWolfRound(
  netScores: (number | null)[][],
  teeOrder: number[],
  wolfPartners: (number | null)[], // per hole, null = lone wolf
  wolfSpits: boolean[], // per hole
  pars: number[],
  closestGirPlayers: (number | null)[]
): { playerPoints: number[]; holeResults: WolfHoleResult[] } {
  const playerPoints = [0, 0, 0, 0];
  const holeResults: WolfHoleResult[] = [];

  for (let h = 0; h < 18; h++) {
    const wolf = getWolfForHole(h, teeOrder);
    const holeNet = [0, 1, 2, 3].map(p => netScores[p][h]);
    const result = calcWolfHole(holeNet, wolf, wolfPartners[h], wolfSpits[h], pars[h], closestGirPlayers[h]);
    holeResults.push(result);

    result.wolfTeam.forEach(p => { playerPoints[p] += result.wolfTeamPoints; });
    result.otherTeam.forEach(p => { playerPoints[p] += result.otherTeamPoints; });
  }

  return { playerPoints, holeResults };
}

// ── Scramble (Round 4) ──

// Determine scramble teams from Stableford standings: 1st+4th vs 2nd+3rd
export function getScrambleTeams(stablefordTotals: number[]): [number[], number[]] {
  const ranked = stablefordTotals
    .map((pts, idx) => ({ idx, pts }))
    .sort((a, b) => b.pts - a.pts); // highest first

  return [
    [ranked[0].idx, ranked[3].idx], // 1st + 4th
    [ranked[1].idx, ranked[2].idx], // 2nd + 3rd
  ];
}

// Calc scramble net score for a team on a hole
export function scrambleNetScore(
  grossScore: number | null,
  teamHcp: number,
  hole: number,
  holeHcps: number[]
): number | null {
  if (grossScore === null) return null;
  const getsStroke = holeHcps[hole] <= teamHcp;
  return getsStroke ? grossScore - 1 : grossScore;
}

// ── Stableford (uses NET scores) ──

export function stablefordPoints(netScore: number | null, par: number): number {
  if (netScore === null) return 0;
  const diff = netScore - par;
  if (diff >= 2) return 0;
  if (diff === 1) return 1;
  if (diff === 0) return 2;
  if (diff === -1) return 3;
  return 5;
}

export function calcStableford(
  netScores: (number | null)[],
  pars: number[]
): number {
  return netScores.reduce<number>((total, score, i) => total + stablefordPoints(score, pars[i]), 0);
}
