export const PLAYERS = ['Derek', 'Pat', 'Joey', 'Matt'] as const;
export type PlayerName = (typeof PLAYERS)[number];

export const ROUNDS = [
  { name: 'Barefoot Love', par: 72, format: '6-6-6 Scotch', slope: 137, rating: 72.4 },
  { name: 'Barefoot Fazio', par: 71, format: 'Wolf', slope: 136, rating: 71.0 },
  { name: 'Barefoot Norman', par: 72, format: '6-6-6 Scotch', slope: 136, rating: 71.4 },
  { name: 'Barefoot Dye', par: 72, format: '2-Man Scramble', slope: 134, rating: 72.9 },
] as const;

export const ROUND_LABELS = [
  'R1: Scotch',
  'R2: Wolf',
  'R3: Scotch',
  'R4: Scramble',
] as const;

// Hole-by-hole pars
export const DEFAULT_PARS: number[][] = [
  [4, 5, 3, 4, 4, 4, 4, 5, 3, 4, 3, 4, 5, 4, 3, 4, 4, 5], // Love 72
  [4, 4, 3, 5, 4, 3, 5, 3, 4, 5, 3, 5, 4, 4, 4, 3, 4, 4], // Fazio 71
  [4, 4, 3, 4, 5, 4, 3, 4, 5, 3, 4, 4, 4, 4, 5, 3, 4, 5], // Norman 72
  [4, 4, 3, 4, 5, 3, 4, 5, 4, 4, 4, 5, 4, 4, 3, 5, 3, 4], // Dye 72
];

// Hole handicap rankings (lower = harder = gets strokes first)
export const DEFAULT_HOLE_HANDICAPS: number[][] = [
  [13, 7, 15, 17, 1, 9, 5, 3, 11, 16, 18, 2, 8, 10, 14, 12, 6, 4], // Love
  [9, 1, 17, 7, 3, 13, 5, 15, 11, 4, 16, 6, 2, 10, 14, 18, 8, 12], // Fazio
  [11, 9, 13, 5, 7, 1, 15, 17, 3, 14, 6, 2, 4, 18, 10, 16, 12, 8], // Norman
  [6, 14, 12, 18, 10, 8, 2, 16, 4, 13, 1, 15, 17, 3, 7, 11, 9, 5], // Dye
];

// ── Handicap calculations ──

export function courseHandicap(handicapIndex: number, slope: number): number {
  return Math.round(handicapIndex * (slope / 113));
}

// Which holes does a player get strokes on? Returns boolean[18]
export function strokeHoles(courseHcp: number, holeHandicaps: number[]): boolean[] {
  return holeHandicaps.map(rank => rank <= courseHcp);
}

// Net score for a single hole
export function netScore(grossScore: number | null, getsStroke: boolean): number | null {
  if (grossScore === null) return null;
  return getsStroke ? grossScore - 1 : grossScore;
}

// Scramble team handicap: 35% lower + 15% higher
export function scrambleHandicap(hcp1: number, hcp2: number): number {
  const lower = Math.min(hcp1, hcp2);
  const higher = Math.max(hcp1, hcp2);
  return Math.round(lower * 0.35 + higher * 0.15);
}

// ── Player data ──

export interface PlayerData {
  name: string;
  handicapIndex: number;
}

export const DEFAULT_PLAYERS: PlayerData[] = [
  { name: 'Derek', handicapIndex: 0 },
  { name: 'Pat', handicapIndex: 0 },
  { name: 'Joey', handicapIndex: 0 },
  { name: 'Matt', handicapIndex: 0 },
];

// ── Trip ──

export interface Trip {
  id: string;
  created_at: string;
  players: PlayerData[];
  pars: number[][] | null;
  hole_handicaps: number[][] | null;
  scotch_teams: ScotchTeams | null; // same for R1 and R3
  wolf_tee_order: number[] | null;
  scramble_teams_override: [number[], number[]] | null; // manual override for scramble teams
  round_teams: null; // legacy, kept for DB compat
  bet_amounts: number[] | null; // per-round bet amount in dollars [r0, r1, r2, r3]
  scramble_strokes: boolean; // whether scramble round uses handicap strokes
  status: 'setup' | 'active' | 'complete';
  commissioner: string;
}

// 3 segments of 6 holes, each is a 2v2 pairing
// Same order used for both Scotch rounds (R1 and R3)
export type ScotchTeams = [number[], number[]][]; // length 3: one pairing per 6-hole segment

export interface Score {
  id: string;
  trip_id: string;
  round: number;
  player: number;
  hole: number;
  score: number | null;
  updated_at: string;
}

export interface HoleExtra {
  id: string;
  trip_id: string;
  round: number;
  hole: number;
  closest_gir_player: number | null;
  wolf_picker: number | null;
  wolf_partner: number | null;
  wolf_spit: boolean;
  ctp_winner: number | null;
  pressed: boolean;
  updated_at: string;
}

export interface ScrambleScore {
  id: string;
  trip_id: string;
  hole: number;
  team: number; // 0 or 1
  gross_score: number | null;
  updated_at: string;
}

// All 3 possible 2v2 pairings of 4 players
export const ALL_PAIRINGS: [number[], number[]][] = [
  [[0, 1], [2, 3]],
  [[0, 2], [1, 3]],
  [[0, 3], [1, 2]],
];

// Par 3 holes per round (0-indexed)
export function getPar3Holes(pars: number[]): number[] {
  return pars.reduce<number[]>((acc, p, i) => {
    if (p === 3) acc.push(i);
    return acc;
  }, []);
}

// ── Score colors (based on NET score vs par) ──

export function getScoreColor(score: number | null, par: number): string {
  if (score === null) return '';
  const diff = score - par;
  if (diff <= -2) return 'text-orange-400 font-bold';
  if (diff === -1) return 'text-yellow-400 font-bold';
  if (diff === 0) return 'text-cream';
  if (diff === 1) return 'text-blue-400';
  return 'text-red-400 font-bold';
}

export function getScoreBg(score: number | null, par: number): string {
  if (score === null) return '';
  const diff = score - par;
  if (diff <= -2) return 'bg-orange-900/40';
  if (diff === -1) return 'bg-yellow-900/30';
  if (diff === 0) return '';
  if (diff === 1) return 'bg-blue-900/30';
  return 'bg-red-900/30';
}
