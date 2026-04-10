export const PLAYERS = ['Derek', 'Pat', 'Joey', 'Matt'] as const;
export type PlayerName = (typeof PLAYERS)[number];

export const ROUNDS = [
  { name: 'Barefoot Fazio', par: 71 },
  { name: 'Barefoot Love', par: 72 },
  { name: 'Barefoot Norman', par: 72 },
  { name: 'Barefoot Dye', par: 72 },
] as const;

export const ROUND_LABELS = [
  'R1: Fazio',
  'R2: Love',
  'R3: Norman',
  'R4: Dye',
] as const;

// Default par layouts for each course
export const DEFAULT_PARS: number[][] = [
  // Fazio (par 71)
  [4, 4, 3, 5, 4, 3, 5, 3, 4, 5, 3, 5, 4, 4, 4, 3, 4, 4],
  // Love (par 72)
  [4, 5, 3, 4, 4, 4, 4, 5, 3, 4, 3, 4, 5, 4, 3, 4, 4, 5],
  // Norman (par 72)
  [4, 4, 3, 4, 5, 4, 3, 4, 5, 3, 4, 4, 4, 4, 5, 3, 4, 5],
  // Dye (par 72)
  [4, 4, 3, 4, 5, 3, 4, 5, 4, 4, 4, 5, 4, 4, 3, 5, 3, 4],
];

export interface Trip {
  id: string;
  created_at: string;
  players: string[];
  round_teams: RoundTeams | null;
  pars: number[][] | null;
  status: 'setup' | 'active' | 'complete';
  commissioner: string;
}

// round_teams maps round index (0-2) to the two teams
// Round 3 is always individual skins, no teams
export interface RoundTeams {
  [round: string]: [number[], number[]]; // e.g. "0": [[0,1],[2,3]]
}

export interface Score {
  id: string;
  trip_id: string;
  round: number;
  player: number;
  hole: number;
  score: number | null;
  updated_at: string;
}

// All 3 possible 2v2 pairings of 4 players
export const ALL_PAIRINGS: [number[], number[]][] = [
  [[0, 1], [2, 3]], // Derek+Pat vs Joey+Matt
  [[0, 2], [1, 3]], // Derek+Joey vs Pat+Matt
  [[0, 3], [1, 2]], // Derek+Matt vs Pat+Joey
];

export function getScoreColor(score: number | null, par: number): string {
  if (score === null) return '';
  const diff = score - par;
  if (diff <= -2) return 'text-orange-400 font-bold'; // eagle or better
  if (diff === -1) return 'text-yellow-400 font-bold'; // birdie
  if (diff === 0) return 'text-cream'; // par
  if (diff === 1) return 'text-blue-400'; // bogey
  return 'text-red-400 font-bold'; // double+
}

export function getScoreBg(score: number | null, par: number): string {
  if (score === null) return '';
  const diff = score - par;
  if (diff <= -2) return 'bg-orange-900/40'; // eagle
  if (diff === -1) return 'bg-yellow-900/30'; // birdie
  if (diff === 0) return ''; // par
  if (diff === 1) return 'bg-blue-900/30'; // bogey
  return 'bg-red-900/30'; // double+
}
