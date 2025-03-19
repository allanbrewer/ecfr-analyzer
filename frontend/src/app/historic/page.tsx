'use client';

import { useState, useEffect } from 'react';
import { CorrectionsData, AgencyHierarchyData } from '@/types/data';
import { fetchCorrectionsData, fetchAgencyHierarchyData } from '@/utils/data';
import HistoricCorrectionsList from '@/components/HistoricCorrectionsList';
import SearchFilters from '@/components/SearchFilters';

export default function HistoricCorrectionsPage() {
    const [correctionsData, setCorrectionsData] = useState<CorrectionsData | null>(null);
    const [hierarchyData, setHierarchyData] = useState<AgencyHierarchyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        year: '',
        title: '',
        agency: ''
    });

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                setError(null);

                const [corrections, hierarchy] = await Promise.all([
                    fetchCorrectionsData(),
                    fetchAgencyHierarchyData()
                ]);

                setCorrectionsData(corrections);
                setHierarchyData(hierarchy);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to load corrections data';
                console.error('Error loading corrections data:', errorMessage);
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, []);

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
                <div className="text-red-600 mb-4">Error loading corrections data</div>
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
                <h1 className="text-2xl font-bold text-blue-900 mb-6">Historic Corrections</h1>

                <SearchFilters
                    filters={filters}
                    setFilters={setFilters}
                    hierarchyData={hierarchyData}
                />

                <HistoricCorrectionsList
                    correctionsData={correctionsData}
                    hierarchyData={hierarchyData}
                    filters={filters}
                />
            </div>
        </div>
    );
} 