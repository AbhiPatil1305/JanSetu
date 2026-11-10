import { UserRole } from './auth';

export type ComplaintStatus =
  | 'REGISTERED'
  | 'AWAITING_ASSIGNMENT'
  | 'ASSIGNED'
  | 'UNDER_INVESTIGATION'
  | 'AWAITING_INFORMATION'
  | 'RESOLUTION_SUBMITTED'
  | 'CLOSED';

export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type OperationalFlag = 'OVERDUE' | 'ESCALATED' | 'NO_RECENT_UPDATE';

export interface CitizenInfo {
  name: string;
  phone: string;
  email?: string;
  address: string;
  district: string;
  taluk: string;
  villageLocality: string;
}

export interface ComplaintDetails {
  title: string;
  description: string;
  category: string;
  incidentDate: string;
  incidentLocation: string;
  requestedAction: string;
  language: 'kannada' | 'english' | 'bilingual';
  referenceNumber?: string;
}

export type ConfidenceLevel = 'HIGH' | 'NEEDS_REVIEW' | 'MISSING';

export interface OcrAiExtraction {
  rawText: string;
  reviewedText: string;
  kannadaText?: string;
  englishTranslation?: string;
  englishSummary: string;
  kannadaSummary: string;
  suggestedCategory: string;
  suggestedDepartment: string;
  suggestedIncidentLocation: string;
  suggestedComplaintDate: string;
  suggestedCitizenName?: string;
  suggestedPhone?: string;
  suggestedAddress?: string;
  confidenceScores: {
    citizen: ConfidenceLevel;
    category: ConfidenceLevel;
    location: ConfidenceLevel;
    date: ConfidenceLevel;
  };
}

export interface ComplaintDocument {
  id: string;
  name: string;
  originalFilename?: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
  isOriginal: boolean;
  documentType?: string;
  language?: string;
  parentDocumentId?: string | null;
  ocrStatus?: 'NOT_STARTED' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'NEEDS_REVIEW';
  ocrLanguage?: string;
  ocrProcessedAt?: string;
  ocrError?: string;
  extractedText?: string | null;
  reviewedText?: string | null;
}

export interface AssignmentInfo {
  departmentId: string;
  departmentName: string;
  stationId: string;
  stationName: string;
  officerId: string;
  officerName: string;
  officerDesignation: string;
  priority: ComplaintPriority;
  initialFollowupDate: string;
  nextFollowupDate: string;
  instructions: string;
  assignedAt: string;
  assignedBy: string;
}

export interface ProgressUpdate {
  id: string;
  complaintId: string;
  officerId: string;
  officerName: string;
  officerDesignation: string;
  actionTaken: string;
  progressDescription: string;
  enquiryRemarks: string;
  currentStatus: ComplaintStatus;
  nextFollowupDate: string;
  reasonForDelay?: string;
  attachments?: Array<{ name: string; url: string; size: string }>;
  createdAt: string;
}

export interface ResolutionSubmission {
  id: string;
  complaintId: string;
  officerId: string;
  officerName: string;
  resolutionSummary: string;
  actionTaken: string;
  resolutionDate: string;
  additionalRemarks?: string;
  supportingDocuments?: Array<{ name: string; url: string; size: string }>;
  submittedAt: string;
  reviewStatus: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string;
  reviewRemarks?: string;
  reviewedAt?: string;
}

export interface TimelineEvent {
  id: string;
  complaintId: string;
  type:
    | 'DOCUMENT_UPLOADED'
    | 'OCR_COMPLETED'
    | 'AI_REVIEW_COMPLETED'
    | 'CASE_REGISTERED'
    | 'OFFICER_ASSIGNED'
    | 'ASSIGNMENT_ACKNOWLEDGED'
    | 'PROGRESS_SUBMITTED'
    | 'REMINDER_GENERATED'
    | 'COMMUNICATION_RECORDED'
    | 'ESCALATION_REQUESTED'
    | 'ESCALATION_APPROVED'
    | 'ESCALATION_REJECTED'
    | 'RESOLUTION_SUBMITTED'
    | 'RESOLUTION_APPROVED'
    | 'RESOLUTION_REJECTED'
    | 'CASE_CLOSED';
  title: string;
  description: string;
  actorName: string;
  actorRole: UserRole;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface Complaint {
  id: string;
  citizen: CitizenInfo;
  details: ComplaintDetails;
  documents: ComplaintDocument[];
  ocrAiExtraction?: OcrAiExtraction;
  assignment?: AssignmentInfo;
  status: ComplaintStatus;
  operationalFlags: OperationalFlag[];
  progressUpdates: ProgressUpdate[];
  resolution?: ResolutionSubmission;
  registeredAt: string;
  lastUpdatedAt: string;
  daysPending: number;
  reminderCount: number;
  isEscalated: boolean;
  escalationId?: string;
}
