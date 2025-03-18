'use client';

import { Agency, WordCountData, CorrectionsByAgencyData, DEIFootprintData, BureaucracyData } from '@/types/data';
import Image from 'next/image';

interface SubAgenciesListProps {
    agency: Agency;
    wordCountData: WordCountData | null;
    correctionsData: CorrectionsByAgencyData | null;
    deiData: DEIFootprintData | null;
    bureaucracyData: BureaucracyData | null;
}

export default function SubAgenciesList({ agency, wordCountData, correctionsData, deiData, bureaucracyData }: SubAgenciesListProps) {
    if (!agency.children?.length) {
        return null;
    }

    return (
        <div className="mt-8">
            <h2 className="text-xl font-semibold text-blue-900 mb-4">Sub-agencies</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agency.children.map(subAgency => {
                    const wordCount = wordCountData?.agencies[subAgency.slug]?.total || 0;
                    const corrections = correctionsData?.agencies[subAgency.slug]?.total || 0;
                    const deiMentions = deiData?.agencies[subAgency.slug]?.total || 0;
                    const bureaucracyMentions = bureaucracyData?.agencies[subAgency.slug]?.total || 0;
                    const complexityScore = wordCount > 0 ? (bureaucracyMentions / wordCount) * 1000 : 0;
                    const isIndependent = !subAgency.children || subAgency.children.length === 0;
                    const subAgencyCount = subAgency.children?.length || 0;
                    const subAgencyText = isIndependent
                        ? "Independent"
                        : `${subAgencyCount} Sub-agencies`;
                    const subAgencyStyle = isIndependent
                        ? "bg-indigo-50 text-indigo-700"
                        : "bg-blue-50 text-blue-700";

                    return (
                        <div key={subAgency.slug} className="bg-white rounded-lg shadow-md p-6">
                            <div className="bg-gray-50 rounded-t-lg -mx-6 -mt-6 p-4 mb-4 h-[110px]">
                                <h3 className="text-lg font-semibold text-blue-900">{subAgency.name}</h3>
                                <div className={`text-xs ${subAgencyStyle} px-2 py-1 rounded-full inline-block mt-1`}>
                                    {subAgencyText}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                                    <div className="flex items-center space-x-2">
                                        <Image src="/icons/document.svg" alt="Word count" width={16} height={16} />
                                        <span className="text-sm text-gray-600">Word Count</span>
                                    </div>
                                    <div className="bg-blue-50 text-blue-900 px-3 py-1 rounded whitespace-nowrap">
                                        {wordCount.toLocaleString()} words
                                    </div>
                                </div>
                                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                                    <div className="flex items-center space-x-2">
                                        <Image src="/icons/correction.svg" alt="Corrections" width={16} height={16} />
                                        <span className="text-sm text-gray-600">Corrections</span>
                                    </div>
                                    <div className="bg-red-50 text-red-900 px-3 py-1 rounded whitespace-nowrap">
                                        {corrections.toLocaleString()} corrections
                                    </div>
                                </div>
                                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                                    <div className="flex items-center space-x-2">
                                        <Image src="/icons/dei.svg" alt="DEI mentions" width={16} height={16} />
                                        <span className="text-sm text-gray-600">DEI Mentions</span>
                                    </div>
                                    <div className="bg-green-50 text-green-900 px-3 py-1 rounded whitespace-nowrap">
                                        {deiMentions.toLocaleString()} mentions
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Image src="/icons/bureaucracy.svg" alt="Bureaucratic score" width={16} height={16} />
                                        <span className="text-sm text-gray-600">Bureaucratic Score</span>
                                    </div>
                                    <div className="bg-purple-50 text-purple-900 px-3 py-1 rounded whitespace-nowrap">
                                        {complexityScore.toFixed(1)}/1,000 words
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
} 