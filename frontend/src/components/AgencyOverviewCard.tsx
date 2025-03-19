'use client';

import { Agency, WordCountData, CorrectionsData, DEIFootprintData, BureaucracyData, AgencyHierarchyData } from '@/types/data';
import Image from 'next/image';

interface AgencyOverviewCardProps {
    agency: Agency | null;
    wordCountData: WordCountData | null;
    correctionsData: CorrectionsData | null;
    deiData: DEIFootprintData | null;
    bureaucracyData: BureaucracyData | null;
    hierarchyData: AgencyHierarchyData | null;
}

export default function AgencyOverviewCard({ agency, wordCountData, correctionsData, deiData, bureaucracyData, hierarchyData }: AgencyOverviewCardProps) {
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

    const getTotalDEIMentions = () => {
        if (!deiData) return 0;
        if (!agency) {
            // When showing All Agencies, only count parent agencies
            const parentAgencySlugs = getParentAgencySlugs();
            return Array.from(parentAgencySlugs).reduce((sum, slug) =>
                sum + (deiData.agencies[slug]?.total || 0), 0
            );
        }
        return deiData.agencies[agency.slug]?.total || 0;
    };

    const getBureaucraticScore = () => {
        const wordCount = getTotalWordCount();
        if (!bureaucracyData || wordCount === 0) return 0;
        if (!agency) {
            // When showing All Agencies, only count parent agencies
            const parentAgencySlugs = getParentAgencySlugs();
            const totalBureaucracyMentions = Array.from(parentAgencySlugs).reduce((sum, slug) =>
                sum + (bureaucracyData.agencies[slug]?.total || 0), 0
            );
            return (totalBureaucracyMentions / wordCount) * 1000;
        }
        const bureaucracyMentions = bureaucracyData.agencies[agency.slug]?.total || 0;
        return (bureaucracyMentions / wordCount) * 1000;
    };

    const getSubAgencyCount = () => {
        if (!agency) {
            // When showing All Agencies, count only parent agencies
            return getParentAgencySlugs().size;
        }
        return agency.children?.length || 0;
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center space-x-3">
                    <Image src="/icons/document.svg" alt="Word count" width={24} height={24} />
                    <div>
                        <h3 className="text-sm font-medium text-gray-500">Total Word Count</h3>
                        <p className="text-m font-semibold text-blue-900 whitespace-nowrap">{getTotalWordCount().toLocaleString()} words</p>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center space-x-3">
                    <Image src="/icons/correction.svg" alt="Corrections" width={24} height={24} />
                    <div>
                        <h3 className="text-sm font-medium text-gray-500">Total Corrections</h3>
                        <p className="text-m font-semibold text-red-900 whitespace-nowrap">{getTotalCorrections().toLocaleString()} corrections</p>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center space-x-3">
                    <Image src="/icons/dei.svg" alt="DEI mentions" width={24} height={24} />
                    <div>
                        <h3 className="text-sm font-medium text-gray-500">DEI Mentions</h3>
                        <p className="text-m font-semibold text-green-900 whitespace-nowrap">{getTotalDEIMentions().toLocaleString()} mentions</p>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center space-x-3">
                    <Image src="/icons/bureaucracy.svg" alt="Bureaucratic score" width={24} height={24} />
                    <div>
                        <h3 className="text-sm font-medium text-gray-500">Bureaucratic Score</h3>
                        <p className="text-m font-semibold text-purple-900 whitespace-nowrap">{getBureaucraticScore().toFixed(1)}/1,000 words</p>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center space-x-3">
                    <Image src="/icons/agency.svg" alt="Sub-agencies" width={24} height={24} />
                    <div>
                        <h3 className="text-sm font-medium text-gray-500">Children</h3>
                        <p className="text-m font-semibold text-green-900 whitespace-nowrap">{getSubAgencyCount().toLocaleString()} agencies</p>
                    </div>
                </div>
            </div>
        </div>
    );
} 