'use client';

import { useState, useEffect } from 'react';
import { Agency, WordCountData, CorrectionsByAgencyData, DEIFootprintData, BureaucracyData, Correction } from '@/types/data';
import { fetchWordCountData, fetchCorrectionsData, fetchDEIFootprintData, fetchBureaucracyData, fetchAgencyHierarchyData } from '@/utils/data';
import AgencyCard from './AgencyCard';
import RecentCorrections from './RecentCorrections';

const INITIAL_CARDS = 9; // 3 rows of 3 cards
const CARDS_PER_PAGE = 6; // 2 rows of 3 cards

type SortField = 'name' | 'wordCount' | 'corrections' | 'deiMentions' | 'bureaucraticScore';
type SortDirection = 'asc' | 'desc';

interface CorrectionWithAgency extends Correction {
    agencyName: string;
    uniqueKey: string;
}

export default function AgencyCardsContainer() {
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [wordCountData, setWordCountData] = useState<WordCountData | null>(null);
    const [correctionsData, setCorrectionsData] = useState<CorrectionsByAgencyData | null>(null);
    const [deiData, setDeiData] = useState<DEIFootprintData | null>(null);
    const [bureaucracyData, setBureaucracyData] = useState<BureaucracyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAll, setShowAll] = useState(false);
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [searchQuery, setSearchQuery] = useState('');
    const [visibleCards, setVisibleCards] = useState(INITIAL_CARDS);
    const [recentCorrections, setRecentCorrections] = useState<CorrectionWithAgency[]>([]);

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

                // Extract all corrections with their agency information
                const allCorrections: CorrectionWithAgency[] = Object.entries(corrections.agencies || {})
                    .flatMap(([agencySlug, agencyData]) => {
                        // Find the agency name from the hierarchy
                        const agency = hierarchy.agencies.find(a => a.slug === agencySlug);
                        // Use the proper name from the hierarchy, or fallback to a formatted version of the slug
                        const agencyName = agency?.name || agencySlug
                            .split('-')
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ');

                        return Object.values(agencyData.references || {})
                            .flatMap(ref => (ref.corrections || []).map(correction => ({
                                ...correction,
                                agencyName,
                                uniqueKey: `${correction.id}-${agencySlug}`
                            })));
                    })
                    .sort((a, b) => b.year - a.year);

                // Take the 10 most recent corrections, ensuring no duplicate IDs
                const uniqueCorrections = allCorrections.reduce((acc, correction) => {
                    // If we haven't seen this ID yet, add it
                    if (!acc.some(c => c.id === correction.id)) {
                        acc.push(correction);
                    }
                    return acc;
                }, [] as CorrectionWithAgency[]).slice(0, 10);

                setRecentCorrections(uniqueCorrections);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to load agency data';
                console.error('Error loading agency data:', errorMessage);
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, []);

    const handleSort = (field: SortField) => {
        if (field === sortField) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const getSortedAgencies = () => {
        return [...agencies].sort((a, b) => {
            const aValue = getSortValue(a, sortField);
            const bValue = getSortValue(b, sortField);

            if (sortDirection === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });
    };

    const getSortValue = (agency: Agency, field: SortField): number | string => {
        switch (field) {
            case 'name':
                return agency.name;
            case 'wordCount':
                return wordCountData?.agencies[agency.slug]?.total || 0;
            case 'corrections':
                return correctionsData?.agencies[agency.slug]?.total || 0;
            case 'deiMentions':
                return deiData?.agencies[agency.slug]?.total || 0;
            case 'bureaucraticScore':
                const wordCount = wordCountData?.agencies[agency.slug]?.total || 0;
                const bureaucracyMentions = bureaucracyData?.agencies[agency.slug]?.total || 0;
                return wordCount > 0 ? (bureaucracyMentions / wordCount) * 1000 : 0;
            default:
                return 0;
        }
    };

    const filteredAgencies = getSortedAgencies().filter(agency =>
        agency.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleShowMore = () => {
        setVisibleCards(prev => Math.min(prev + CARDS_PER_PAGE, filteredAgencies.length));
    };

    const handleShowLess = () => {
        setVisibleCards(INITIAL_CARDS);
    };

    const displayedAgencies = filteredAgencies.slice(0, visibleCards);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[...Array(INITIAL_CARDS)].map((_, i) => (
                        <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                            <div className="space-y-3">
                                {[...Array(4)].map((_, j) => (
                                    <div key={j} className="h-4 bg-gray-200 rounded"></div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
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
                <div className="flex flex-col space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-blue-900">Agency Analysis</h2>
                        <div className="flex items-center space-x-4">
                            {visibleCards > INITIAL_CARDS && (
                                <button
                                    onClick={handleShowLess}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm"
                                >
                                    Collapse
                                </button>
                            )}
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => handleSort('name')}
                                    className={`px-3 py-1 rounded text-sm ${sortField === 'name'
                                        ? 'bg-blue-100 text-blue-900'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </button>
                                <button
                                    onClick={() => handleSort('wordCount')}
                                    className={`px-3 py-1 rounded text-sm ${sortField === 'wordCount'
                                        ? 'bg-blue-100 text-blue-900'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Word Count {sortField === 'wordCount' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </button>
                                <button
                                    onClick={() => handleSort('corrections')}
                                    className={`px-3 py-1 rounded text-sm ${sortField === 'corrections'
                                        ? 'bg-blue-100 text-blue-900'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Corrections {sortField === 'corrections' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </button>
                                <button
                                    onClick={() => handleSort('deiMentions')}
                                    className={`px-3 py-1 rounded text-sm ${sortField === 'deiMentions'
                                        ? 'bg-blue-100 text-blue-900'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    DEI Mentions {sortField === 'deiMentions' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </button>
                                <button
                                    onClick={() => handleSort('bureaucraticScore')}
                                    className={`px-3 py-1 rounded text-sm ${sortField === 'bureaucraticScore'
                                        ? 'bg-blue-100 text-blue-900'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Bureaucratic Score {sortField === 'bureaucraticScore' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search agencies..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {displayedAgencies.map((agency) => (
                        <AgencyCard
                            key={agency.slug}
                            agency={agency}
                            wordCount={wordCountData?.agencies[agency.slug]?.total || 0}
                            corrections={correctionsData?.agencies[agency.slug]?.total || 0}
                            deiMentions={deiData?.agencies[agency.slug]?.total || 0}
                            bureaucracyMentions={bureaucracyData?.agencies[agency.slug]?.total || 0}
                        />
                    ))}
                </div>
                {filteredAgencies.length > visibleCards && (
                    <div className="mt-6 flex justify-center">
                        <button
                            onClick={handleShowMore}
                            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                            Show More
                        </button>
                    </div>
                )}
            </div>
            <RecentCorrections corrections={recentCorrections} />
        </div>
    );
} 