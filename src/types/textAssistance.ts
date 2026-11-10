export interface CorrectionItem {
  original: string;
  corrected: string;
  type: 'SPELLING' | 'TYPO' | 'GRAMMAR' | 'PUNCTUATION' | 'WORD_CHOICE' | 'SENTENCE_STRUCTURE' | string;
  explanation: string;
}

export interface TextCorrectionRequest {
  text: string;
  language_hint?: 'kn' | 'en' | 'mixed' | 'auto';
  text_type?: 'TITLE' | 'DESCRIPTION' | 'GENERAL';
}

export interface TextCorrectionResponse {
  original_text: string;
  corrected_text: string;
  language: 'KANNADA' | 'ENGLISH' | 'MIXED';
  corrections: CorrectionItem[];
  meaning_preserved: boolean;
  requires_manual_review: boolean;
  protected_entities_preserved: boolean;
  flagged_entity_changes: string[];
  model_version: string;
  latency_sec: number;
  eval_tokens_per_sec: number;
}

export interface AcceptedCorrectionAudit {
  target_field: 'title' | 'description' | 'ocr' | 'summary';
  original_text: string;
  corrected_text: string;
  accepted_at: string;
  accepted_by?: string;
  model_version: string;
  corrections_applied_count: number;
}

