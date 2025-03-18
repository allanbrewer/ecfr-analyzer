'use client';

import OverviewCard from '@/components/OverviewCard';
import AgencyCardsContainer from '@/components/AgencyCardsContainer';

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-blue-900">ECFR Analysis Dashboard</h1>
        <div className="h-1 w-24 bg-red-600 rounded-full"></div>
      </div>
      <OverviewCard />
      <AgencyCardsContainer />
    </div>
  );
}
