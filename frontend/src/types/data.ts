export interface WordCountData {
    timestamp: string;
    total_word_count: number;
    title_totals: Record<string, number>;
    agencies: { [key: string]: AgencyData };
}

export interface FootprintData {
    timestamp: string;
    footprint_name: string;
    keywords: string[];
    total_matches: number;
    title_totals: Record<string, number>;
    agencies: { [key: string]: AgencyData };
}

export type DEIFootprintData = FootprintData;
export type BureaucracyData = FootprintData;

export interface CorrectionsData {
    timestamp: string;
    total_corrections: number;
    title_totals: Record<string, number>;
    agencies: { [key: string]: AgencyCorrectionData };
}

export interface Agency {
    name: string;
    slug: string;
    children?: Agency[];
}

export interface AgencyHierarchyData {
    timestamp: string;
    agencies: Agency[];
}

export interface AgencyReference {
    count: number;
    description: string;
    total_matches: number;
    keyword_matches?: Record<string, number>;
}

export interface AgencyData {
    total: number;
    word_count: number;
    titles: { [key: string]: number };
    references: Record<string, AgencyReference>;
    keyword_matches: Record<string, number>;
}

export interface Correction {
    id: string;
    year: number;
    corrective_action: string;
    fr_citation: string;
    cfr_reference: string;
    hierarchy: {
        title: string;
        section?: string;
    };
}

export interface CorrectionReference {
    cfr_reference: string;
    corrections: Correction[];
}

export interface AgencyCorrectionData {
    total: number;
    references: { [key: string]: CorrectionReference };
}

// Data for corrections by agency
export interface CorrectionsByAgencyData {
    timestamp: string;
    total_corrections: number;
    title_totals: Record<string, number>;
    agencies: { [key: string]: AgencyCorrectionData };
}

// Data for corrections over time
export interface CorrectionsOverTimeData {
    timestamp: string;
    total_corrections: number;
    corrections_by_year: Record<string, number>;
    corrections_by_agency_by_year: Record<string, Record<string, number>>;
} 