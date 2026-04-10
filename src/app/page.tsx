'use client';

import { TripProvider } from '@/lib/context';
import MainApp from '@/components/MainApp';

export default function Home() {
  return (
    <TripProvider>
      <MainApp />
    </TripProvider>
  );
}
