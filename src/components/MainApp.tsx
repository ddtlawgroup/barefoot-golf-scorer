'use client';

import { useState } from 'react';
import { useTripContext } from '@/lib/context';
import PlayerSelect from './PlayerSelect';
import SetupScreen from './SetupScreen';
import ScotchRound from './ScotchRound';
import WolfRound from './WolfRound';
import ScrambleRound from './ScrambleRound';
import Summary from './Summary';

type Tab = 'r0' | 'r1' | 'r2' | 'r3' | 'summary';

const TABS: { key: Tab; label: string; sub: string }[] = [
  { key: 'r0', label: 'R1', sub: 'Scotch' },
  { key: 'r1', label: 'R2', sub: 'Wolf' },
  { key: 'r2', label: 'R3', sub: 'Scotch' },
  { key: 'r3', label: 'R4', sub: 'Scramble' },
  { key: 'summary', label: '\u2211', sub: 'Summary' },
];

export default function MainApp() {
  const { currentPlayer, trip } = useTripContext();
  const [activeTab, setActiveTab] = useState<Tab>('r0');

  if (!currentPlayer) return <PlayerSelect />;
  if (!trip || trip.status === 'setup') return <SetupScreen />;

  const renderContent = () => {
    switch (activeTab) {
      case 'r0': return <ScotchRound round={0} />;
      case 'r1': return <WolfRound />;
      case 'r2': return <ScotchRound round={2} />;
      case 'r3': return <ScrambleRound />;
      case 'summary': return <Summary />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 bg-green-deeper/95 backdrop-blur-sm border-b border-gold/20">
        <div className="flex items-center justify-between px-4 py-2">
          <h1 className="font-serif text-lg text-gold font-bold">Barefoot</h1>
          <span className="text-cream-dim text-xs">{currentPlayer}</span>
        </div>
        <nav className="flex overflow-x-auto scrollbar-hide">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 min-w-0 py-2 text-center border-b-2 transition-colors whitespace-nowrap px-1 ${
                activeTab === tab.key ? 'border-gold text-gold' : 'border-transparent text-cream-dim hover:text-cream'
              }`}
            >
              <div className="text-xs font-medium">{tab.label}</div>
              <div className="text-[9px] opacity-70">{tab.sub}</div>
            </button>
          ))}
        </nav>
      </header>
      <main className="flex-1 pb-8">{renderContent()}</main>
    </div>
  );
}
