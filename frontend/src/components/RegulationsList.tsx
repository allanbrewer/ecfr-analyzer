'use client';

import { Agency, WordCountData } from '@/types/data';

interface RegulationsListProps {
    agency: Agency | null;
    wordCountData: WordCountData | null;
}

export default function RegulationsList({ agency, wordCountData }: RegulationsListProps) {
    const getReferences = () => {
        if (!wordCountData || !agency) return [];

        const agencyData = wordCountData.agencies[agency.slug];
        if (!agencyData?.references) return [];

        return Object.entries(agencyData.references)
            .map(([key, ref]) => {
                // Extract title number from the tuple string (e.g., "(1, '', 'III', '', '')")
                const titleMatch = key.match(/^\((\d+)/);
                const titleNum = titleMatch ? parseInt(titleMatch[1]) : 0;
                return {
                    title: titleNum,
                    description: ref.description || 'N/A',
                    wordCount: ref.count
                };
            })
            .sort((a, b) => a.title - b.title);
    };

    const references = getReferences();

    return (
        <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Regulations</h2>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Word Count</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {references.map((ref, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {ref.title}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {ref.description}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {ref.wordCount.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
} 