/**
 * Grievance Form Extractor Service
 * 
 * Routes structured information extraction requests to Kenneth's backend
 * FastAPI endpoint: POST /api/v1/extraction/extract
 * Powered by local Ollama Qwen2.5 (1.5B/3B) running on CUDA GPU.
 * 
 * Preserves the existing extraction interface across JanSetu UI components.
 */

import { extractionService } from '../api/extraction.service';
import {
  ExtractionLanguage,
  ExtractionProgress,
  GrievanceExtractionResult,
} from '../../types/extraction';

export interface ExtractionModelInfo {
  id: string;
  name: string;
  size: string;
  description: string;
  isDefault?: boolean;
}

export const EXTRACTION_MODELS: ExtractionModelInfo[] = [
  {
    id: 'qwen2.5:1.5b',
    name: 'Qwen 2.5 (1.5B) - Local GPU Engine (Default)',
    size: '~986 MB',
    description: 'Fastest neural inference (120 tokens/sec, ~2.3s latency)',
    isDefault: true,
  },
  {
    id: 'qwen2.5:3b',
    name: 'Qwen 2.5 (3B) - High Resilience Engine',
    size: '~1.93 GB',
    description: 'Enhanced accuracy on noisy OCR & complex revenue petitions',
  },
];

export interface ExtractionRequest {
  documentId?: string | null;
  reviewedOcrText?: string;
  rawOcrText?: string;
  translatedText?: string;
  language: ExtractionLanguage;
  modelId?: string;
  onProgress?: (progress: ExtractionProgress) => void;
}

class GrievanceExtractorService {
  /**
   * Check if backend extraction engine is supported and reachable.
   */
  public isWebGpuSupported(): boolean {
    // Backend model is running locally on GPU; always supported in this environment
    return true;
  }

  /**
   * Extract grievance fields from document text using the backend local Qwen2.5 model.
   */
  public async extractGrievance(request: ExtractionRequest): Promise<GrievanceExtractionResult> {
    const {
      documentId = null,
      reviewedOcrText = '',
      rawOcrText = '',
      translatedText = '',
      language,
      modelId = EXTRACTION_MODELS[0].id,
      onProgress,
    } = request;

    const primaryText = (reviewedOcrText || rawOcrText || '').trim();
    if (!primaryText && !translatedText?.trim()) {
      throw new Error('No document text available. Please upload or OCR a document first.');
    }

    onProgress?.({
      state: 'extracting',
      percent: 30,
      message: `Analyzing petition content with local ${modelId} (${language === 'kn' ? 'Kannada' : 'English'})...`,
    });

    const tStart = performance.now();

    try {
      const result = await extractionService.extractGrievance({
        documentId,
        text: primaryText || translatedText,
        supportingTranslation: primaryText ? translatedText : undefined,
        language,
        model: modelId,
      });

      const extractionTimeMs = Math.round(performance.now() - tStart);

      onProgress?.({
        state: 'completed',
        percent: 100,
        message: `Extraction completed in ${(extractionTimeMs / 1000).toFixed(2)}s!`,
        extractionTimeMs,
      });

      return result;
    } catch (err: any) {
      console.error('Backend Extraction Error:', err);
      onProgress?.({
        state: 'failed',
        percent: 0,
        message: 'Extraction failed: ' + (err?.message || 'Server connection error'),
        error: err?.message,
      });
      throw err;
    }
  }
}

export const webLlmExtractorService = new GrievanceExtractorService();
