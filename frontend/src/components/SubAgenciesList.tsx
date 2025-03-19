'use client';

import { Agency, WordCountData, CorrectionsData, DEIFootprintData, BureaucracyData } from '@/types/data';
import AgencyCard from './AgencyCard';

interface SubAgenciesListProps {
    agency: Agency | null;
    wordCountData: WordCountData | null;
    correctionsData: CorrectionsData | null;
    deiData: DEIFootprintData | null;
    bureaucracyData: BureaucracyData | null;
}

export default function SubAgenciesList({ agency, wordCountData, correctionsData, deiData, bureaucracyData }: SubAgenciesListProps) {
    if (!agency || !agency.children || agency.children.length === 0) {
        return null;
    }

    return (
        <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Children</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agency.children.map(child => {
                    const wordCount = wordCountData?.agencies[child.slug]?.total || 0;
                    const corrections = correctionsData?.agencies[child.slug]?.total || 0;
                    const deiMentions = deiData?.agencies[child.slug]?.total || 0;
                    const bureaucracyMentions = bureaucracyData?.agencies[child.slug]?.total || 0;

                    return (
                        <AgencyCard
                            key={child.slug}
                            agency={child}
                            wordCount={wordCount}
                            corrections={corrections}
                            deiMentions={deiMentions}
                            bureaucracyMentions={bureaucracyMentions}
                        />
                    );
                })}
            </div>
        </div>
    );
} 