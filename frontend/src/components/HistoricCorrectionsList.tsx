'use client';

import { useState, useMemo } from 'react';
import { CorrectionsData, Correction, AgencyHierarchyData, Agency } from '@/types/data';

interface HistoricCorrectionsListProps {
    correctionsData: CorrectionsData | null;
    hierarchyData: AgencyHierarchyData | null;
    filters: {
        year: string;
        title: string;
        agency: string;
    };
}

interface ProcessedCorrection {
    id: string;
    year: number;
    title: number;
    agencies: string[];
    text: string;
    cfrRef: string;
    tupleKey: string;
}

export default function HistoricCorrectionsList({ correctionsData, hierarchyData, filters }: HistoricCorrectionsListProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [sortConfig, setSortConfig] = useState<{ key: 'year' | 'title', direction: 'asc' | 'desc' }>({
        key: 'year',
        direction: 'desc'
    });

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

    const corrections = useMemo(() => {
        if (!correctionsData?.agencies) return [];

        const allCorrections: ProcessedCorrection[] = [];
        const seenIds = new Set<string>();

        Object.entries(correctionsData.agencies).forEach(([agencySlug, agencyData]) => {
            if (!agencyData?.references) return;

            Object.entries(agencyData.references).forEach(([tupleKey, refData]) => {
                if (!refData?.corrections) return;

                refData.corrections.forEach(correction => {
                    if (!seenIds.has(correction.id)) {
                        seenIds.add(correction.id);
                        allCorrections.push({
                            id: correction.id,
                            year: correction.year,
                            title: parseInt(correction.hierarchy.title),
                            agencies: [agencySlug],
                            text: correction.corrective_action,
                            cfrRef: correction.cfr_reference || '',
                            tupleKey
                        });
                    } else {
                        // Add agency to existing correction's agencies array
                        const existingCorrection = allCorrections.find(c => c.id === correction.id);
                        if (existingCorrection && !existingCorrection.agencies.includes(agencySlug)) {
                            existingCorrection.agencies.push(agencySlug);
                        }
                    }
                });
            });
        });

        return allCorrections;
    }, [correctionsData]);

    const filteredCorrections = useMemo(() => {
        return corrections.filter(correction => {
            if (filters.year && correction.year !== parseInt(filters.year)) return false;
            if (filters.title && correction.title !== parseInt(filters.title)) return false;
            if (filters.agency && !correction.agencies.includes(filters.agency)) return false;
            return true;
        });
    }, [corrections, filters]);

    const sortedCorrections = useMemo(() => {
        return [...filteredCorrections].sort((a, b) => {
            if (sortConfig.key === 'year') {
                return sortConfig.direction === 'asc' ? a.year - b.year : b.year - a.year;
            } else {
                return sortConfig.direction === 'asc' ? a.title - b.title : b.title - a.title;
            }
        });
    }, [filteredCorrections, sortConfig]);

    const totalPages = Math.ceil(sortedCorrections.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedCorrections = sortedCorrections.slice(startIndex, startIndex + itemsPerPage);

    const handleSort = (key: 'year' | 'title') => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    return (
        <div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('year')}
                            >
                                Year {sortConfig.key === 'year' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('title')}
                            >
                                Title {sortConfig.key === 'title' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agencies</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correction</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedCorrections.map(correction => (
                            <tr key={correction.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {correction.year}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {correction.title}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {correction.agencies.map(getAgencyName).join(', ')}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {`${correction.cfrRef} - ${correction.text} (${correction.tupleKey})`}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-gray-700">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, sortedCorrections.length)} of {sortedCorrections.length} corrections
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
} 