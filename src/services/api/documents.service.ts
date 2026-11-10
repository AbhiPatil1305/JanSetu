import { apiClient, delay, USE_MOCK_API, tokenStorage, API_BASE_URL } from './client';

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
      phone?: string;
      email?: string;
      address?: string;
      district?: string;
      taluk?: string;
      village_locality?: string;
      title?: string;
      category?: string;
      incident_date?: string;
      incident_location?: string;
      description?: string;
      requested_action?: string;
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

  /**
   * Download a grievance document file directly with auth headers.
   */
  async downloadDocument(documentId: string, filename?: string): Promise<void> {
    if (USE_MOCK_API) {
      await delay(100);
      const blob = new Blob(['Mock document content'], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `document_${documentId}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      return;
    }

    const token = tokenStorage.getAccessToken();
    const downloadEndpoint = `${API_BASE_URL}/documents/${documentId}/download`;
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
        htmlText.includes('/src/main.tsx') ||
        htmlText.includes('<div id="root">')
      ) {
        throw new Error(
          'Document download error: Received Vite frontend HTML fallback instead of document file. Ensure backend is running.'
        );
      }
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `document_${documentId}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  /**
   * Fetch document preview / text content for inline reading.
   */
  async getDocumentTextContent(documentId: string): Promise<string> {
    if (USE_MOCK_API) {
      await delay(100);
      return 'Mock document text content for preview.';
    }

    const token = tokenStorage.getAccessToken();
    const previewEndpoint = `${API_BASE_URL}/documents/${documentId}/download?preview=true`;
    const response = await fetch(previewEndpoint, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Preview failed with status ${response.status}`);
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    const text = await response.text();
    if (
      contentType.includes('text/html') ||
      text.includes('<!doctype html') ||
      text.includes('/@vite/client') ||
      text.includes('/src/main.tsx')
    ) {
      throw new Error('Received unexpected HTML fallback instead of document text content.');
    }

    return text;
  }

  /**
   * Fetch document as a local authenticated Blob URL for preview (PDF, Image, Text, Docx).
   */
  async getDocumentBlobUrl(
    documentId: string
  ): Promise<{
    url: string;
    mimeType: string;
    isText: boolean;
    isImage: boolean;
    isPdf: boolean;
    isDocx: boolean;
    text?: string;
  }> {
    if (USE_MOCK_API) {
      await delay(100);
      const blob = new Blob(['Mock document content for offline preview.'], { type: 'text/plain' });
      return {
        url: window.URL.createObjectURL(blob),
        mimeType: 'text/plain',
        isText: true,
        isImage: false,
        isPdf: false,
        isDocx: false,
        text: 'Mock document content for offline preview.',
      };
    }

    const token = tokenStorage.getAccessToken();
    const previewEndpoint = `${API_BASE_URL}/documents/${documentId}/download?preview=true`;
    const response = await fetch(previewEndpoint, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Document retrieval failed with HTTP ${response.status}`);
    }

    const contentType = (response.headers.get('content-type') || 'application/octet-stream').toLowerCase();

    // Check for accidental Vite / SPA HTML fallback
    if (contentType.includes('text/html')) {
      const textSample = await response.text();
      if (
        textSample.includes('<!doctype html') ||
        textSample.includes('/@vite/client') ||
        textSample.includes('/src/main.tsx') ||
        textSample.includes('<div id="root">')
      ) {
        throw new Error(
          'Document preview error: Received Vite frontend HTML fallback instead of binary document. Ensure the backend API is running.'
        );
      }
    }

    const isPdf = contentType.includes('application/pdf');
    const isImage = contentType.startsWith('image/');
    const isDocx =
      contentType.includes('wordprocessingml') ||
      contentType.includes('msword') ||
      contentType.includes('application/vnd.openxmlformats');
    const isText =
      (contentType.startsWith('text/plain') ||
        contentType.includes('application/json') ||
        contentType.includes('text/csv')) &&
      !contentType.includes('text/html');

    if (isText) {
      const text = await response.text();
      if (
        text.trim().toLowerCase().startsWith('<!doctype html') ||
        text.includes('/@vite/client') ||
        text.includes('<html')
      ) {
        throw new Error('Received unexpected HTML response instead of document text content.');
      }
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      return {
        url: window.URL.createObjectURL(blob),
        mimeType: contentType,
        isText: true,
        isImage: false,
        isPdf: false,
        isDocx: false,
        text,
      };
    }

    const blob = await response.blob();
    return {
      url: window.URL.createObjectURL(blob),
      mimeType: contentType,
      isText: false,
      isImage,
      isPdf,
      isDocx,
    };
  }
}

export const documentsService = new DocumentsService();
