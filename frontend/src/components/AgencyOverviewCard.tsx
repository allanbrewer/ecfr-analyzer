'use client';

import { Agency, WordCountData, CorrectionsByAgencyData, AgencyHierarchyData } from '@/types/data';
import Image from 'next/image';

interface AgencyOverviewCardProps {
    agency: Agency | null;
    wordCountData: WordCountData | null;
    correctionsData: CorrectionsByAgencyData | null;
    hierarchyData: AgencyHierarchyData | null;
}

export default function AgencyOverviewCard({ agency, wordCountData, correctionsData, hierarchyData }: AgencyOverviewCardProps) {
    const getParentAgencySlugs = () => {
        if (!hierarchyData) return new Set<string>();
        const parentAgencySlugs = new Set<string>();

        // Add all top-level agencies
        hierarchyData.agencies.forEach(agency => {
            parentAgencySlugs.add(agency.slug);
        });

        return parentAgencySlugs;
    };

    const getTotalWordCount = () => {
        if (!wordCountData) return 0;
        if (!agency) {
            // When showing All Agencies, only count parent agencies
            const parentAgencySlugs = getParentAgencySlugs();
            return Array.from(parentAgencySlugs).reduce((sum, slug) =>
                sum + (wordCountData.agencies[slug]?.total || 0), 0
            );
        }
        return wordCountData.agencies[agency.slug]?.total || 0;
    };

    const getTotalCorrections = () => {
        if (!correctionsData) return 0;
        if (!agency) {
            // When showing All Agencies, only count parent agencies
            const parentAgencySlugs = getParentAgencySlugs();
            return Array.from(parentAgencySlugs).reduce((sum, slug) =>
                sum + (correctionsData.agencies[slug]?.total || 0), 0
            );
        }
        return correctionsData.agencies[agency.slug]?.total || 0;
    };

    const getSubAgencyCount = () => {
        if (!agency) {
            // When showing All Agencies, count only parent agencies
            return getParentAgencySlugs().size;
        }
        return agency.children?.length || 0;
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center space-x-3">
                    <Image src="/icons/document.svg" alt="Word count" width={24} height={24} />
                    <div>
                        <h3 className="text-sm font-medium text-gray-500">Total Word Count</h3>
                        <p className="text-2xl font-semibold text-blue-900">{getTotalWordCount().toLocaleString()} words</p>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center space-x-3">
                    <Image src="/icons/correction.svg" alt="Corrections" width={24} height={24} />
                    <div>
                        <h3 className="text-sm font-medium text-gray-500">Total Corrections</h3>
                        <p className="text-2xl font-semibold text-red-900">{getTotalCorrections().toLocaleString()} corrections</p>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center space-x-3">
                    <Image src="/icons/agency.svg" alt="Sub-agencies" width={24} height={24} />
                    <div>
                        <h3 className="text-sm font-medium text-gray-500">Sub-agencies</h3>
                        <p className="text-2xl font-semibold text-green-900">{getSubAgencyCount().toLocaleString()} agencies</p>
                    </div>
                </div>
            </div>
        </div>
    );
} 