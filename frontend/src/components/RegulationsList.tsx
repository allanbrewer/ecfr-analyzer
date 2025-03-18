'use client';

import { Agency, WordCountData, CorrectionsByAgencyData } from '@/types/data';

interface RegulationsListProps {
    agency: Agency | null;
    wordCountData: WordCountData | null;
    correctionsData: CorrectionsByAgencyData | null;
}

export default function RegulationsList({ agency, wordCountData, correctionsData }: RegulationsListProps) {
    if (!agency || !wordCountData || !correctionsData) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Regulations</h3>
                <p className="text-gray-500">No data available</p>
            </div>
        );
    }

    const agencyData = wordCountData.agencies[agency.slug];
    const correctionsAgencyData = correctionsData.agencies[agency.slug];

    if (!agencyData?.titles || !correctionsAgencyData?.references) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Regulations</h3>
                <p className="text-gray-500">No regulation data available for this agency</p>
            </div>
        );
    }

    // Get all titles from word count data
    const regulations = Object.entries(agencyData.titles || {}).map(([title, wordCount]) => {
        // Find corrections for this title
        const titleCorrections = Object.values(correctionsAgencyData.references || {})
            .filter(ref => ref.cfr_reference.startsWith(title))
            .map(ref => ({
                reference: ref.cfr_reference,
                corrections: ref.corrections || []
            }));

        return {
            title,
            wordCount,
            corrections: titleCorrections
        };
    });

    // Sort by word count in descending order
    regulations.sort((a, b) => b.wordCount - a.wordCount);

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Regulations</h3>
            <div className="space-y-6">
                {regulations.map((regulation) => (
                    <div key={regulation.title} className="border-b border-gray-200 pb-4 last:border-b-0">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="text-md font-medium text-blue-900">{regulation.title}</h4>
                            <span className="text-sm text-gray-500">{regulation.wordCount.toLocaleString()} words</span>
                        </div>
                        {regulation.corrections.length > 0 && (
                            <div className="mt-2">
                                <h5 className="text-sm font-medium text-gray-700 mb-1">Corrections:</h5>
                                <ul className="list-disc list-inside space-y-1">
                                    {regulation.corrections.map((correction, index) => (
                                        <li key={`${correction.reference}-${index}`} className="text-sm text-gray-600">
                                            <span className="font-medium">{correction.reference}</span>
                                            <p className="ml-4 text-gray-500">
                                                {correction.corrections.length} correction{correction.corrections.length !== 1 ? 's' : ''}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
} 