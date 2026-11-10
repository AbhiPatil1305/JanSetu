import { apiClient, USE_MOCK_API, delay, tokenStorage, API_BASE_URL } from './client';

export type TranslationStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'UNDER_REVIEW'
  | 'APPROVED';

export interface TranslationRecord {
  id: string;
  document_id: string;
  source_language: string;
  target_language: string;
  text_source: 'RAW_OCR' | 'REVIEWED_OCR';
  source_text: string;
  translated_text?: string | null;
  corrected_text?: string | null;
  provider_name: string;
  model_version?: string | null;
  status: TranslationStatus;
  created_by?: string | null;
  created_at: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  error_message?: string | null;
  storage_path?: string | null;
  checksum_sha256?: string | null;
  pdf_storage_path?: string | null;
  file_size?: number | null;
  translated_document_id?: string | null;
  download_url?: string | null;
}

export interface TranslationEngineStatus {
  provider?: string;
  provider_name: string;
  model_name?: string;
  model_version: string;
  supported_pairs: string[];
  supported_languages?: string[];
  is_local: boolean;
  is_ready?: boolean;
  requires_external_network: boolean;
  offline_available?: boolean;
  status: string;
  device: string;
  device_name?: string | null;
}

export class TranslationsService {
  /**
   * Check translation engine status and model information.
   */
  async getEngineStatus(): Promise<TranslationEngineStatus> {
    if (USE_MOCK_API) {
      await delay(50);
      return {
        provider_name: 'JanSetu-LocalAdministrativeEngine',
        model_version: 'admin-lexicon-v2.1 (IndicTrans2 Architecture Ready)',
        supported_pairs: ['kn->en', 'en->kn'],
        is_local: true,
        requires_external_network: false,
        status: 'READY',
        device: 'Local CPU Offline Engine',
      };
    }
    return apiClient.get<TranslationEngineStatus>('/translations/engine/status');
  }

  /**
   * Direct ad-hoc text translation between Kannada and English before grievance registration.
   */
  async translateText(
    text: string,
    sourceLanguage: 'kn' | 'en' = 'kn',
    targetLanguage: 'en' | 'kn' = 'en'
  ): Promise<{
    source_text: string;
    translated_text: string;
    source_language: string;
    target_language: string;
    provider_name?: string;
  }> {
    if (USE_MOCK_API) {
      await delay(300);
      return {
        source_text: text,
        translated_text: `[Translated] ${text}`,
        source_language: sourceLanguage,
        target_language: targetLanguage,
      };
    }
    return apiClient.post('/translations/translate-text', {
      text,
      source_language: sourceLanguage,
      target_language: targetLanguage,
    });
  }

  /**
   * Request bidirectional translation for an authorized document's OCR text.
   */
  async triggerTranslation(
    documentId: string,
    sourceLanguage: string = 'kn',
    targetLanguage: string = 'en',
    textSource: 'RAW_OCR' | 'REVIEWED_OCR' = 'REVIEWED_OCR'
  ): Promise<TranslationRecord> {
    if (USE_MOCK_API) {
      await delay(450);
      const isKnToEn = sourceLanguage === 'kn';
      const sampleTranslated = isKnToEn
        ? '[English Translation]\nOfficial Citizen Grievance Petition\nTo: The Deputy Commissioner, Bengaluru Urban District.\nSubject: Land Encroachment and Unauthorized Construction in South Taluk.\nAction Requested: Conduct spot inspection and initiate inquiry.'
        : '[ಕನ್ನಡ ಭಾಷಾಂತರ]\nಅಧಿಕೃತ ನಾಗರಿಕ ಕುಂದುಕೊರತೆ ಅರ್ಜಿ\nಗೆ: ಮಾನ್ಯ ಜಿಲ್ಲಾಧಿಕಾರಿಗಳು, ಬೆಂಗಳೂರು ನಗರ ಜಿಲ್ಲೆ.\nವಿಷಯ: ದಕ್ಷಿಣ ತಾಲ್ಲೂಕಿನಲ್ಲಿ ಭೂ ಒತ್ತುವರಿ ಮತ್ತು ಅನಧಿಕೃತ ನಿರ್ಮಾಣ ಕುರಿತು.\nಕೋರಿದ ಕ್ರಮ: ಸ್ಥಳ ಪರಿಶೀಲನೆ ನಡೆಸಿ ತನಿಖೆ ಕೈಗೊಳ್ಳಲು ವಿನಂತಿ.';

      return {
        id: `trans-${Date.now()}`,
        document_id: documentId,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        text_source: textSource,
        source_text: 'Sample input document text',
        translated_text: sampleTranslated,
        corrected_text: sampleTranslated,
        provider_name: 'JanSetu-LocalAdministrativeEngine',
        model_version: 'admin-lexicon-v2.1',
        status: 'COMPLETED',
        created_at: new Date().toISOString(),
      };
    }

    return apiClient.post<TranslationRecord>(
      `/documents/${documentId}/translate`,
      {
        source_language: sourceLanguage,
        target_language: targetLanguage,
        text_source: textSource,
      }
    );
  }

  /**
   * Fetch all historical translation records for a document.
   */
  async listDocumentTranslations(
    documentId: string
  ): Promise<TranslationRecord[]> {
    if (USE_MOCK_API) {
      await delay(50);
      return [];
    }
    return apiClient.get<TranslationRecord[]>(
      `/documents/${documentId}/translations`
    );
  }

  /**
   * Retrieve a specific translation record by ID.
   */
  async getTranslation(translationId: string): Promise<TranslationRecord> {
    if (USE_MOCK_API) {
      await delay(50);
      return {
        id: translationId,
        document_id: 'doc-mock',
        source_language: 'kn',
        target_language: 'en',
        text_source: 'REVIEWED_OCR',
        source_text: 'Sample source text',
        translated_text: 'Sample translation',
        corrected_text: 'Sample translation',
        provider_name: 'JanSetu-LocalAdministrativeEngine',
        status: 'COMPLETED',
        created_at: new Date().toISOString(),
      };
    }
    return apiClient.get<TranslationRecord>(`/translations/${translationId}`);
  }

  /**
   * Submit human-reviewed / corrected translation text.
   */
  async reviewTranslation(
    translationId: string,
    correctedText: string
  ): Promise<TranslationRecord> {
    if (USE_MOCK_API) {
      await delay(150);
      return {
        id: translationId,
        document_id: 'doc-mock',
        source_language: 'kn',
        target_language: 'en',
        text_source: 'REVIEWED_OCR',
        source_text: 'Sample source text',
        translated_text: 'Sample machine translation',
        corrected_text: correctedText,
        provider_name: 'JanSetu-LocalAdministrativeEngine',
        status: 'UNDER_REVIEW',
        reviewed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
    }
    return apiClient.patch<TranslationRecord>(
      `/translations/${translationId}/review`,
      {
        corrected_text: correctedText,
      }
    );
  }

  /**
   * Officially approve a translation (Officer or Supervisor authority).
   */
  async approveTranslation(translationId: string): Promise<TranslationRecord> {
    if (USE_MOCK_API) {
      await delay(200);
      return {
        id: translationId,
        document_id: 'doc-mock',
        source_language: 'kn',
        target_language: 'en',
        text_source: 'REVIEWED_OCR',
        source_text: 'Sample source text',
        translated_text: 'Sample machine translation',
        corrected_text: 'Sample approved translation',
        provider_name: 'JanSetu-LocalAdministrativeEngine',
        status: 'APPROVED',
        approved_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
    }
    return apiClient.post<TranslationRecord>(
      `/translations/${translationId}/approve`,
      {}
    );
  }

  /**
   * Get direct download URL for approved translated document.
   */
  getDownloadUrl(translationId: string, format: 'txt' | 'pdf' = 'txt'): string {
    return `/api/v1/translations/${translationId}/download?format=${format}`;
  }

  /**
   * Download the approved translated document with file saving in browser.
   */
  async downloadApprovedTranslation(
    translationId: string,
    format: 'txt' | 'pdf' = 'txt',
    filename?: string
  ): Promise<void> {
    if (USE_MOCK_API) {
      await delay(100);
      const blob = new Blob(
        ['Official Verified Translation Document\nLanguage: English / Kannada'],
        { type: format === 'pdf' ? 'application/pdf' : 'text/plain;charset=utf-8' }
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `approved_translation_${translationId}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      return;
    }

    const token = tokenStorage.getAccessToken();
    const downloadEndpoint = `${API_BASE_URL}/translations/${translationId}/download?format=${format}`;
    const response = await fetch(downloadEndpoint, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('text/html')) {
      const htmlText = await response.text();
      if (
        htmlText.includes('<!doctype html') ||
        htmlText.includes('/@vite/client') ||
        htmlText.includes('<html')
      ) {
        throw new Error('Unexpected HTML response received instead of translation file.');
      }
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `approved_translation_${translationId}.${format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

export const translationsService = new TranslationsService();

