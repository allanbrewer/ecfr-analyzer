'use client';

import { Agency } from '@/types/data';
import Image from 'next/image';

interface AgencyCardProps {
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

    const isIndependent = agency.children.length === 0;
    const subAgencyText = isIndependent
        ? "Independent"
        : `${agency.children.length} Sub-agencies`;
    const subAgencyStyle = isIndependent
        ? "bg-indigo-50 text-indigo-700"
        : "bg-blue-50 text-blue-700";

    return (
        <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
            <div className="bg-gray-50 rounded-t-lg p-5 border-b border-gray-100 h-[110px] flex flex-col">
                <div className="flex-grow">
                    <h3 className="text-base font-semibold text-blue-900 line-clamp-2 leading-tight break-words">{agency.name}</h3>
                </div>
                <div className={`text-xs font-medium px-2 py-1 rounded-full inline-block mt-2 ${subAgencyStyle}`}>
                    {subAgencyText}
                </div>
            </div>
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Image src="/icons/document.svg" alt="Word count" width={14} height={14} />
                        <span className="text-xs text-gray-600">Word Count</span>
                    </div>
                    <div className="bg-blue-50 rounded-lg px-3 py-1">
                        <span className="font-medium text-blue-900 text-sm">{wordCount.toLocaleString()} words</span>
                    </div>
                </div>
                <div className="border-t border-gray-100"></div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Image src="/icons/correction.svg" alt="Corrections" width={14} height={14} />
                        <span className="text-xs text-gray-600">Corrections</span>
                    </div>
                    <div className="bg-red-50 rounded-lg px-3 py-1">
                        <span className="font-medium text-red-900 text-sm">{corrections.toLocaleString()} corrections</span>
                    </div>
                </div>
                <div className="border-t border-gray-100"></div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Image src="/icons/diversity.svg" alt="DEI Mentions" width={14} height={14} />
                        <span className="text-xs text-gray-600">DEI Mentions</span>
                    </div>
                    <div className="bg-green-50 rounded-lg px-3 py-1">
                        <span className="font-medium text-green-900 text-sm">{deiMentions.toLocaleString()} mentions</span>
                    </div>
                </div>
                <div className="border-t border-gray-100"></div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Image src="/icons/bureaucracy.svg" alt="Bureaucratic Score" width={14} height={14} />
                        <span className="text-xs text-gray-600">Bureaucratic Score</span>
                    </div>
                    <div className="bg-purple-50 rounded-lg px-3 py-1">
                        <span className="font-medium text-purple-900 text-sm">{complexityScore}/1,000 words</span>
                    </div>
                </div>
            </div>
        </div>
    );
} 