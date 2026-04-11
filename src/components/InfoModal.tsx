'use client';

import { useState } from 'react';

interface InfoModalProps {
  title: string;
  children: React.ReactNode;
}

export default function InfoModal({ title, children }: InfoModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full border border-gold/40 text-gold/60 text-[10px] leading-none hover:bg-gold/10 transition-colors"
        aria-label={`Learn about ${title}`}
      >
        i
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg bg-green-card border-t border-gold/30 rounded-t-2xl p-5 pb-8 max-h-[80vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-cream-dim/30" />
            </div>
            <h2 className="font-serif text-xl text-gold font-bold mb-4">{title}</h2>
            <div className="text-cream text-sm leading-relaxed space-y-3">
              {children}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="mt-6 w-full py-3 bg-gold/20 border border-gold/30 rounded-xl text-gold font-medium text-sm transition-all active:scale-95"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function ScotchInfo() {
  return (
    <InfoModal title="6-6-6 Scotch">
      <p>Teams rotate every 6 holes so everyone partners with everyone. All 3 possible 2v2 pairings are used, one per 6-hole segment.</p>
      <p><strong className="text-gold">On each hole, up to 6 points are at stake:</strong></p>
      <div className="bg-green-deeper/50 rounded-lg p-3 space-y-2">
        <p><strong className="text-gold">2 pts - Low Individual NET:</strong> The player with the lowest net score wins 2 points for their team. If tied across teams, no points awarded.</p>
        <p><strong className="text-gold">2 pts - Low Team Total:</strong> Add both teammates' net scores. Lower combined total wins 2 points. Ties = no points.</p>
        <p><strong className="text-gold">1 pt - Closest GIR:</strong> Among players who hit the green in regulation, the one closest to the pin wins 1 point for their team. If nobody hits GIR, no point.</p>
        <p><strong className="text-gold">1 pt - Natural Birdie:</strong> If any player on a team makes a <strong>natural</strong> birdie (gross score under par, not net), their team gets 1 point. A "4-for-3" after a handicap stroke does NOT count. Both teams can earn this point.</p>
      </div>
      <p><strong className="text-cream">Sweep + Natural Birdie Bonus:</strong> If one team sweeps all 6 points AND has a natural birdie, the total doubles to <strong className="text-gold">12 points</strong> for that hole. Without a natural birdie, the maximum is 5 points (the sweep alone doesn't trigger the double).</p>
      <p>Rounds 1 (Fazio) and 3 (Norman) both use the same team rotation order.</p>
    </InfoModal>
  );
}

export function WolfInfo() {
  return (
    <InfoModal title="Wolf">
      <p>Wolf uses the <strong className="text-gold">same 6-point scoring system</strong> as Scotch (low individual, low team total, closest GIR, birdie, sweep bonus), but teams are decided hole by hole.</p>
      <p><strong className="text-gold">How it works:</strong></p>
      <div className="bg-green-deeper/50 rounded-lg p-3 space-y-2">
        <p><strong className="text-cream">Wolf Rotation:</strong> The Wolf rotates each hole in a fixed order (set during setup): 1-2-3-4-1-2-3-4...</p>
        <p><strong className="text-cream">Tee Shots:</strong> The Wolf tees off FIRST. Then the other 3 players hit in order.</p>
        <p><strong className="text-cream">Picking:</strong> After EACH player's tee shot, the Wolf can claim that player as their partner. You must decide before the next player tees off. Once you pass, you can't go back.</p>
        <p><strong className="text-cream">Lone Wolf:</strong> If the Wolf passes on all 3, they go alone (1 vs 3). All points on the hole are <strong className="text-gold">DOUBLED</strong> (12 available instead of 6).</p>
        <p><strong className="text-cream">Spit:</strong> A picked player can decline ("spit"), going solo against the other 3 with doubled points.</p>
      </div>
      <p>Track individual point totals across all 18 holes. The strategy is in reading the tee shots and knowing when to pick vs. go lone wolf.</p>
    </InfoModal>
  );
}

export function ScrambleInfo() {
  return (
    <InfoModal title="2-Man Scramble">
      <p>Teams are set by Stableford standings after 3 rounds: <strong className="text-gold">1st + 4th vs 2nd + 3rd</strong>. This balances the teams for the final round.</p>
      <p><strong className="text-cream">How it plays:</strong> Both players hit every shot. Pick the best ball. Both play from that spot. Repeat until holed out. Record one score per team per hole.</p>
      <p><strong className="text-gold">Scramble Handicap:</strong> 35% of the lower course handicap + 15% of the higher. Strokes are applied to the team score using Dye's hole handicap rankings.</p>
      <p>Lowest net team score wins. Both players on a team share the same score for Stableford purposes that round.</p>
    </InfoModal>
  );
}

export function StablefordInfo() {
  return (
    <InfoModal title="Stableford">
      <p>Stableford is an individual points system that runs across <strong className="text-gold">all 72 holes</strong> using NET scores. The highest total crowns the Weekend Champion and determines R4 scramble teams.</p>
      <div className="bg-green-deeper/50 rounded-lg p-3">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-gold/10">
              <td className="py-1.5 text-orange-400 font-medium">Eagle or better</td>
              <td className="py-1.5 text-right font-bold text-gold">5 pts</td>
            </tr>
            <tr className="border-b border-gold/10">
              <td className="py-1.5 text-yellow-400 font-medium">Birdie</td>
              <td className="py-1.5 text-right font-bold text-gold">3 pts</td>
            </tr>
            <tr className="border-b border-gold/10">
              <td className="py-1.5 text-cream font-medium">Par</td>
              <td className="py-1.5 text-right font-bold">2 pts</td>
            </tr>
            <tr className="border-b border-gold/10">
              <td className="py-1.5 text-blue-400 font-medium">Bogey</td>
              <td className="py-1.5 text-right font-bold">1 pt</td>
            </tr>
            <tr>
              <td className="py-1.5 text-red-400 font-medium">Double bogey+</td>
              <td className="py-1.5 text-right font-bold">0 pts</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>All scores use net (after handicap strokes). For the scramble round, both teammates share the team's net score for Stableford.</p>
      <p><strong className="text-cream">Benchmark:</strong> 144 points = par on every hole. Birdies push you above, bogeys pull you below.</p>
    </InfoModal>
  );
}

export function CtpInfo() {
  return (
    <InfoModal title="Closest to Pin">
      <p>A side contest tracked on every <strong className="text-gold">par 3</strong> across all 4 rounds.</p>
      <p>On each par 3, whichever player hits their tee shot closest to the pin wins that hole's CTP. Simple count of wins determines the CTP champion.</p>
      <p>This is <strong className="text-cream">separate</strong> from the "Closest GIR" point in Scotch/Wolf, which can be won on any hole. CTP is only on par 3s and is an independent side game.</p>
    </InfoModal>
  );
}
