export interface WordCountData {
    timestamp: string;
    total_word_count: number;
    title_totals: Record<string, number>;
    agencies: Record<string, AgencyData>;
}

export interface FootprintData {
    timestamp: string;
    footprint_name: string;
    keywords: string[];
    total_matches: number;
    title_totals: Record<string, number>;
    agencies: Record<string, AgencyData>;
}

export type DEIFootprintData = FootprintData;
export type BureaucracyData = FootprintData;

export interface CorrectionsData {
    timestamp: string;
    total_corrections: number;
    title_totals: Record<string, number>;
    agencies: Record<string, AgencyCorrectionData>;
}

export interface Agency {
    name: string;
    slug: string;
    children: Agency[];
}

export interface AgencyHierarchyData {
    timestamp: string;
    agencies: Agency[];
}

export interface AgencyReference {
    count: number;
    description: string;
}

export interface AgencyData {
    total: number;
    references: Record<string, AgencyReference>;
}

export interface Correction {
    id: number;
    corrective_action: string;
    error_corrected: string;
    error_occurred: string;
    year: number;
    fr_citation: string;
    cfr_reference: string;
    hierarchy: {
        title: string;
        section?: string;
        part?: string;
    };
}

export interface CorrectionReference {
    count: number;
    corrections: Correction[];
}

export interface AgencyCorrectionData {
    total: number;
    references: Record<string, CorrectionReference>;
}

// Data for corrections by agency
export interface CorrectionsByAgencyData {
    timestamp: string;
    total_corrections: number;
    title_totals: Record<string, number>;
    agencies: Record<string, AgencyCorrectionData>;
}

// Data for corrections over time
export interface CorrectionsOverTimeData {
    timestamp: string;
    total_corrections: number;
    corrections_by_year: Record<string, number>;
    corrections_by_agency_by_year: Record<string, Record<string, number>>;
} 