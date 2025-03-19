'use client';

import { useState, useMemo } from 'react';
import { DEIFootprintData, BureaucracyData, AgencyHierarchyData, Agency, WordCountData } from '@/types/data';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

interface TextAnalysisContentProps {
    deiData: DEIFootprintData | null;
    bureaucracyData: BureaucracyData | null;
    hierarchyData: AgencyHierarchyData | null;
    wordCountData: WordCountData | null;
}

export default function TextAnalysisContent({ deiData, bureaucracyData, hierarchyData, wordCountData }: TextAnalysisContentProps) {
    const [selectedAgency, setSelectedAgency] = useState<string>('all');

    const findAgency = (agencies: Agency[], slug: string): Agency | null => {
        for (const agency of agencies) {
            if (agency.slug === slug) return agency;
            if (agency.children) {
                const found = findAgency(agency.children, slug);
                if (found) return found;
            }
        }
        return null;
    };

    const getAgencyName = (slug: string) => {
        if (!hierarchyData) return slug;
        const agency = findAgency(hierarchyData.agencies, slug);
        return agency ? agency.name : slug;
    };

    const agencies = useMemo(() => {
        if (!hierarchyData) return [];
        const allAgencies: Agency[] = [];

        const flattenAgencies = (agency: Agency) => {
            allAgencies.push(agency);
            if (agency.children) {
                agency.children.forEach(flattenAgencies);
            }
        };

        hierarchyData.agencies.forEach(flattenAgencies);
        return allAgencies;
    }, [hierarchyData]);

    const chartData = useMemo(() => {
        if (!deiData || !bureaucracyData) return null;

        const filteredAgencies = selectedAgency === 'all'
            ? agencies
            : agencies.filter(agency => agency.slug === selectedAgency);

        // Get all keywords from both datasets
        const allKeywords = [...Array.from(new Set([...deiData.keywords, ...bureaucracyData.keywords]))];

        // Calculate keyword matches for each agency
        const deiKeywordMatches = allKeywords.map(keyword => {
            const matches = filteredAgencies.reduce((sum, agency) => {
                const agencyData = deiData.agencies[agency.slug];
                if (!agencyData?.references) return sum;

                // Sum up matches from all references that have keyword_matches
                return sum + Object.values(agencyData.references).reduce((refSum, ref) => {
                    return refSum + (ref.keyword_matches?.[keyword] || 0);
                }, 0);
            }, 0);
            return { keyword, matches };
        });

        const bureaucracyKeywordMatches = allKeywords.map(keyword => {
            const matches = filteredAgencies.reduce((sum, agency) => {
                const agencyData = bureaucracyData.agencies[agency.slug];
                if (!agencyData?.references) return sum;

                // Sum up matches from all references that have keyword_matches
                return sum + Object.values(agencyData.references).reduce((refSum, ref) => {
                    return refSum + (ref.keyword_matches?.[keyword] || 0);
                }, 0);
            }, 0);
            return { keyword, matches };
        });

        // Sort by matches in descending order
        deiKeywordMatches.sort((a, b) => b.matches - a.matches);
        bureaucracyKeywordMatches.sort((a, b) => b.matches - a.matches);

        return {
            dei: {
                labels: deiKeywordMatches.map(k => k.keyword),
                datasets: [{
                    label: 'DEI Keyword Matches',
                    data: deiKeywordMatches.map(k => k.matches),
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgb(54, 162, 235)',
                    borderWidth: 1,
                }],
            },
            bureaucracy: {
                labels: bureaucracyKeywordMatches.map(k => k.keyword),
                datasets: [{
                    label: 'Bureaucracy Keyword Matches',
                    data: bureaucracyKeywordMatches.map(k => k.matches),
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgb(255, 99, 132)',
                    borderWidth: 1,
                }],
            }
        };
    }, [deiData, bureaucracyData, agencies, selectedAgency]);

    const normalizedMetrics = useMemo(() => {
        if (!deiData || !bureaucracyData || !wordCountData) return null;

        const filteredAgencies = selectedAgency === 'all'
            ? agencies
            : agencies.filter(agency => agency.slug === selectedAgency);

        const totalWordCount = filteredAgencies.reduce((sum, agency) => {
            return sum + (wordCountData.agencies[agency.slug]?.total || 0);
        }, 0);

        const totalDeiMatches = filteredAgencies.reduce((sum, agency) => {
            const agencyData = deiData.agencies[agency.slug];
            if (!agencyData?.references) return sum;

            return sum + Object.values(agencyData.references).reduce((refSum, ref) => {
                return refSum + (ref.total_matches || 0);
            }, 0);
        }, 0);

        const totalBureaucracyMatches = filteredAgencies.reduce((sum, agency) => {
            const agencyData = bureaucracyData.agencies[agency.slug];
            if (!agencyData?.references) return sum;

            return sum + Object.values(agencyData.references).reduce((refSum, ref) => {
                return refSum + (ref.total_matches || 0);
            }, 0);
        }, 0);

        return {
            dei: (totalDeiMatches / totalWordCount) * 1000,
            bureaucracy: (totalBureaucracyMatches / totalWordCount) * 1000
        };
    }, [deiData, bureaucracyData, wordCountData, agencies, selectedAgency]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: true,
                text: 'Keyword Matches',
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Number of Matches',
                },
            },
        },
    };

    return (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-lg shadow">
                <div className="mb-4">
                    <label htmlFor="agency-select" className="block text-sm font-medium text-gray-700 mb-2">
                        Filter by Agency:
                    </label>
                    <select
                        id="agency-select"
                        value={selectedAgency}
                        onChange={(e) => setSelectedAgency(e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                        <option value="all">All Agencies</option>
                        {agencies.map(agency => (
                            <option key={agency.slug} value={agency.slug}>
                                {getAgencyName(agency.slug)}
                            </option>
                        ))}
                    </select>
                </div>

                {normalizedMetrics && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h3 className="text-lg font-medium text-blue-900">DEI Footprint</h3>
                            <p className="text-2xl font-bold text-blue-700">
                                {normalizedMetrics.dei.toFixed(2)}
                            </p>
                            <p className="text-sm text-blue-600">per 1000 words</p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg">
                            <h3 className="text-lg font-medium text-red-900">Complexity Score</h3>
                            <p className="text-2xl font-bold text-red-700">
                                {normalizedMetrics.bureaucracy.toFixed(2)}
                            </p>
                            <p className="text-sm text-red-600">per 1000 words</p>
                        </div>
                    </div>
                )}

                {chartData && (
                    <div className="space-y-8 max-w-4xl mx-auto">
                        <div className="h-[400px]">
                            <Bar options={chartOptions} data={chartData.dei} />
                        </div>
                        <div className="h-[400px]">
                            <Bar options={chartOptions} data={chartData.bureaucracy} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
} 