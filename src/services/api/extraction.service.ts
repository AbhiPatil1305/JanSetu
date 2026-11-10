/**
 * Backend Local LLM Extraction Service (Production Hardened)
 * 
 * Communicates directly with Kenneth's FastAPI endpoint: POST /api/v1/extraction/extract
 * Powered by local Ollama Qwen2.5 1.5B (CUDA GPU accelerated).
 * 
 * Production Rule: Zero mock fallbacks. If backend or Ollama is offline,
 * throws an explicit, actionable error rather than fabricating grievance fields.
 */

import { apiClient } from './client';
import {
  ExtractionLanguage,
  GrievanceExtractionResult,
} from '../../types/extraction';

export interface BackendExtractionRequest {
  documentId?: string | null;
  text: string;
  supportingTranslation?: string;
  language: ExtractionLanguage;
  model?: string;
}

export interface BackendExtractionApiResponse {
  output_language: string;
  model_used: string;
  fields: GrievanceExtractionResult['fields'];
  additional: GrievanceExtractionResult['additional'];
  latency_sec: number;
  eval_tokens_per_sec: number;
}

export class ExtractionService {
  private inFlightRequests = new Map<string, Promise<GrievanceExtractionResult>>();

  /**
   * Extract structured grievance information using the backend local Qwen2.5 model.
   * Includes request deduplication to prevent duplicate inference for identical inputs.
   */
  async extractGrievance(
    request: BackendExtractionRequest
  ): Promise<GrievanceExtractionResult> {
    const {
      documentId = null,
      text,
      supportingTranslation = '',
      language = 'en',
      model = 'qwen2.5:1.5b',
    } = request;

    const trimmedText = text.trim();
    if (!trimmedText && !supportingTranslation.trim()) {
      throw new Error('No document text available. Please upload and OCR a petition document first.');
    }

    // Deduplication key
    const dedupKey = `${documentId || ''}-${language}-${model}-${trimmedText.slice(0, 100)}`;
    if (this.inFlightRequests.has(dedupKey)) {
      return this.inFlightRequests.get(dedupKey)!;
    }

    const extractPromise = (async () => {
      try {
        const payload = {
          text: trimmedText || supportingTranslation,
          supporting_translation: trimmedText ? supportingTranslation : undefined,
          language,
          model,
        };

        const response = await apiClient.post<BackendExtractionApiResponse>(
          '/extraction/extract',
          payload
        );

        if (!response || !response.fields) {
          throw new Error('Backend returned an invalid extraction response structure.');
        }

        // Normalize response to GrievanceExtractionResult
        const result: GrievanceExtractionResult = {
          output_language: language,
          document_id: documentId,
          fields: response.fields,
          additional: response.additional || {
            reference_numbers: [],
            mentioned_persons: [],
            mentioned_departments: [],
            missing_information: [],
            ambiguities: [],
          },
        };

        return result;
      } catch (err: any) {
        // Distinguish between network/server failure and schema errors
        const errMsg = err?.message || 'Server error';
        if (errMsg.includes('503') || errMsg.includes('Failed to fetch') || errMsg.includes('Network Error')) {
          throw new Error('Local AI extraction service is unavailable. Please verify the grievance backend (port 8000) and Ollama daemon (port 11434) are running.');
        }
        throw err;
      } finally {
        this.inFlightRequests.delete(dedupKey);
      }
    })();

    this.inFlightRequests.set(dedupKey, extractPromise);
    return extractPromise;
  }
}

export const extractionService = new ExtractionService();
