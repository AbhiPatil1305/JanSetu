import { apiClient, delay, USE_MOCK_API } from './client';

export type OcrStatus = 'NOT_STARTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'NEEDS_REVIEW';

export interface OcrEngineStatus {
  installed: boolean;
  version?: string | null;
  languages: string[];
  tesseract_cmd?: string | null;
  supports_english: boolean;
  supports_kannada: boolean;
}

export interface DocumentOcrResponse {
  id: string;
  grievance_id: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  document_type: string;
  language: string;
  ocr_status: OcrStatus;
  ocr_language?: string | null;
  ocr_pages_data?: Array<{
    page_number: number;
    extracted_text: string;
    method?: string;
    confidence?: number | null;
    char_count?: number;
  }> | null;
  extracted_text?: string | null;
  reviewed_text?: string | null;
  ocr_reviewed_by?: string | null;
  ocr_reviewed_at?: string | null;
  ocr_processed_at?: string | null;
  ocr_error?: string | null;
  created_at: string;
  updated_at: string;
}

export class DocumentsService {
  /**
   * Check system OCR engine availability, version, and installed language traineddata.
   */
  async getOcrEngineStatus(): Promise<OcrEngineStatus> {
    if (USE_MOCK_API) {
      await delay(50);
      return {
        installed: true,
        version: '5.3.0',
        languages: ['eng', 'kan'],
        supports_english: true,
        supports_kannada: true,
      };
    }
    return apiClient.get<OcrEngineStatus>('/documents/ocr/status');
  }

  /**
   * Trigger OCR text extraction for an uploaded document.
   */
  async triggerDocumentOcr(
    documentId: string,
    languages: string = 'eng+kan'
  ): Promise<DocumentOcrResponse> {
    if (USE_MOCK_API) {
      await delay(400);
      return {
        id: documentId,
        grievance_id: 'mock-grv',
        original_filename: 'mock_doc.pdf',
        mime_type: 'application/pdf',
        file_size: 102400,
        document_type: 'PETITION',
        language: 'en',
        ocr_status: 'COMPLETED',
        extracted_text:
          'Mock extracted text for development mode. Document contains formal citizen request for district administrative review.',
        reviewed_text:
          'Mock extracted text for development mode. Document contains formal citizen request for district administrative review.',
        ocr_reviewed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    return apiClient.post<DocumentOcrResponse>(`/documents/${documentId}/ocr`, {
      languages,
    });
  }

  /**
   * Fetch current OCR extraction result and human review text for an uploaded document.
   */
  async getDocumentOcr(documentId: string): Promise<DocumentOcrResponse> {
    if (USE_MOCK_API) {
      await delay(100);
      return {
        id: documentId,
        grievance_id: 'mock-grv',
        original_filename: 'mock_doc.pdf',
        mime_type: 'application/pdf',
        file_size: 102400,
        document_type: 'PETITION',
        language: 'en',
        ocr_status: 'COMPLETED',
        extracted_text:
          'Mock extracted text for development mode. Document contains formal citizen request.',
        reviewed_text:
          'Mock extracted text for development mode. Document contains formal citizen request.',
        ocr_reviewed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    return apiClient.get<DocumentOcrResponse>(`/documents/${documentId}/ocr`);
  }

  /**
   * Save human-reviewed / corrected OCR text while preserving raw extracted text intact.
   */
  async reviewDocumentOcr(
    documentId: string,
    reviewedText: string,
    markStatus?: 'COMPLETED' | 'NEEDS_REVIEW'
  ): Promise<DocumentOcrResponse> {
    if (USE_MOCK_API) {
      await delay(150);
      return {
        id: documentId,
        grievance_id: 'mock-grv',
        original_filename: 'mock_doc.pdf',
        mime_type: 'application/pdf',
        file_size: 102400,
        document_type: 'PETITION',
        language: 'en',
        ocr_status: markStatus || 'COMPLETED',
        extracted_text: 'Mock original extracted text',
        reviewed_text: reviewedText,
        ocr_reviewed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    return apiClient.patch<DocumentOcrResponse>(`/documents/${documentId}/ocr/review`, {
      reviewed_text: reviewedText,
      mark_status: markStatus,
    });
  }

  /**
   * Direct file text extraction / OCR before grievance registration.
   */
  async extractTextFromFile(
    file: File,
    languages: string = 'eng+kan'
  ): Promise<{
    filename: string;
    extracted_text: string;
    reviewed_text: string;
    pages_data: any[];
    ocr_status: OcrStatus;
    ocr_error?: string | null;
    languages: string;
    extracted_fields?: {
      citizen_name?: string;
      citizen_name_kn?: string;
      phone?: string;
      email?: string;
      address?: string;
      address_kn?: string;
      district?: string;
      district_kn?: string;
      taluk?: string;
      taluk_kn?: string;
      village_locality?: string;
      village_locality_kn?: string;
      title?: string;
      title_kn?: string;
      category?: string;
      category_kn?: string;
      incident_date?: string;
      incident_location?: string;
      incident_location_kn?: string;
      description?: string;
      description_kn?: string;
      requested_action?: string;
      requested_action_kn?: string;
      assignment_instructions_en?: string;
      assignment_instructions_kn?: string;
      language?: 'kannada' | 'english' | 'bilingual';
      confidence_scores?: {
        citizen?: 'HIGH' | 'NEEDS_REVIEW' | 'MISSING';
        category?: 'HIGH' | 'NEEDS_REVIEW' | 'MISSING';
        location?: 'HIGH' | 'NEEDS_REVIEW' | 'MISSING';
        date?: 'HIGH' | 'NEEDS_REVIEW' | 'MISSING';
      };
    };
  }> {
    if (USE_MOCK_API) {
      await delay(300);
      return {
        filename: file.name,
        extracted_text: 'Extracted text from ' + file.name,
        reviewed_text: 'Extracted text from ' + file.name,
        pages_data: [],
        ocr_status: 'COMPLETED',
        languages,
      };
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('languages', languages);
    return apiClient.upload('/documents/extract-text', formData);
  }
  /**
   * Extract form fields from raw or reviewed petition text using backend parser.
   */
  async extractFormFields(text: string): Promise<any> {
    if (USE_MOCK_API) {
      await delay(100);
      return null;
    }
    return apiClient.post('/documents/extract-form-fields', { text });
  }
}

export const documentsService = new DocumentsService();
