'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Agency, WordCountData, CorrectionsByAgencyData, DEIFootprintData, BureaucracyData, AgencyHierarchyData } from '@/types/data';
import { fetchWordCountData, fetchCorrectionsData, fetchDEIFootprintData, fetchBureaucracyData, fetchAgencyHierarchyData } from '@/utils/data';
import AgencyOverviewCard from '@/components/AgencyOverviewCard';
import WordCountChart from '@/components/WordCountChart';
import CorrectionsTimeSeries from '@/components/CorrectionsTimeSeries';
import SubAgenciesList from '@/components/SubAgenciesList';
import RegulationsList from '@/components/RegulationsList';

export default function AgencyDetailPage() {
    const params = useParams();
    const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [wordCountData, setWordCountData] = useState<WordCountData | null>(null);
    const [correctionsData, setCorrectionsData] = useState<CorrectionsByAgencyData | null>(null);
    const [deiData, setDeiData] = useState<DEIFootprintData | null>(null);
    const [bureaucracyData, setBureaucracyData] = useState<BureaucracyData | null>(null);
    const [hierarchyData, setHierarchyData] = useState<AgencyHierarchyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                setError(null);

                const [wordCount, corrections, dei, bureaucracy, hierarchy] = await Promise.all([
                    fetchWordCountData(),
                    fetchCorrectionsData(),
                    fetchDEIFootprintData(),
                    fetchBureaucracyData(),
                    fetchAgencyHierarchyData()
                ]);

                if (!hierarchy || !hierarchy.agencies) {
                    throw new Error('Invalid agency hierarchy data received');
                }

                setWordCountData(wordCount);
                setCorrectionsData(corrections);
                setDeiData(dei);
                setBureaucracyData(bureaucracy);
                setAgencies(hierarchy.agencies);
                setHierarchyData(hierarchy);

                // If we have a slug in the URL, find and set that agency
                const slug = params.slug as string;
                if (slug) {
                    const agency = hierarchy.agencies.find(a => a.slug === slug);
                    if (agency) {
                        setSelectedAgency(agency);
                    }
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to load agency data';
                console.error('Error loading agency data:', errorMessage);
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [params.slug]);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-4 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="text-red-600 mb-4">Error loading agency data</div>
                <div className="text-sm text-gray-600">{error}</div>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-blue-900">
                        {selectedAgency ? selectedAgency.name : 'All Agencies'}
                    </h1>
                    <select
                        value={selectedAgency?.slug || ''}
                        onChange={(e) => {
                            const agency = agencies.find(a => a.slug === e.target.value);
                            setSelectedAgency(agency || null);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">All Agencies</option>
                        {agencies.map(agency => (
                            <option key={agency.slug} value={agency.slug}>
                                {agency.name}
                            </option>
                        ))}
                    </select>
                </div>

                <AgencyOverviewCard
                    agency={selectedAgency}
                    wordCountData={wordCountData}
                    correctionsData={correctionsData}
                    deiData={deiData}
                    bureaucracyData={bureaucracyData}
                    hierarchyData={hierarchyData}
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    <WordCountChart
                        agency={selectedAgency}
                        wordCountData={wordCountData}
                    />
                    <CorrectionsTimeSeries
                        agency={selectedAgency}
                        correctionsData={correctionsData}
                    />
                </div>

                {selectedAgency && (
                    <>
                        <SubAgenciesList
                            agency={selectedAgency}
                            wordCountData={wordCountData}
                            correctionsData={correctionsData}
                            deiData={deiData}
                            bureaucracyData={bureaucracyData}
                        />
                        <RegulationsList
                            agency={selectedAgency}
                            wordCountData={wordCountData}
                        />
                    </>
                )}
            </div>
        </div>
    );
} 