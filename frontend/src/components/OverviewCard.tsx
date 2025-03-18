'use client';

import { useEffect, useState } from 'react';
import { fetchWordCountData, fetchCorrectionsData, fetchAgencyHierarchyData } from '@/utils/data';
import { WordCountData, CorrectionsData, AgencyHierarchyData } from '@/types/data';

export default function OverviewCard() {
    const [wordCountData, setWordCountData] = useState<WordCountData | null>(null);
    const [correctionsData, setCorrectionsData] = useState<CorrectionsData | null>(null);
    const [hierarchyData, setHierarchyData] = useState<AgencyHierarchyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                setError(null);

                console.log('Starting to load overview data...');
                const [wordCount, corrections, hierarchy] = await Promise.all([
                    fetchWordCountData(),
                    fetchCorrectionsData(),
                    fetchAgencyHierarchyData()
                ]);

                console.log('Data loaded successfully');
                setWordCountData(wordCount);
                setCorrectionsData(corrections);
                setHierarchyData(hierarchy);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to load overview data';
                console.error('Error loading overview data:', errorMessage);
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, []);

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-24 bg-gray-200 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="text-red-600 mb-4">Error loading overview data</div>
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

    // Calculate metrics
    const totalWords = wordCountData?.total_word_count || 0;
    const totalCorrections = correctionsData?.total_corrections || 0;
    const parentAgencies = hierarchyData?.agencies.length || 0;
    const childAgencies = hierarchyData?.agencies.reduce(
        (acc, agency) => acc + (agency.children?.length || 0),
        0
    ) || 0;

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-blue-900 mb-6">ECFR Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm text-blue-600 font-medium mb-1">Total Words</div>
                    <div className="text-2xl font-bold text-blue-900">
                        {totalWords.toLocaleString()}
                    </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                    <div className="text-sm text-red-600 font-medium mb-1">Total Corrections</div>
                    <div className="text-2xl font-bold text-red-900">
                        {totalCorrections.toLocaleString()}
                    </div>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg">
                    <div className="text-sm text-indigo-600 font-medium mb-1">Parent Agencies</div>
                    <div className="text-2xl font-bold text-indigo-900">
                        {parentAgencies.toLocaleString()}
                    </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-sm text-purple-600 font-medium mb-1">Sub-Agencies</div>
                    <div className="text-2xl font-bold text-purple-900">
                        {childAgencies.toLocaleString()}
                    </div>
                </div>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="text-sm text-gray-500">
                    Last updated: {new Date(wordCountData?.timestamp || '').toLocaleString()}
                </div>
            </div>
        </div>
    );
} 