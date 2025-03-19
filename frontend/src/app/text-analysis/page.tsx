'use client';

import { useState, useEffect } from 'react';
import { DEIFootprintData, BureaucracyData, AgencyHierarchyData, WordCountData } from '@/types/data';
import { fetchDEIFootprintData, fetchBureaucracyData, fetchAgencyHierarchyData, fetchWordCountData } from '@/utils/data';
import TextAnalysisContent from '@/components/TextAnalysisContent';

export default function TextAnalysisPage() {
    const [deiData, setDeiData] = useState<DEIFootprintData | null>(null);
    const [bureaucracyData, setBureaucracyData] = useState<BureaucracyData | null>(null);
    const [hierarchyData, setHierarchyData] = useState<AgencyHierarchyData | null>(null);
    const [wordCountData, setWordCountData] = useState<WordCountData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                setError(null);

                const [dei, bureaucracy, hierarchy, wordCount] = await Promise.all([
                    fetchDEIFootprintData(),
                    fetchBureaucracyData(),
                    fetchAgencyHierarchyData(),
                    fetchWordCountData()
                ]);

                setDeiData(dei);
                setBureaucracyData(bureaucracy);
                setHierarchyData(hierarchy);
                setWordCountData(wordCount);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to load analysis data';
                console.error('Error loading analysis data:', errorMessage);
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, []);

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {[...Array(2)].map((_, i) => (
                            <div key={i} className="bg-white p-6 rounded-lg shadow">
                                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                                <div className="space-y-3">
                                    {[...Array(3)].map((_, j) => (
                                        <div key={j} className="h-4 bg-gray-200 rounded"></div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="text-red-600 mb-4">Error loading analysis data</div>
                    <div className="text-sm text-gray-600">{error}</div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Text Analysis</h1>
            <TextAnalysisContent
                deiData={deiData}
                bureaucracyData={bureaucracyData}
                hierarchyData={hierarchyData}
                wordCountData={wordCountData}
            />
        </div>
    );
} 