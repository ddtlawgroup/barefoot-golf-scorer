'use client';

import { useState } from 'react';
import { useTripContext } from '@/lib/context';
import { PLAYERS, ROUNDS, DEFAULT_PARS, DEFAULT_HOLE_HANDICAPS, scrambleHandicap, getPar3Holes } from '@/lib/types';
import { calcStableford, calcScotchRound, calcWolfRound, getScrambleTeams, scrambleNetScore } from '@/lib/games';
import { StablefordInfo, ScotchInfo, WolfInfo, ScrambleInfo, CtpInfo } from './InfoModal';

export default function Summary() {
  const { trip, getPlayerNetScores, getPlayerRoundScores, getPar, getPlayerCourseHcp, getHoleExtra, getScrambleScore, currentPlayer, resetTrip, getBetAmount } = useTripContext();
  const [showReset, setShowReset] = useState(false);
  const isCommissioner = currentPlayer === trip?.commissioner;

  const players = (trip?.players ?? []).map(p => p.name);
  const holeHcps = trip?.hole_handicaps ?? DEFAULT_HOLE_HANDICAPS;

  // ── Stableford ──
  const stablefordByRound = PLAYERS.map((_, p) => {
    return [0, 1, 2, 3].map(r => {
      if (r === 3) {
        const totals = PLAYERS.map((_, pl) => {
          let t = 0;
          for (let rr = 0; rr < 3; rr++) {
            const net = getPlayerNetScores(rr, pl);
            const rPars = Array.from({ length: 18 }, (_, h) => getPar(rr, h));
            t += calcStableford(net, rPars);
          }
          return t;
        });
        const teams: [number[], number[]] = trip?.scramble_teams_override ?? getScrambleTeams(totals);
        const teamIdx = teams[0].includes(p) ? 0 : 1;
        const strokesOn = trip?.scramble_strokes ?? true;
        const teamHcp = strokesOn ? scrambleHandicap(
          getPlayerCourseHcp(teams[teamIdx][0], 3),
          getPlayerCourseHcp(teams[teamIdx][1], 3)
        ) : 0;
        const netScores = Array.from({ length: 18 }, (_, h) => {
          const g = getScrambleScore(h, teamIdx);
          return scrambleNetScore(g, teamHcp, h, holeHcps[3]);
        });
        const rPars = Array.from({ length: 18 }, (_, h) => getPar(3, h));
        return calcStableford(netScores, rPars);
      }
      const net = getPlayerNetScores(r, p);
      const rPars = Array.from({ length: 18 }, (_, h) => getPar(r, h));
      return calcStableford(net, rPars);
    });
  });

  const totalStableford = stablefordByRound.map(rounds => rounds.reduce((a, b) => a + b, 0));
  const maxStableford = Math.max(...totalStableford);

  // ── Total gross strokes ──
  const totalStrokes = PLAYERS.map((_, p) => {
    let total = 0, count = 0, par = 0;
    for (let r = 0; r < 4; r++) {
      const scores = getPlayerRoundScores(r, p);
      scores.forEach((s, h) => {
        if (s !== null) { total += s; par += getPar(r, h); count++; }
      });
    }
    return { total, count, par };
  });

  // ── Scotch (R1+R3) ──
  const scotchPlayerPoints = [0, 0, 0, 0];
  // Per-player dollar winnings from scotch rounds (net: what you earn minus what opponents earn)
  const scotchPlayerDollars = [0, 0, 0, 0];
  if (trip?.scotch_teams) {
    for (const r of [0, 2] as const) {
      const pars = Array.from({ length: 18 }, (_, h) => getPar(r, h));
      const netScores = PLAYERS.map((_, p) => getPlayerNetScores(r, p));
      const grossScores = PLAYERS.map((_, p) => getPlayerRoundScores(r, p));
      const girPlayers = Array.from({ length: 18 }, (_, h) => getHoleExtra(r, h)?.closest_gir_player ?? null);
      const pressMults = Array.from({ length: 18 }, (_, h) => { const e = getHoleExtra(r, h); return (e?.double_pressed ? 4 : e?.pressed ? 2 : 1); });
      const result = calcScotchRound(netScores, grossScores, trip.scotch_teams, pars, girPlayers);
      const bet = getBetAmount(r);

      result.playerPoints.forEach((pts, p) => { scotchPlayerPoints[p] += pts; });

      // Compute per-player dollars for this round
      for (let h = 0; h < 18; h++) {
        const seg = Math.floor(h / 6);
        const [teamA, teamB] = trip.scotch_teams[seg];
        const mult = pressMults[h];
        const hr = result.holeResults[h];
        teamA.forEach(p => { scotchPlayerDollars[p] += hr.teamAPoints * bet * mult; });
        teamB.forEach(p => { scotchPlayerDollars[p] += hr.teamBPoints * bet * mult; });
      }
    }
  }

  // ── Wolf (R2) ──
  const wolfPlayerPoints = [0, 0, 0, 0];
  const wolfPlayerDollars = [0, 0, 0, 0];
  if (trip?.wolf_tee_order) {
    const pars = Array.from({ length: 18 }, (_, h) => getPar(1, h));
    const netScores = PLAYERS.map((_, p) => getPlayerNetScores(1, p));
    const grossScores = PLAYERS.map((_, p) => getPlayerRoundScores(1, p));
    const girPlayers = Array.from({ length: 18 }, (_, h) => getHoleExtra(1, h)?.closest_gir_player ?? null);
    const wolfPartners = Array.from({ length: 18 }, (_, h) => getHoleExtra(1, h)?.wolf_partner ?? null);
    const wolfSpits = Array.from({ length: 18 }, (_, h) => getHoleExtra(1, h)?.wolf_spit ?? false);
    const pressMults = Array.from({ length: 18 }, (_, h) => { const e = getHoleExtra(1, h); return (e?.double_pressed ? 4 : e?.pressed ? 2 : 1); });
    const result = calcWolfRound(netScores, grossScores, trip.wolf_tee_order, wolfPartners, wolfSpits, pars, girPlayers);
    const bet = getBetAmount(1);

    result.playerPoints.forEach((pts, p) => { wolfPlayerPoints[p] = pts; });

    for (let h = 0; h < 18; h++) {
      const hr = result.holeResults[h];
      const mult = pressMults[h];
      hr.wolfTeam.forEach(p => { wolfPlayerDollars[p] += hr.wolfTeamPoints * bet * mult; });
      hr.otherTeam.forEach(p => { wolfPlayerDollars[p] += hr.otherTeamPoints * bet * mult; });
    }
  }

  // ── Scramble (R4) ──
  const stablefordR3 = PLAYERS.map((_, p) => {
    let t = 0;
    for (let r = 0; r < 3; r++) {
      const net = getPlayerNetScores(r, p);
      const rPars = Array.from({ length: 18 }, (_, h) => getPar(r, h));
      t += calcStableford(net, rPars);
    }
    return t;
  });
  const scrambleTeams: [number[], number[]] = trip?.scramble_teams_override ?? getScrambleTeams(stablefordR3);
  const strokesOn = trip?.scramble_strokes ?? true;
  const scrambleTeamHcps = scrambleTeams.map(team => {
    if (!strokesOn) return 0;
    return scrambleHandicap(getPlayerCourseHcp(team[0], 3), getPlayerCourseHcp(team[1], 3));
  });
  const scrambleTotals = [0, 1].map(t => {
    let gross = 0, net = 0, count = 0;
    for (let h = 0; h < 18; h++) {
      const g = getScrambleScore(h, t);
      if (g !== null) {
        gross += g;
        net += scrambleNetScore(g, scrambleTeamHcps[t], h, holeHcps[3]) ?? g;
        count++;
      }
    }
    return { gross, net, count };
  });

  // Scramble dollars: bet on net stroke differential per hole
  const scramblePlayerDollars = [0, 0, 0, 0];
  const scrambleBet = getBetAmount(3);
  for (let h = 0; h < 18; h++) {
    const g0 = getScrambleScore(h, 0);
    const g1 = getScrambleScore(h, 1);
    if (g0 === null || g1 === null) continue;
    const net0 = scrambleNetScore(g0, scrambleTeamHcps[0], h, holeHcps[3])!;
    const net1 = scrambleNetScore(g1, scrambleTeamHcps[1], h, holeHcps[3])!;
    if (net0 < net1) {
      // Team 0 wins this hole
      scrambleTeams[0].forEach(p => { scramblePlayerDollars[p] += scrambleBet; });
      scrambleTeams[1].forEach(p => { scramblePlayerDollars[p] -= scrambleBet; });
    } else if (net1 < net0) {
      scrambleTeams[1].forEach(p => { scramblePlayerDollars[p] += scrambleBet; });
      scrambleTeams[0].forEach(p => { scramblePlayerDollars[p] -= scrambleBet; });
    }
  }

  // ── CTP leaderboard (with carry-overs, $5 per CTP) ──
  const CTP_BET = 5;
  const ctpWins = [0, 0, 0, 0]; // how many CTPs each player won (including carries)
  const ctpDollars = [0, 0, 0, 0];
  // Flatten all par 3s across all rounds in order, carry across rounds
  let ctpCarry = 0;
  for (let r = 0; r < 4; r++) {
    const rPars = Array.from({ length: 18 }, (_, h) => getPar(r, h));
    const par3s = getPar3Holes(rPars);
    par3s.forEach(h => {
      const winner = getHoleExtra(r, h)?.ctp_winner;
      if (winner !== null && winner !== undefined) {
        const payout = (1 + ctpCarry) * CTP_BET;
        ctpWins[winner] += 1 + ctpCarry;
        ctpDollars[winner] += payout;
        // Each other player pays the winner
        for (let p = 0; p < 4; p++) {
          if (p !== winner) ctpDollars[p] -= payout / 3;
        }
        ctpCarry = 0;
      } else {
        ctpCarry++;
      }
    });
  }

  const roundWinners = [0, 1, 2, 3].map(r => {
    const scores = stablefordByRound.map(p => p[r]);
    const max = Math.max(...scores);
    if (max === 0) return null;
    const winners = scores.filter(s => s === max);
    if (winners.length > 1) return null;
    return scores.indexOf(max);
  });

  const teamName = (indices: number[]) => indices.map(i => players[i] ?? PLAYERS[i]).join(' & ');

  // ── Settlement calculation ──
  // For Scotch/Wolf: points are zero-sum per hole between teams.
  // Each player's net = their dollars minus average of all dollars (to make it zero-sum pairwise).
  // Simpler: compute pairwise debts per hole based on who was on which team.

  // Build per-hole pairwise ledger across all rounds
  const ledger: number[][] = Array.from({ length: 4 }, () => Array(4).fill(0));
  // ledger[i][j] = amount j owes i (positive = j owes i)

  // Scotch: on each hole, losing team members each owe winning team members
  if (trip?.scotch_teams) {
    for (const r of [0, 2] as const) {
      const pars = Array.from({ length: 18 }, (_, h) => getPar(r, h));
      const netScores = PLAYERS.map((_, p) => getPlayerNetScores(r, p));
      const grossScores = PLAYERS.map((_, p) => getPlayerRoundScores(r, p));
      const girPlayers = Array.from({ length: 18 }, (_, h) => getHoleExtra(r, h)?.closest_gir_player ?? null);
      const pressMults = Array.from({ length: 18 }, (_, h) => { const e = getHoleExtra(r, h); return (e?.double_pressed ? 4 : e?.pressed ? 2 : 1); });
      const result = calcScotchRound(netScores, grossScores, trip.scotch_teams, pars, girPlayers);
      const bet = getBetAmount(r);

      for (let h = 0; h < 18; h++) {
        const seg = Math.floor(h / 6);
        const [teamA, teamB] = trip.scotch_teams[seg];
        const mult = pressMults[h];
        const hr = result.holeResults[h];
        const diff = hr.teamAPoints - hr.teamBPoints;
        // diff > 0: team A won, team B members owe team A members
        // Each losing player owes each winning player: |diff| * bet * mult / (teamSize * teamSize)
        // Since teams are 2v2: each loser owes each winner diff * bet * mult (1-to-1 matching)
        const perPair = Math.abs(diff) * bet * mult;
        if (diff > 0) {
          // B owes A
          for (const a of teamA) {
            for (const b of teamB) {
              ledger[a][b] += perPair;
            }
          }
        } else if (diff < 0) {
          // A owes B
          for (const b of teamB) {
            for (const a of teamA) {
              ledger[b][a] += perPair;
            }
          }
        }
      }
    }
  }

  // Wolf: same logic but teams vary per hole
  if (trip?.wolf_tee_order) {
    const pars = Array.from({ length: 18 }, (_, h) => getPar(1, h));
    const netScores = PLAYERS.map((_, p) => getPlayerNetScores(1, p));
    const grossScores = PLAYERS.map((_, p) => getPlayerRoundScores(1, p));
    const girPlayers = Array.from({ length: 18 }, (_, h) => getHoleExtra(1, h)?.closest_gir_player ?? null);
    const wolfPartners = Array.from({ length: 18 }, (_, h) => getHoleExtra(1, h)?.wolf_partner ?? null);
    const wolfSpits = Array.from({ length: 18 }, (_, h) => getHoleExtra(1, h)?.wolf_spit ?? false);
    const pressMults = Array.from({ length: 18 }, (_, h) => { const e = getHoleExtra(1, h); return (e?.double_pressed ? 4 : e?.pressed ? 2 : 1); });
    const result = calcWolfRound(netScores, grossScores, trip.wolf_tee_order, wolfPartners, wolfSpits, pars, girPlayers);
    const bet = getBetAmount(1);

    for (let h = 0; h < 18; h++) {
      const hr = result.holeResults[h];
      const mult = pressMults[h];
      const diff = hr.wolfTeamPoints - hr.otherTeamPoints;
      const perPair = Math.abs(diff) * bet * mult;
      if (diff > 0) {
        for (const w of hr.wolfTeam) {
          for (const o of hr.otherTeam) {
            ledger[w][o] += perPair;
          }
        }
      } else if (diff < 0) {
        for (const o of hr.otherTeam) {
          for (const w of hr.wolfTeam) {
            ledger[o][w] += perPair;
          }
        }
      }
    }
  }

  // Scramble: per-hole, losing team owes winning team
  for (let h = 0; h < 18; h++) {
    const g0 = getScrambleScore(h, 0);
    const g1 = getScrambleScore(h, 1);
    if (g0 === null || g1 === null) continue;
    const net0 = scrambleNetScore(g0, scrambleTeamHcps[0], h, holeHcps[3])!;
    const net1 = scrambleNetScore(g1, scrambleTeamHcps[1], h, holeHcps[3])!;
    if (net0 < net1) {
      for (const w of scrambleTeams[0]) {
        for (const l of scrambleTeams[1]) {
          ledger[w][l] += scrambleBet;
        }
      }
    } else if (net1 < net0) {
      for (const w of scrambleTeams[1]) {
        for (const l of scrambleTeams[0]) {
          ledger[w][l] += scrambleBet;
        }
      }
    }
  }

  // CTP into ledger: each CTP win, the other 3 each owe the winner $5 * (1 + carries)
  {
    let carry = 0;
    for (let r = 0; r < 4; r++) {
      const rPars = Array.from({ length: 18 }, (_, h) => getPar(r, h));
      const par3s = getPar3Holes(rPars);
      par3s.forEach(h => {
        const winner = getHoleExtra(r, h)?.ctp_winner;
        if (winner !== null && winner !== undefined) {
          const perLoser = (1 + carry) * CTP_BET;
          for (let p = 0; p < 4; p++) {
            if (p !== winner) ledger[winner][p] += perLoser;
          }
          carry = 0;
        } else {
          carry++;
        }
      });
    }
  }

  // Net the ledger: netOwed[i][j] = net amount j owes i
  const netOwed: number[][] = Array.from({ length: 4 }, () => Array(4).fill(0));
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const net = ledger[i][j] - ledger[j][i];
      if (net > 0) {
        netOwed[i][j] = net; // j owes i
      } else if (net < 0) {
        netOwed[j][i] = -net; // i owes j
      }
    }
  }

  // Build settlement list
  const settlements: { from: number; to: number; amount: number }[] = [];
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      if (netOwed[i][j] > 0) {
        settlements.push({ from: j, to: i, amount: netOwed[i][j] });
      } else if (netOwed[j][i] > 0) {
        settlements.push({ from: i, to: j, amount: netOwed[j][i] });
      }
    }
  }

  const hasAnyDollars = settlements.some(s => s.amount > 0);

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="text-center">
        <h2 className="font-serif text-2xl text-gold font-bold">Leaderboard</h2>
        <p className="text-cream-dim text-sm">72-Hole Weekend Summary</p>
      </div>

      {/* Weekend Champion */}
      <div className="bg-green-card rounded-xl border-2 border-gold p-4 text-center">
        <p className="text-gold text-xs uppercase tracking-wider mb-1">Weekend Champion</p>
        <div className="flex items-center justify-center gap-2">
          <span className="text-3xl">{'\uD83D\uDC51'}</span>
          <span className="font-serif text-3xl font-bold text-gold">
            {totalStableford.every(s => s === 0) ? 'TBD' : players[totalStableford.indexOf(maxStableford)] ?? PLAYERS[totalStableford.indexOf(maxStableford)]}
          </span>
        </div>
        {maxStableford > 0 && <p className="text-cream-dim text-sm mt-1">{maxStableford} Stableford pts</p>}
      </div>

      {/* Settlement */}
      {hasAnyDollars && (
        <div className="bg-green-card rounded-xl border-2 border-gold/40 p-4">
          <h3 className="text-xs text-gold font-medium mb-3 uppercase tracking-wider">Settle Up</h3>
          <div className="space-y-2">
            {settlements.filter(s => s.amount > 0.01).map((s, i) => (
              <div key={i} className="flex items-center justify-between bg-green-deeper/50 rounded-lg p-3">
                <div className="text-sm">
                  <span className="text-red-400 font-medium">{players[s.from] ?? PLAYERS[s.from]}</span>
                  <span className="text-cream-dim mx-2">pays</span>
                  <span className="text-green-400 font-medium">{players[s.to] ?? PLAYERS[s.to]}</span>
                </div>
                <span className="text-gold font-bold text-lg">${s.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
          {/* Net per player */}
          <div className="mt-3 pt-2 border-t border-gold/20">
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {PLAYERS.map((name, p) => {
                let netVal = 0;
                for (let j = 0; j < 4; j++) {
                  if (j === p) continue;
                  netVal += (netOwed[p][j] || 0) - (netOwed[j][p] || 0);
                }
                return (
                  <div key={p} className="bg-green-deeper/50 rounded-lg py-2">
                    <div className="text-cream-dim mb-0.5">{players[p]?.[0] ?? name[0]}</div>
                    <div className={`font-bold ${netVal > 0 ? 'text-green-400' : netVal < 0 ? 'text-red-400' : 'text-cream-dim/50'}`}>
                      {netVal > 0 ? '+' : ''}{netVal === 0 ? '-' : `$${netVal.toFixed(2)}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Stableford */}
      <div className="bg-green-card rounded-xl border border-gold/20 p-4">
        <h3 className="text-xs text-gold font-medium mb-3 uppercase tracking-wider inline-flex items-center">Stableford Points<StablefordInfo /></h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-center">
            <thead>
              <tr className="border-b border-gold/20">
                <th className="py-2 text-left text-cream-dim text-xs">Player</th>
                {['R1', 'R2', 'R3', 'R4'].map(r => <th key={r} className="py-2 text-cream-dim text-xs">{r}</th>)}
                <th className="py-2 text-gold text-xs">Tot</th>
              </tr>
            </thead>
            <tbody>
              {PLAYERS.map((name, p) => (
                <tr key={p} className="border-b border-gold/10">
                  <td className="py-2 text-left text-cream font-medium text-xs">{players[p] ?? name}</td>
                  {[0, 1, 2, 3].map(r => (
                    <td key={r} className={`py-2 text-xs ${roundWinners[r] === p ? 'text-gold font-bold' : 'text-cream'}`}>
                      {stablefordByRound[p][r]}
                    </td>
                  ))}
                  <td className={`py-2 text-xs font-bold ${totalStableford[p] === maxStableford && maxStableford > 0 ? 'text-gold' : 'text-cream'}`}>
                    {totalStableford[p]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scotch Points */}
      <div className="bg-green-card rounded-xl border border-gold/20 p-4">
        <h3 className="text-xs text-gold font-medium mb-3 uppercase tracking-wider inline-flex items-center">6-6-6 Scotch (R1 + R3)<ScotchInfo /></h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          {PLAYERS.map((name, p) => (
            <div key={p} className="bg-green-deeper/50 rounded-lg py-3">
              <div className="text-cream-dim text-xs mb-1">{players[p] ?? name}</div>
              <div className={`text-xl font-bold ${scotchPlayerPoints[p] > 0 ? 'text-gold' : 'text-cream-dim/50'}`}>
                {scotchPlayerPoints[p]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Wolf Points */}
      <div className="bg-green-card rounded-xl border border-gold/20 p-4">
        <h3 className="text-xs text-gold font-medium mb-3 uppercase tracking-wider inline-flex items-center">Wolf (R2)<WolfInfo /></h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          {PLAYERS.map((name, p) => (
            <div key={p} className="bg-green-deeper/50 rounded-lg py-3">
              <div className="text-cream-dim text-xs mb-1">{players[p] ?? name}</div>
              <div className={`text-xl font-bold ${wolfPlayerPoints[p] > 0 ? 'text-gold' : 'text-cream-dim/50'}`}>
                {wolfPlayerPoints[p]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scramble */}
      <div className="bg-green-card rounded-xl border border-gold/20 p-4">
        <h3 className="text-xs text-gold font-medium mb-3 uppercase tracking-wider inline-flex items-center">Scramble (R4: Dye)<ScrambleInfo /></h3>
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map(t => (
            <div key={t} className={`rounded-lg p-3 text-center ${t === 0 ? 'bg-yellow-900/10 border border-yellow-400/20' : 'bg-blue-900/10 border border-blue-400/20'}`}>
              <div className={`text-xs mb-1 ${t === 0 ? 'text-yellow-400' : 'text-blue-400'}`}>{teamName(scrambleTeams[t])}</div>
              <div className="text-xl font-bold text-cream">{scrambleTotals[t].count > 0 ? scrambleTotals[t].net : '-'}</div>
              {scrambleTotals[t].count > 0 && <div className="text-[10px] text-cream-dim">Gross: {scrambleTotals[t].gross}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* CTP Leaderboard */}
      <div className="bg-green-card rounded-xl border border-gold/20 p-4">
        <h3 className="text-xs text-gold font-medium mb-3 uppercase tracking-wider inline-flex items-center">Closest to Pin (Par 3s) {'\u00B7'} $5/hole<CtpInfo /></h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          {PLAYERS.map((name, p) => (
            <div key={p} className="bg-green-deeper/50 rounded-lg py-3">
              <div className="text-cream-dim text-xs mb-1">{players[p] ?? name}</div>
              <div className={`text-xl font-bold ${ctpWins[p] > 0 ? 'text-gold' : 'text-cream-dim/50'}`}>
                {ctpWins[p]}
              </div>
              <div className={`text-[10px] ${ctpDollars[p] > 0 ? 'text-green-400' : ctpDollars[p] < 0 ? 'text-red-400' : 'text-cream-dim/50'}`}>
                {ctpDollars[p] !== 0 ? `${ctpDollars[p] > 0 ? '+' : ''}$${ctpDollars[p].toFixed(2)}` : '-'}
              </div>
            </div>
          ))}
        </div>
        {ctpCarry > 0 && (
          <p className="text-cream-dim/60 text-xs text-center mt-2">{ctpCarry} CTP{ctpCarry !== 1 ? 's' : ''} carrying (${(ctpCarry * CTP_BET).toFixed(0)} pot on next par 3)</p>
        )}
      </div>

      {/* Total Strokes */}
      <div className="bg-green-card rounded-xl border border-gold/20 p-4">
        <h3 className="text-xs text-gold font-medium mb-3 uppercase tracking-wider">Total Gross Strokes</h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          {PLAYERS.map((name, p) => {
            const diff = totalStrokes[p].total - totalStrokes[p].par;
            return (
              <div key={p} className="bg-green-deeper/50 rounded-lg py-3">
                <div className="text-cream-dim text-xs mb-1">{players[p] ?? name}</div>
                <div className="text-xl font-bold text-cream">{totalStrokes[p].count > 0 ? totalStrokes[p].total : '-'}</div>
                {totalStrokes[p].count > 0 && (
                  <div className={`text-xs mt-0.5 ${diff > 0 ? 'text-red-400' : diff < 0 ? 'text-green-400' : 'text-cream-dim'}`}>
                    {diff > 0 ? '+' : ''}{diff}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Reset */}
      {isCommissioner && (
        <div className="pt-12 pb-4">
          {!showReset ? (
            <button onClick={() => setShowReset(true)} className="w-full text-center text-cream-dim/30 text-xs py-2">
              Reset Trip
            </button>
          ) : (
            <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-4 text-center space-y-3">
              <p className="text-red-400 font-medium text-sm">Delete this trip and all scores?</p>
              <p className="text-cream-dim/60 text-xs">This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowReset(false)} className="flex-1 py-2.5 bg-green-card border border-gold/20 rounded-lg text-cream-dim text-sm active:scale-95">Cancel</button>
                <button onClick={resetTrip} className="flex-1 py-2.5 bg-red-600 rounded-lg text-white font-medium text-sm active:scale-95">Yes, Reset Everything</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
