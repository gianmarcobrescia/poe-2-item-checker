'use client';
import React, { useState } from 'react';
import ItemChecker from '@/app/components/ItemChecker';
import LeagueSelector from '@/app/components/LeagueSelector';

export default function Home() {
  const [selectedLeague, setSelectedLeague] = useState('Dawn of the Hunt');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-slate-900 p-8">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20" />

      <main className="relative max-w-2xl mx-auto space-y-8">
        <LeagueSelector
          selectedLeague={selectedLeague}
          onLeagueChange={setSelectedLeague}
        />

        <ItemChecker league={selectedLeague} />

      </main>
    </div>
  );
}
