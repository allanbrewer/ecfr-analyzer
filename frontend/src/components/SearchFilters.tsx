'use client';

import { AgencyHierarchyData } from '@/types/data';

interface SearchFiltersProps {
    filters: {
        year: string;
        title: string;
        agency: string;
    };
    setFilters: (filters: { year: string; title: string; agency: string }) => void;
    hierarchyData: AgencyHierarchyData | null;
}

export default function SearchFilters({ filters, setFilters, hierarchyData }: SearchFiltersProps) {
    const years = Array.from({ length: 2024 - 2005 + 1 }, (_, i) => 2005 + i);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
                <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
                    Year
                </label>
                <select
                    id="year"
                    value={filters.year}
                    onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">All Years</option>
                    {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
            </div>

            <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Title Number
                </label>
                <input
                    type="text"
                    id="title"
                    value={filters.title}
                    onChange={(e) => setFilters({ ...filters, title: e.target.value })}
                    placeholder="Enter title number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div>
                <label htmlFor="agency" className="block text-sm font-medium text-gray-700 mb-1">
                    Agency
                </label>
                <select
                    id="agency"
                    value={filters.agency}
                    onChange={(e) => setFilters({ ...filters, agency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">All Agencies</option>
                    {hierarchyData?.agencies.map(agency => (
                        <option key={agency.slug} value={agency.slug}>
                            {agency.name}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
} 