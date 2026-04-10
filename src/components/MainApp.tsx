'use client';

import { useState } from 'react';
import { useTripContext } from '@/lib/context';
import { ROUND_LABELS } from '@/lib/types';
import PlayerSelect from './PlayerSelect';
import SetupScreen from './SetupScreen';
import RoundView from './RoundView';
import Summary from './Summary';

type Tab = 'r0' | 'r1' | 'r2' | 'r3' | 'summary';

const TABS: { key: Tab; label: string }[] = [
  { key: 'r0', label: 'R1' },
  { key: 'r1', label: 'R2' },
  { key: 'r2', label: 'R3' },
  { key: 'r3', label: 'R4' },
  { key: 'summary', label: 'Summary' },
];

export default function MainApp() {
  const { currentPlayer, trip, loading } = useTripContext();
  const [activeTab, setActiveTab] = useState<Tab>('r0');

  // Not logged in
  if (!currentPlayer) {
    return <PlayerSelect />;
  }

  // No trip or trip in setup
  if (!trip || trip.status === 'setup') {
    return <SetupScreen />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-green-deeper/95 backdrop-blur-sm border-b border-gold/20">
        <div className="flex items-center justify-between px-4 py-2">
          <h1 className="font-serif text-lg text-gold font-bold">Barefoot</h1>
          <span className="text-cream-dim text-xs">{currentPlayer}</span>
        </div>

        {/* Tab Nav */}
        <nav className="flex overflow-x-auto scrollbar-hide">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 min-w-0 py-2.5 text-xs font-medium text-center border-b-2 transition-colors whitespace-nowrap px-2 ${
                activeTab === tab.key
                  ? 'border-gold text-gold'
                  : 'border-transparent text-cream-dim hover:text-cream'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Content */}
      <main className="flex-1 pb-8">
        {activeTab === 'summary' ? (
          <Summary />
        ) : (
          <RoundView round={parseInt(activeTab.replace('r', ''))} />
        )}
      </main>
    </div>
  );
}
