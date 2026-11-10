/**
 * Grievance Summarisation Service powered by WebLLM
 * 
 * Generates neutral, factual, and objective administrative summaries
 * in English or Kannada directly inside the browser using WebGPU.
 */
import { webLlmManager, WebLLMProgressCallback } from './WebLlmManager';
import { GrievanceSummary, GrievanceSummarySchema } from './schemas/summarization.schema';
import { buildSummarizationPrompt } from './prompts/summarization.prompt';
import { ExtractionLanguage } from './schemas/grievance-extraction.schema';

export interface SummarizationRequest {
  sourceText: string;
  supportingTranslation?: string;
  language?: ExtractionLanguage;
  modelId?: string;
  onProgress?: WebLLMProgressCallback;
}

export class SummarizationService {
  /**
   * Summarize a grievance document using the shared WebLLM model instance.
   */
  public async summarizeGrievance(request: SummarizationRequest): Promise<GrievanceSummary> {
    const {
      sourceText,
      supportingTranslation = '',
      language = 'en',
      modelId,
      onProgress,
    } = request;

    const trimmedSource = sourceText.trim();
    if (!trimmedSource && !supportingTranslation.trim()) {
      throw new Error('No text provided for summarisation.');
    }

    // Subscribe progress listener if provided
    let unsubscribe: (() => void) | undefined;
    if (onProgress) {
      unsubscribe = webLlmManager.onProgress(onProgress);
    }

    try {
      // 1. Build prompt
      const messages = buildSummarizationPrompt(
        trimmedSource || supportingTranslation,
        trimmedSource ? supportingTranslation : '',
        language
      );

      // 2. Run inference on shared WebLLM instance
      const rawOutput = await webLlmManager.chatCompletion(
        {
          messages,
          temperature: 0.15,
          max_tokens: 650,
          timeoutMs: 60000,
        },
        modelId
      );

      // 3. Parse JSON from model output
      return this.parseAndValidateSummary(rawOutput, language);
    } catch (err: any) {
      console.warn('WebLLM summarisation error or validation failure, using heuristic fallback:', err);
      // Fallback to heuristic if WebLLM fails
      return this.generateHeuristicSummary(trimmedSource || supportingTranslation, language);
    } finally {
      if (unsubscribe) {
        unsubscribe();
      }
    }
  }

  /**
   * Parse model output and validate against Zod schema.
   */
  private parseAndValidateSummary(rawText: string, language: ExtractionLanguage): GrievanceSummary {
    let cleaned = rawText.trim();

    // Strip markdown code fences if present
    const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      cleaned = jsonMatch[1].trim();
    } else {
      const startIdx = cleaned.indexOf('{');
      const endIdx = cleaned.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        cleaned = cleaned.substring(startIdx, endIdx + 1);
      }
    }

    try {
      const parsed = JSON.parse(cleaned);
      const validated = GrievanceSummarySchema.safeParse(parsed);

      if (validated.success) {
        return validated.data;
      }

      console.warn('Zod validation issues for summary, repairing fields:', validated.error.issues);
      return {
        output_language: language,
        short_summary: typeof parsed.short_summary === 'string' && parsed.short_summary.length > 5
          ? parsed.short_summary
          : cleaned.slice(0, 200),
        detailed_summary: typeof parsed.detailed_summary === 'string' && parsed.detailed_summary.length > 10
          ? parsed.detailed_summary
          : cleaned,
        requested_action: typeof parsed.requested_action === 'string' ? parsed.requested_action : '',
        key_points: Array.isArray(parsed.key_points) ? parsed.key_points.map(String) : [],
        confidence_score: typeof parsed.confidence_score === 'number' ? parsed.confidence_score : 0.8,
      };
    } catch (parseError) {
      // If pure text was returned instead of JSON
      return {
        output_language: language,
        short_summary: cleaned.split('\n')[0].slice(0, 200) || 'Summary generated from petition.',
        detailed_summary: cleaned,
        requested_action: '',
        key_points: [],
        confidence_score: 0.7,
      };
    }
  }

  /**
   * Rule-based heuristic summary fallback for environments lacking WebGPU
   * or when quick previews are needed.
   */
  public generateHeuristicSummary(text: string, language: ExtractionLanguage = 'en'): GrievanceSummary {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 15);

    if (language === 'kn') {
      const sample = lines.slice(0, 3).join(' ');
      return {
        output_language: 'kn',
        short_summary: sample ? `${sample.slice(0, 180)}...` : 'ಅರ್ಜಿಯ ಸಂಕ್ಷಿಪ್ತ ವಿವರಣೆ ಲಭ್ಯವಿಲ್ಲ.',
        detailed_summary: lines.slice(0, 6).join('\n') || text.slice(0, 500),
        requested_action: 'ಸಂಬಂಧಪಟ್ಟ ಅಧಿಕಾರಿಗಳು ಈ ಅರ್ಜಿಯನ್ನು ಪರಿಶೀಲಿಸಿ ಸೂಕ್ತ ಕ್ರಮ ಕೈಗೊಳ್ಳಲು ಕೋರಲಾಗಿದೆ.',
        key_points: lines.slice(0, 3),
        confidence_score: 0.65,
      };
    }

    const sentences = text
      .replace(/([.?!])\s*(?=[A-Z])/g, '$1|')
      .split('|')
      .map((s) => s.trim())
      .filter((s) => s.length > 20);

    const firstTwo = sentences.slice(0, 2).join(' ');
    const shortSummary = firstTwo ? `${firstTwo.slice(0, 250)}...` : 'Administrative grievance petition filed for review.';
    const detailedSummary = sentences.slice(0, 5).join(' ') || text.slice(0, 500);

    return {
      output_language: 'en',
      short_summary: shortSummary,
      detailed_summary: detailedSummary,
      requested_action: 'Administrative investigation and corrective action requested by the citizen.',
      key_points: sentences.slice(0, 4),
      confidence_score: 0.65,
    };
  }
}

export const summarizationService = new SummarizationService();

