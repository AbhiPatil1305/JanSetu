export interface Department {
  id: string;
  code: string;
  name: string;
  head: string;
  contactEmail: string;
  contactPhone: string;
  stationsCount: number;
  totalComplaints: number;
  openComplaints: number;
  status: 'active' | 'inactive';
}

export interface PoliceStation {
  id: string;
  departmentId: string;
  code: string;
  name: string;
  location: string;
  contactNumber: string;
  inChargeName: string;
  inChargeRank: string;
  officersCount: number;
  activeCases: number;
  status: 'active' | 'inactive';
}

export interface DepartmentCandidate {
  department_id: string;
  department_code: string;
  department_name: string;
  confidence_score: number;
  rank: number;
  primary_reason: string;
  matched_responsibilities: string[];
  evidence_excerpts: string[];
  jurisdiction_match: boolean;
}

export interface DepartmentClassificationResponse {
  main_issue: string;
  secondary_issues: string[];
  jurisdiction_clues: string[];
  recommended_department: DepartmentCandidate | null;
  alternative_candidates: DepartmentCandidate[];
  application_confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NEEDS_REVIEW';
  uncertainty_notes?: string | null;
  missing_information: string[];
  disclaimer: string;
  requires_human_confirmation: boolean;
  model_version: string;
  latency_sec: number;
  eval_tokens_per_sec: number;
}

export interface DepartmentClassificationRequest {
  text: string;
  language?: 'kn' | 'en' | 'auto';
  supporting_translation?: string;
  incident_location?: string;
  model?: string;
}

