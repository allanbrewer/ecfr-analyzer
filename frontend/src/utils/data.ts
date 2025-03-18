import { WordCountData, DEIFootprintData, CorrectionsData, BureaucracyData, AgencyHierarchyData } from '@/types/data';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export async function fetchAnalysisData<T>(filename: string): Promise<T> {
    try {
        console.log(`Fetching data from: ${API_BASE_URL}/api/data/${filename}`);
        const response = await fetch(`${API_BASE_URL}/api/data/${filename}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                `Failed to fetch data: ${response.statusText}. ${errorData.error || ''}`
            );
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error fetching ${filename}:`, error);
        throw error;
    }
}

export async function fetchWordCountData(): Promise<WordCountData> {
    return fetchAnalysisData<WordCountData>('word_count_by_agency.json');
}

export async function fetchDEIFootprintData(): Promise<DEIFootprintData> {
    return fetchAnalysisData<DEIFootprintData>('dei_footprint.json');
}

export async function fetchCorrectionsData(): Promise<CorrectionsData> {
    return fetchAnalysisData<CorrectionsData>('corrections_by_agency.json');
}

export async function fetchBureaucracyData(): Promise<BureaucracyData> {
    return fetchAnalysisData<BureaucracyData>('bureaucracy_footprint.json');
}

export async function fetchAgencyHierarchyData(): Promise<AgencyHierarchyData> {
    return fetchAnalysisData<AgencyHierarchyData>('agency_hierarchy_map.json');
} 