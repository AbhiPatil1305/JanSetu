import { z } from 'zod';

export type ExtractionStatus = 'EXTRACTED' | 'PARTIALLY_EXTRACTED' | 'NOT_FOUND' | 'AMBIGUOUS';
export type UrgencySuggestion = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ExtractionLanguage = 'en' | 'kn';

export interface ExtractedField<T = string | null> {
  value: T;
  confidence: number; // 0.0 to 1.0 (estimated by model)
  source_excerpt: string | null;
  status: ExtractionStatus;
}

export const ExtractedFieldSchema = z.object({
  value: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1).default(0),
  source_excerpt: z.string().nullable().optional(),
  status: z.enum(['EXTRACTED', 'PARTIALLY_EXTRACTED', 'NOT_FOUND', 'AMBIGUOUS']).default('NOT_FOUND'),
});

export const GrievanceExtractionSchema = z.object({
  output_language: z.enum(['en', 'kn']).default('en'),
  document_id: z.string().nullable().optional(),
  fields: z.object({
    // Citizen Information
    citizen_name: ExtractedFieldSchema,
    mobile_number: ExtractedFieldSchema,
    email: ExtractedFieldSchema,
    residential_address: ExtractedFieldSchema,

    // Location Information
    district: ExtractedFieldSchema,
    taluk: ExtractedFieldSchema,
    locality: ExtractedFieldSchema,
    incident_location: ExtractedFieldSchema,

    // Grievance Information
    complaint_title: ExtractedFieldSchema,
    complaint_description: ExtractedFieldSchema,
    category_suggestion: ExtractedFieldSchema,
    incident_date: ExtractedFieldSchema,
    requested_action: ExtractedFieldSchema,
    department_suggestion: ExtractedFieldSchema,
    urgency_suggestion: ExtractedFieldSchema,
  }),
  additional: z.object({
    reference_numbers: z.array(z.string()).default([]),
    mentioned_persons: z.array(z.string()).default([]),
    mentioned_departments: z.array(z.string()).default([]),
    missing_information: z.array(z.string()).default([]),
    ambiguities: z.array(z.string()).default([]),
  }).default({
    reference_numbers: [],
    mentioned_persons: [],
    mentioned_departments: [],
    missing_information: [],
    ambiguities: [],
  }),
});

export type GrievanceExtractionResult = z.infer<typeof GrievanceExtractionSchema>;

export type ExtractionEngineState =
  | 'idle'
  | 'checking_webgpu'
  | 'model_not_loaded'
  | 'loading_local_model'
  | 'model_ready'
  | 'extracting'
  | 'validating'
  | 'completed'
  | 'failed';

export interface ExtractionProgress {
  state: ExtractionEngineState;
  percent: number;
  message: string;
  stage?: string;
  error?: string | null;
  modelInitTimeMs?: number;
  extractionTimeMs?: number;
}

