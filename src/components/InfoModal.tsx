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
            {/* Handle bar */}
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

export function BestBallInfo() {
  return (
    <InfoModal title="Best Ball">
      <p>Best Ball is a 2-person team format. On every hole, both teammates play their own ball, and the team takes the <strong className="text-gold">lower score</strong> of the two.</p>
      <p>For example, if Derek makes a 4 and Pat makes a 5, the team score for that hole is 4.</p>
      <p>This format rewards aggressive play. If your partner is safely on the green, you can take risks knowing their score is the safety net. One great shot from either player is all you need.</p>
      <p>In Rounds 1-3, you're paired with a different partner each round so everyone teams up with everyone exactly once. The team best-ball scores are used to determine Nassau results.</p>
    </InfoModal>
  );
}

export function NassauInfo() {
  return (
    <InfoModal title="Nassau">
      <p>The Nassau is the most classic golf betting format. It breaks each round into <strong className="text-gold">three separate competitions</strong>:</p>
      <div className="bg-green-deeper/50 rounded-lg p-3 space-y-2">
        <p><strong className="text-gold">Front 9:</strong> Which team wins more holes on holes 1-9?</p>
        <p><strong className="text-gold">Back 9:</strong> Which team wins more holes on holes 10-18?</p>
        <p><strong className="text-gold">Overall 18:</strong> Which team wins more holes across the full round?</p>
      </div>
      <p>That's 3 points at stake per round, and 9 points total across Rounds 1-3.</p>
      <p><strong className="text-cream">How holes are won:</strong> On each hole, compare the two teams' best-ball scores. The lower best-ball score wins the hole. If they tie, nobody wins that hole.</p>
      <p><strong className="text-cream">How each Nassau is decided:</strong> Count up hole wins for each team across the 9 (or 18) holes. The team with more hole wins takes the point. If the hole-win count is tied, no point is awarded.</p>
      <p><strong className="text-cream">Example:</strong> On the front 9, Team A wins 3 holes, Team B wins 2 holes, and 4 holes are tied. Team A takes the Front 9 Nassau point.</p>
    </InfoModal>
  );
}

export function SkinsInfo() {
  return (
    <InfoModal title="Skins">
      <p>Skins is an individual game played in Round 4. Every hole is worth one "skin" and the <strong className="text-gold">lowest score on the hole wins it</strong>.</p>
      <p><strong className="text-cream">The catch:</strong> If two or more players tie for the lowest score, nobody wins. The skin <strong className="text-gold">carries over</strong> to the next hole, making it worth 2. If that hole also ties, it carries again (now worth 3), and so on.</p>
      <p>This means late-round holes can become extremely valuable if skins have been carrying.</p>
      <div className="bg-green-deeper/50 rounded-lg p-3 space-y-2">
        <p><strong className="text-cream">Hole 1:</strong> Derek 4, Pat 4, Joey 5, Matt 5. Derek and Pat tie. Skin carries. (1 carrying)</p>
        <p><strong className="text-cream">Hole 2:</strong> Derek 3, Pat 4, Joey 4, Matt 4. Derek wins with a 3. Derek gets 2 skins (the carry + this hole).</p>
        <p><strong className="text-cream">Hole 3:</strong> Fresh start, 1 skin at stake again.</p>
      </div>
      <p>Any unclaimed skins at the end of the round are lost (they don't roll over). The player with the most skins wins.</p>
    </InfoModal>
  );
}

export function StablefordInfo() {
  return (
    <InfoModal title="Stableford">
      <p>Stableford is an individual points system that runs across <strong className="text-gold">all 72 holes</strong> of the trip. The highest point total crowns the Weekend Champion.</p>
      <p>Instead of counting total strokes (where one terrible hole can ruin your round), Stableford converts each hole into points based on your score relative to par:</p>
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
              <td className="py-1.5 text-red-400 font-medium">Double bogey or worse</td>
              <td className="py-1.5 text-right font-bold">0 pts</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p><strong className="text-cream">Why Stableford is great:</strong> A blow-up hole (triple bogey, lost ball, 8 on a par 3) only costs you 0 points instead of adding 4+ strokes to your total. It limits the damage and rewards aggressive play. A birdie is worth more than a bogey costs you.</p>
      <p><strong className="text-cream">Perfect round benchmark:</strong> If you parred every hole across all 4 rounds, you'd have 144 points (72 holes x 2 pts). Every birdie pushes you above that, every bogey drops you below it.</p>
    </InfoModal>
  );
}
