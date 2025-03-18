'use client';

import { Agency } from '@/types/data';
import Image from 'next/image';
import Link from 'next/link';

interface AgencyCardProps {
    key?: string;
    agency: Agency;
    wordCount: number;
    corrections: number;
    deiMentions: number;
    bureaucracyMentions: number;
}

export default function AgencyCard({
    agency,
    wordCount,
    corrections,
    deiMentions,
    bureaucracyMentions,
}: AgencyCardProps) {
    const complexityScore = wordCount > 0
        ? ((bureaucracyMentions / wordCount) * 1000).toFixed(1)
        : '0.0';

    const isIndependent = !agency.children || agency.children.length === 0;
    const subAgencyCount = agency.children?.length || 0;
    const subAgencyText = isIndependent
        ? "Independent"
        : `${subAgencyCount} Sub-agencies`;
    const subAgencyStyle = isIndependent
        ? "bg-indigo-50 text-indigo-700"
        : "bg-blue-50 text-blue-700";

    return (
        <Link href={`/agency/${agency.slug}`} className="block">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="bg-gray-50 rounded-t-lg -mx-6 -mt-6 p-4 mb-4 h-[110px]">
                    <h3 className="text-lg font-semibold text-blue-900">{agency.name}</h3>
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
                            {complexityScore}/1,000 words
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
} 