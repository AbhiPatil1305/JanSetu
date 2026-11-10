import {
  TextCorrectionRequest,
  TextCorrectionResponse,
} from '../../types/textAssistance';
import { apiClient, delay, USE_MOCK_API } from './client';

class TextAssistanceService {
  async correctText(payload: TextCorrectionRequest): Promise<TextCorrectionResponse> {
    if (USE_MOCK_API) {
      await delay(250);
      return {
        original_text: payload.text,
        corrected_text: payload.text.replace(/vilage/gi, 'village').replace(/two month/gi, 'two months'),
        language: 'ENGLISH',
        corrections: [
          {
            original: 'vilage',
            corrected: 'village',
            type: 'SPELLING',
            explanation: 'Corrected spelling mistake.',
          },
          {
            original: 'two month',
            corrected: 'two months',
            type: 'GRAMMAR',
            explanation: 'Corrected plural agreement.',
          },
        ],
        meaning_preserved: true,
        requires_manual_review: false,
        protected_entities_preserved: true,
        flagged_entity_changes: [],
        model_version: 'qwen2.5:1.5b',
        latency_sec: 0.35,
        eval_tokens_per_sec: 95.0,
      };
    }

    return apiClient.post<TextCorrectionResponse>('/text-assistance/correct', payload);
  }
}

export const textAssistanceService = new TextAssistanceService();

