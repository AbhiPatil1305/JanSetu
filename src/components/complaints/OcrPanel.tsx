import React, { useState, useEffect } from 'react';
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Edit3,
  Save,
  Globe,
  ZoomIn,
  ZoomOut,
  Info,
  Cpu,
  Layers,
  Languages,
  ArrowLeftRight,
  ShieldCheck,
  History,
  Copy,
  Check,
  Sparkles,
  Download,
  Eye,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { Modal } from '../common/Modal';
import {
  documentsService,
  OcrStatus,
  DocumentOcrResponse,
  OcrEngineStatus,
} from '../../services/api/documents.service';
import {
  translationsService,
  TranslationRecord,
  TranslationEngineStatus,
} from '../../services/api/translations.service';

interface OcrPanelProps {
  documentId?: string;
  documentName?: string;
  file?: { name: string; size: number; url?: string } | null;
  rawFile?: File | null;
  rawText?: string;
  reviewedText?: string;
  onRawTextChange?: (text: string) => void;
  onReviewedTextChange?: (text: string) => void;
  onSaveReviewedText?: (reviewedText: string) => Promise<void> | void;
  onTranslatedTextChange?: (text: string, targetLang: 'en' | 'kn') => void;
  onCheckGrammar?: (text: string) => void;
}

const isKannadaText = (str: string): boolean => {
  return /[\u0C80-\u0CFF]/.test(str || '');
};

export const OcrPanel: React.FC<OcrPanelProps> = ({
  documentId,
  documentName,
  file,
  rawFile,
  rawText = '',
  reviewedText = '',
  onRawTextChange,
  onReviewedTextChange,
  onSaveReviewedText,
  onTranslatedTextChange,
  onCheckGrammar,
}) => {
  // OCR state
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>(
    rawText ? 'COMPLETED' : 'NOT_STARTED'
  );
  const [selectedLanguage, setSelectedLanguage] = useState<string>('eng+kan');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSavingReview, setIsSavingReview] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [localRawText, setLocalRawText] = useState<string>(rawText);
  const [localReviewedText, setLocalReviewedText] = useState<string>(
    reviewedText || rawText
  );
  const [activeTextView, setActiveTextView] = useState<'reviewed' | 'raw'>(
    'reviewed'
  );
  const [engineStatus, setEngineStatus] = useState<OcrEngineStatus | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Translation state
  const [sourceLang, setSourceLang] = useState<'kn' | 'en'>('kn');
  const [targetLang, setTargetLang] = useState<'en' | 'kn'>('en');
  const [textSource, setTextSource] = useState<'REVIEWED_OCR' | 'RAW_OCR'>('REVIEWED_OCR');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isSavingTransReview, setIsSavingTransReview] = useState<boolean>(false);
  const [isApprovingTrans, setIsApprovingTrans] = useState<boolean>(false);
  const [transErrorMessage, setTransErrorMessage] = useState<string | null>(null);
  const [transSuccessMsg, setTransSuccessMsg] = useState<string | null>(null);

  const [activeTranslation, setActiveTranslation] = useState<TranslationRecord | null>(null);
  const [editableTranslatedText, setEditableTranslatedText] = useState<string>('');
  const [translationHistory, setTranslationHistory] = useState<TranslationRecord[]>([]);
  const [transEngineStatus, setTransEngineStatus] = useState<TranslationEngineStatus | null>(null);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [isCopiedOriginal, setIsCopiedOriginal] = useState<boolean>(false);
  const [isCopiedTranslated, setIsCopiedTranslated] = useState<boolean>(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [isDownloadingApproved, setIsDownloadingApproved] = useState<boolean>(false);

  const handleDownloadApproved = async (format: 'txt' | 'pdf' = 'txt') => {
    if (!activeTranslation) return;
    setIsDownloadingApproved(true);
    try {
      await translationsService.downloadApprovedTranslation(
        activeTranslation.id,
        format,
        `approved_translation_${activeTranslation.id}.${format}`
      );
    } catch (err: any) {
      setTransErrorMessage('Failed to download document: ' + (err?.message || 'Network error'));
    } finally {
      setIsDownloadingApproved(false);
    }
  };

  // Auto-detect language when text arrives and no active translation has been set
  useEffect(() => {
    const current = localReviewedText || localRawText;
    if (current && !activeTranslation) {
      const isKan = isKannadaText(current);
      setSourceLang(isKan ? 'kn' : 'en');
      setTargetLang(isKan ? 'en' : 'kn');
    }
  }, [localRawText, localReviewedText, activeTranslation]);

  // Sync props if changed externally
  useEffect(() => {
    if (rawText) setLocalRawText(rawText);
    if (reviewedText) setLocalReviewedText(reviewedText);
    if (rawText && ocrStatus === 'NOT_STARTED') setOcrStatus('COMPLETED');
  }, [rawText, reviewedText]);

  // Check OCR and Translation engine status on mount
  useEffect(() => {
    documentsService
      .getOcrEngineStatus()
      .then((st) => setEngineStatus(st))
      .catch(() => {
        setEngineStatus({
          installed: false,
          languages: [],
          supports_english: false,
          supports_kannada: false,
        });
      });

    translationsService
      .getEngineStatus()
      .then((st) => setTransEngineStatus(st))
      .catch(() => {
        setTransEngineStatus(null);
      });
  }, []);

  // Fetch existing OCR results when documentId is provided
  useEffect(() => {
    if (documentId) {
      documentsService
        .getDocumentOcr(documentId)
        .then((doc) => {
          if (doc.ocr_status) {
            setOcrStatus(doc.ocr_status);
          }
          if (doc.extracted_text) {
            setLocalRawText(doc.extracted_text);
            onRawTextChange?.(doc.extracted_text);
          }
          if (doc.reviewed_text) {
            setLocalReviewedText(doc.reviewed_text);
            onReviewedTextChange?.(doc.reviewed_text);
          }
          if (doc.ocr_error) {
            setErrorMessage(doc.ocr_error);
          }
        })
        .catch(() => {
          // Document not OCR processed yet
        });

      // Load translations for this document
      translationsService
        .listDocumentTranslations(documentId)
        .then((records) => {
          setTranslationHistory(records);
          if (records.length > 0 && !activeTranslation) {
            setActiveTranslation(records[0]);
            const text = records[0].corrected_text || records[0].translated_text || '';
            setEditableTranslatedText(text);
          }
        })
        .catch(() => {
          // ignore
        });
    }
  }, [documentId]);

  const handleExtractText = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setOcrStatus('PROCESSING');
    setSaveSuccessMsg(null);

    try {
      if (documentId) {
        const res: DocumentOcrResponse = await documentsService.triggerDocumentOcr(
          documentId,
          selectedLanguage
        );
        setOcrStatus(res.ocr_status);
        if (res.ocr_status === 'FAILED') {
          setErrorMessage(
            res.ocr_error || 'OCR processing failed on server for this document.'
          );
        } else {
          const extracted = res.extracted_text || '';
          const reviewed = res.reviewed_text || extracted;
          setLocalRawText(extracted);
          setLocalReviewedText(reviewed);
          onRawTextChange?.(extracted);
          onReviewedTextChange?.(reviewed);
        }
      } else if (rawFile) {
        const res = await documentsService.extractTextFromFile(rawFile, selectedLanguage);
        setOcrStatus(res.ocr_status);
        if (res.ocr_status === 'FAILED') {
          setErrorMessage(
            res.ocr_error || 'OCR processing failed on server for this document.'
          );
        } else {
          const extracted = res.extracted_text || '';
          const reviewed = res.reviewed_text || extracted;
          setLocalRawText(extracted);
          setLocalReviewedText(reviewed);
          onRawTextChange?.(extracted);
          onReviewedTextChange?.(reviewed);
        }
      } else {
        setOcrStatus('FAILED');
        setErrorMessage('No valid file or document ID provided for OCR text extraction.');
      }
    } catch (err: any) {
      setOcrStatus('FAILED');
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        'An unexpected error occurred during OCR extraction.';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveReview = async () => {
    setIsSavingReview(true);
    setSaveSuccessMsg(null);
    setErrorMessage(null);

    try {
      if (documentId) {
        await documentsService.reviewDocumentOcr(
          documentId,
          localReviewedText,
          'COMPLETED'
        );
      }
      if (onSaveReviewedText) {
        await onSaveReviewedText(localReviewedText);
      }
      onReviewedTextChange?.(localReviewedText);
      setSaveSuccessMsg('Reviewed petition text saved successfully!');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to save reviewed text.';
      setErrorMessage(msg);
    } finally {
      setIsSavingReview(false);
    }
  };

  const handleSwapTranslationDirection = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  };

  const handleTriggerTranslation = async () => {
    const inputForTrans =
      textSource === 'REVIEWED_OCR'
        ? localReviewedText || localRawText
        : localRawText;

    if (!inputForTrans || !inputForTrans.trim()) {
      setTransErrorMessage(
        'Cannot translate: petition text is empty. Extract or enter text first.'
      );
      return;
    }

    setIsTranslating(true);
    setTransErrorMessage(null);
    setTransSuccessMsg(null);

    try {
      if (documentId) {
        const transRecord = await translationsService.triggerTranslation(
          documentId,
          sourceLang,
          targetLang,
          textSource
        );
        setActiveTranslation(transRecord);
        const translatedOutput = transRecord.corrected_text || transRecord.translated_text || '';
        setEditableTranslatedText(translatedOutput);
        setTranslationHistory((prev) => [transRecord, ...prev]);
        onTranslatedTextChange?.(translatedOutput, targetLang);

        if (transRecord.status === 'FAILED') {
          setTransErrorMessage(
            transRecord.error_message || 'Translation failed on server.'
          );
        } else {
          setTransSuccessMsg('Document successfully translated!');
          setTimeout(() => setTransSuccessMsg(null), 3500);
        }
      } else {
        // Real neural translation for pre-registration intake
        const res = await translationsService.translateText(
          inputForTrans,
          sourceLang,
          targetLang
        );
        const translatedOutput = res.translated_text || '';

        const realRecord: TranslationRecord = {
          id: `trans-${Date.now()}`,
          document_id: 'adhoc-intake',
          source_language: sourceLang,
          target_language: targetLang,
          text_source: textSource,
          source_text: inputForTrans,
          translated_text: translatedOutput,
          corrected_text: translatedOutput,
          provider_name: res.provider_name || transEngineStatus?.provider_name || 'AI4Bharat-IndicTrans2',
          model_version: 'indictrans2-200M',
          status: 'COMPLETED',
          created_at: new Date().toISOString(),
        };
        setActiveTranslation(realRecord);
        setEditableTranslatedText(translatedOutput);
        setTranslationHistory((prev) => [realRecord, ...prev]);
        onTranslatedTextChange?.(translatedOutput, targetLang);
        setTransSuccessMsg('Live translation completed!');
        setTimeout(() => setTransSuccessMsg(null), 3500);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        'An unexpected error occurred during translation.';
      setTransErrorMessage(msg);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSaveTranslationCorrections = async () => {
    if (!activeTranslation) return;
    setIsSavingTransReview(true);
    setTransErrorMessage(null);
    setTransSuccessMsg(null);

    try {
      if (documentId && !activeTranslation.id.startsWith('trans-')) {
        const updated = await translationsService.reviewTranslation(
          activeTranslation.id,
          editableTranslatedText
        );
        setActiveTranslation(updated);
        setTranslationHistory((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t))
        );
      } else {
        setActiveTranslation({
          ...activeTranslation,
          corrected_text: editableTranslatedText,
          status: 'UNDER_REVIEW',
        });
      }
      onTranslatedTextChange?.(editableTranslatedText, targetLang);
      setTransSuccessMsg('Human translation corrections saved!');
      setTimeout(() => setTransSuccessMsg(null), 3000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to save translation corrections.';
      setTransErrorMessage(msg);
    } finally {
      setIsSavingTransReview(false);
    }
  };

  const handleApproveTranslation = async () => {
    if (!activeTranslation) return;
    setIsApprovingTrans(true);
    setTransErrorMessage(null);
    setTransSuccessMsg(null);

    try {
      if (documentId && !activeTranslation.id.startsWith('trans-')) {
        const approved = await translationsService.approveTranslation(
          activeTranslation.id
        );
        setActiveTranslation(approved);
        setTranslationHistory((prev) =>
          prev.map((t) => (t.id === approved.id ? approved : t))
        );
      } else {
        setActiveTranslation({
          ...activeTranslation,
          status: 'APPROVED',
          approved_at: new Date().toISOString(),
        });
      }
      setTransSuccessMsg('Translation officially approved!');
      setTimeout(() => setTransSuccessMsg(null), 3500);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        'Approval failed. Operator role may lack authorization.';
      setTransErrorMessage(msg);
    } finally {
      setIsApprovingTrans(false);
    }
  };

  const copyToClipboard = (text: string, type: 'original' | 'translated') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'original') {
      setIsCopiedOriginal(true);
      setTimeout(() => setIsCopiedOriginal(false), 2000);
    } else {
      setIsCopiedTranslated(true);
      setTimeout(() => setIsCopiedTranslated(false), 2000);
    }
  };

  const renderOcrStatusBadge = () => {
    switch (ocrStatus) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            OCR Extracted
          </span>
        );
      case 'NEEDS_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5" />
            Needs Review
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Processing OCR...
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
            <AlertTriangle className="w-3.5 h-3.5" />
            OCR Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
            <Info className="w-3.5 h-3.5" />
            Not Extracted
          </span>
        );
    }
  };

  const isKannada = isKannadaText(localReviewedText || localRawText);

  return (
    <div className="space-y-6">
      {/* ============================================================== */}
      {/* 1. CENTERED ORIGINAL DOCUMENT PREVIEW CARD                      */}
      {/* ============================================================== */}
      <Card className="w-full shadow-sm border border-slate-200 overflow-hidden">
        <CardHeader className="py-3 px-4 sm:px-6 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Document Info & Zoom Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 flex-shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-800 block truncate max-w-[240px] sm:max-w-md">
                  {documentName || file?.name || 'Original Petition Document'}
                </span>
                <span className="text-[11px] text-slate-500">
                  {file?.size ? `${Math.round(file.size / 1024)} KB` : 'Preserved Document'} &bull; Digital Archival
                </span>
              </div>
            </div>

            <div className="h-4 w-px bg-slate-300 hidden sm:block" />

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-1.5 py-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(60, z - 20))}
                className="p-1 rounded hover:bg-slate-100 text-slate-600 transition"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[11px] w-9 text-center text-slate-700">
                {zoomLevel}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(180, z + 20))}
                className="p-1 rounded hover:bg-slate-100 text-slate-600 transition"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(100)}
                className="text-[10px] text-slate-500 hover:text-slate-800 px-1 border-l border-slate-200 ml-0.5"
                title="Reset Zoom"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Right: OCR Actions & Status */}
          <div className="flex flex-wrap items-center gap-2">
            {renderOcrStatusBadge()}

            {documentId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  documentsService.downloadDocument(documentId, documentName || 'original_petition');
                }}
                leftIcon={<Download className="w-3.5 h-3.5 text-slate-600" />}
                title="Download original citizen petition document"
              >
                Download Original
              </Button>
            )}

            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                disabled={isProcessing}
                className="bg-transparent text-xs text-slate-700 font-medium outline-none cursor-pointer"
              >
                <option value="eng+kan">Bilingual (English + Kannada)</option>
                <option value="kan">Kannada (kan)</option>
                <option value="eng">English (eng)</option>
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExtractText}
              isLoading={isProcessing}
              leftIcon={
                ocrStatus === 'FAILED' ? (
                  <RefreshCw className="w-3.5 h-3.5" />
                ) : (
                  <Layers className="w-3.5 h-3.5" />
                )
              }
            >
              {ocrStatus === 'FAILED'
                ? 'Retry OCR'
                : ocrStatus === 'COMPLETED'
                ? 'Re-extract OCR'
                : 'Extract OCR'}
            </Button>
          </div>
        </CardHeader>

        {/* Centered Document Body */}
        <CardContent className="p-3 sm:p-5 bg-slate-950 flex justify-center items-center">
          <div className="w-full max-w-4xl h-[380px] sm:h-[430px] md:h-[460px] bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex justify-center items-center shadow-inner relative">
            {file?.url && (file.name.toLowerCase().endsWith('.pdf') || file.url.toLowerCase().includes('.pdf') || file.url.includes('/preview')) ? (
              <iframe
                src={file.url}
                title={documentName || file.name || 'Document Preview'}
                className="w-full h-full border-0 bg-white"
              />
            ) : file?.url && (file.name.toLowerCase().match(/\.(png|jpe?g|webp|bmp)$/i)) ? (
              <div className="w-full h-full flex items-center justify-center p-3 overflow-auto bg-slate-950">
                <img
                  src={file.url}
                  alt={documentName || file.name || 'Document Preview'}
                  style={{
                    transform: `scale(${zoomLevel / 100})`,
                    transformOrigin: 'center center',
                  }}
                  className="max-w-full max-h-full object-contain rounded transition-transform duration-150"
                />
              </div>
            ) : (
              <div className="w-full h-full p-6 overflow-y-auto bg-slate-950 text-slate-200">
                <div
                  style={{
                    transform: `scale(${zoomLevel / 100})`,
                    transformOrigin: 'top left',
                  }}
                  className="space-y-3"
                >
                  <div className="text-center pb-2 border-b border-slate-800 text-slate-500 uppercase text-[10px] tracking-widest font-mono">
                    {documentName || file?.name || 'Petition Document Archive'} &bull;{' '}
                    {file?.size ? `${Math.round(file.size / 1024)} KB` : 'Preserved'}
                  </div>
                  <pre className="whitespace-pre-wrap leading-relaxed text-slate-300 font-mono text-xs">
                    {localRawText ||
                      'Visual preview is generated upon document render. Extracted petition text is available below.'}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Global Error Notice if OCR extraction failed */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">OCR Extraction Notice</p>
            <p className="leading-relaxed">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. TWO EQUAL CARDS SIDE-BY-SIDE BELOW CENTERED DOCUMENT       */}
      {/*    Left: Original Document Content (English or Kannada)        */}
      {/*    Right: Blank Translation Card with Translate Button         */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ------------------------------------------------------------ */}
        {/* LEFT CARD: ORIGINAL PETITION CONTENT (ENGLISH OR KANNADA)    */}
        {/* ------------------------------------------------------------ */}
        <Card className="flex flex-col h-full border border-slate-200 shadow-sm">
          <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              <CardTitle className="text-sm font-bold text-slate-900">
                Original Petition Text
              </CardTitle>

              {/* Language Tag */}
              {isKannada ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 font-kannada">
                  ಕನ್ನಡ (Kannada)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-800 border border-slate-300">
                  English
                </span>
              )}
            </div>

            {/* Right actions: Toggle View, Copy, Save */}
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTextView('reviewed')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    activeTextView === 'reviewed'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Reviewed (Editable)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTextView('raw')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    activeTextView === 'raw'
                      ? 'bg-slate-800 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Raw OCR
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    activeTextView === 'reviewed' ? localReviewedText : localRawText,
                    'original'
                  )
                }
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition"
                title="Copy Original Text"
              >
                {isCopiedOriginal ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>

              {activeTextView === 'reviewed' && (
                <>
                  {onCheckGrammar && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onCheckGrammar(localReviewedText || localRawText)}
                      leftIcon={<Sparkles className="w-3.5 h-3.5 text-indigo-600" />}
                      className="bg-indigo-50/80 border-indigo-200 text-indigo-800 hover:bg-indigo-100 font-semibold"
                      title="Check spelling, grammar, and typography with local Qwen2.5 1.5B"
                    >
                      Check Grammar & Spelling
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveReview}
                    isLoading={isSavingReview}
                    leftIcon={<Save className="w-3.5 h-3.5" />}
                  >
                    Save
                  </Button>
                </>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-4 flex-1 flex flex-col space-y-3">
            {saveSuccessMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {activeTextView === 'reviewed' ? (
              <div className="flex-1 flex flex-col space-y-2 min-h-[320px]">
                <textarea
                  rows={15}
                  value={localReviewedText}
                  onChange={(e) => {
                    setLocalReviewedText(e.target.value);
                    onReviewedTextChange?.(e.target.value);
                  }}
                  placeholder="Original petition text extracted via OCR. Verify or edit any misread characters before translating..."
                  className={`w-full flex-1 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-amber-600 outline-none leading-relaxed text-xs shadow-2xs ${
                    isKannada ? 'font-kannada text-sm leading-relaxed' : 'font-mono'
                  }`}
                />
                <div className="flex justify-between items-center text-[11px] text-slate-500 px-1 pt-1">
                  <span>
                    {localReviewedText.length} characters &bull;{' '}
                    {localReviewedText.trim() ? localReviewedText.trim().split(/\s+/).length : 0} words
                  </span>
                  <span className="text-amber-800 font-medium">Human Verified Text</span>
                </div>
                {onCheckGrammar && (
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-lg text-xs mt-1">
                    <div className="flex items-center gap-2 text-indigo-900 font-medium text-[11px]">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Verify spelling, Kannada typos, and grammar on OCR petition text.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onCheckGrammar(localReviewedText || localRawText)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Check Grammar & Spelling</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col space-y-2 min-h-[320px]">
                <pre className="w-full flex-1 p-3.5 bg-slate-900 text-emerald-400 border border-slate-800 rounded-xl leading-relaxed text-xs font-mono overflow-y-auto whitespace-pre-wrap select-all">
                  {localRawText || 'No raw OCR data available.'}
                </pre>
                <div className="flex justify-between items-center text-[11px] text-slate-500 px-1 pt-1">
                  <span>{localRawText.length} characters</span>
                  <span className="text-slate-400">Immutable Raw Tesseract Capture</span>
                </div>
              </div>
            )}

            <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-amber-700 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Verified Intake:</strong> The verified original text on the left serves as the ground-truth input for neural translation on the right.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ------------------------------------------------------------ */}
        {/* RIGHT CARD: TRANSLATED CONTENT (BLANK WITH TRANSLATE BUTTON) */}
        {/* ------------------------------------------------------------ */}
        <Card className="flex flex-col h-full border border-slate-200 shadow-sm">
          <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-blue-600" />
              <CardTitle className="text-sm font-bold text-slate-900">
                Translated Content
              </CardTitle>

              {/* Language Direction Badge with Swap Button */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs">
                <span className={sourceLang === 'kn' ? 'font-kannada font-bold text-amber-700' : 'font-bold'}>
                  {sourceLang === 'kn' ? 'ಕನ್ನಡ' : 'English'}
                </span>
                <button
                  type="button"
                  onClick={handleSwapTranslationDirection}
                  className="p-0.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-900 transition"
                  title="Swap translation direction"
                >
                  <ArrowLeftRight className="w-3 h-3 text-slate-400" />
                </button>
                <span className={targetLang === 'kn' ? 'font-kannada font-bold text-blue-700' : 'font-bold text-blue-700'}>
                  {targetLang === 'kn' ? 'ಕನ್ನಡ' : 'English'}
                </span>
              </div>
            </div>

            {/* Right actions */}
            <div className="flex flex-wrap items-center gap-2">
              {editableTranslatedText && (
                <>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(editableTranslatedText, 'translated')}
                    className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition"
                    title="Copy Translated Text"
                  >
                    {isCopiedTranslated ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPreviewModalOpen(true)}
                    leftIcon={<Eye className="w-3.5 h-3.5 text-slate-600" />}
                    title="Preview formatted official document"
                  >
                    Preview
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveTranslationCorrections}
                    isLoading={isSavingTransReview}
                    disabled={activeTranslation?.status === 'APPROVED'}
                    leftIcon={<Save className="w-3.5 h-3.5" />}
                  >
                    Save
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleApproveTranslation}
                    isLoading={isApprovingTrans}
                    disabled={activeTranslation?.status === 'APPROVED'}
                    leftIcon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
                  >
                    {activeTranslation?.status === 'APPROVED' ? 'Approved' : 'Approve'}
                  </Button>

                  {activeTranslation?.status === 'APPROVED' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadApproved('txt')}
                        isLoading={isDownloadingApproved}
                        leftIcon={<Download className="w-3.5 h-3.5 text-blue-600" />}
                        title="Download approved UTF-8 text document"
                      >
                        Download (.txt)
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadApproved('pdf')}
                        isLoading={isDownloadingApproved}
                        leftIcon={<Download className="w-3.5 h-3.5 text-rose-600" />}
                        title="Download official PDF document with metadata"
                      >
                        Download PDF
                      </Button>
                    </>
                  )}
                </>
              )}

              {/* Prominent Translate Button */}
              <Button
                variant="primary"
                size="sm"
                onClick={handleTriggerTranslation}
                isLoading={isTranslating}
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              >
                {editableTranslatedText
                  ? 'Re-translate'
                  : `Translate to ${targetLang === 'kn' ? 'ಕನ್ನಡ' : 'English'}`}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-4 flex-1 flex flex-col space-y-3">
            {/* Status Lifecycle Banner: Machine Generated vs Under Review vs Approved */}
            {activeTranslation && (
              <div
                className={`p-2.5 rounded-lg border text-xs flex flex-wrap items-center justify-between gap-2 ${
                  activeTranslation.status === 'APPROVED'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : activeTranslation.status === 'UNDER_REVIEW'
                    ? 'bg-amber-50 border-amber-200 text-amber-950'
                    : 'bg-blue-50 border-blue-200 text-blue-950'
                }`}
              >
                <div className="flex items-center gap-2">
                  {activeTranslation.status === 'APPROVED' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : activeTranslation.status === 'UNDER_REVIEW' ? (
                    <Edit3 className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  ) : (
                    <Cpu className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  )}
                  <div>
                    <span className="font-bold">
                      {activeTranslation.status === 'APPROVED'
                        ? 'Approved Official Record'
                        : activeTranslation.status === 'UNDER_REVIEW'
                        ? 'Under Review — Human Reviewer Rewritten Output'
                        : 'Machine-Generated Output (Unverified)'}
                    </span>
                    {activeTranslation.status === 'APPROVED' && activeTranslation.checksum_sha256 && (
                      <span className="block text-[10px] text-emerald-700 font-mono">
                        SHA-256: {activeTranslation.checksum_sha256.substring(0, 16)}... &bull; File Stored Locally
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-[11px] font-medium">
                  {activeTranslation.status === 'APPROVED' ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      VERIFIED & ARCHIVED
                    </span>
                  ) : activeTranslation.status === 'UNDER_REVIEW' ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                      PENDING OFFICER APPROVAL
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                      DRAFT TRANSLATION
                    </span>
                  )}
                </div>
              </div>
            )}
            {/* Local Offline Engine Status Indicator */}
            <div className="p-2.5 rounded-lg border text-xs flex flex-wrap items-center justify-between gap-2 bg-slate-50 border-slate-200">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    transEngineStatus?.status === 'READY'
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-amber-500'
                  }`}
                />
                <span className="font-semibold text-slate-800">
                  Local Neural Engine: {transEngineStatus?.provider_name || 'AI4Bharat IndicTrans2'}
                </span>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${
                    transEngineStatus?.device?.toUpperCase() === 'CUDA' || transEngineStatus?.device?.toUpperCase() === 'GPU'
                      ? 'bg-purple-100 text-purple-800 border border-purple-300 shadow-sm'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                  title={transEngineStatus?.device_name ? `Hardware Accelerator: ${transEngineStatus.device_name}` : undefined}
                >
                  {transEngineStatus?.device?.toUpperCase() === 'CUDA' || transEngineStatus?.device?.toUpperCase() === 'GPU'
                    ? transEngineStatus?.device_name
                      ? `GPU: ${transEngineStatus.device_name}`
                      : 'GPU (CUDA)'
                    : transEngineStatus?.device || 'CPU'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-700" />
                  100% Offline &bull; Zero External Calls
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                {transEngineStatus?.status === 'READY'
                  ? 'Model Weights Installed'
                  : 'Offline Weights Loading'}
              </span>
            </div>

            {transErrorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="block">Translation Error</strong>
                  <span>{transErrorMessage}</span>
                </div>
              </div>
            )}

            {transSuccessMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{transSuccessMsg}</span>
              </div>
            )}

            {/* Dynamic Rendering: Translating VS Translated VS Blank State */}
            {isTranslating ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-blue-50/40 rounded-xl border border-dashed border-blue-200 min-h-[320px]">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                  <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
                <p className="font-bold text-slate-800 text-sm mb-1">
                  Translating petition via AI4Bharat IndicTrans2...
                </p>
                <p className="text-xs text-slate-500 max-w-sm">
                  Neural inference running locally on GPU/CPU with administrative terminology preservation.
                </p>
              </div>
            ) : editableTranslatedText ? (
              <div className="flex-1 flex flex-col space-y-2 min-h-[320px]">
                <textarea
                  rows={15}
                  value={editableTranslatedText}
                  onChange={(e) => {
                    setEditableTranslatedText(e.target.value);
                    onTranslatedTextChange?.(e.target.value, targetLang);
                  }}
                  placeholder="Translated content..."
                  className={`w-full flex-1 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-blue-600 outline-none leading-relaxed text-xs shadow-2xs ${
                    targetLang === 'kn' ? 'font-kannada text-sm leading-relaxed' : 'font-sans'
                  }`}
                />
                <div className="flex justify-between items-center text-[11px] text-slate-500 px-1 pt-1">
                  <span>
                    {editableTranslatedText.length} characters &bull;{' '}
                    {editableTranslatedText.trim().split(/\s+/).length} words
                  </span>
                  <span className="text-blue-700 font-medium flex items-center gap-1">
                    <Cpu className="w-3.5 h-3.5 text-blue-600" />
                    <span>AI4Bharat IndicTrans2 Neural Engine</span>
                  </span>
                </div>
              </div>
            ) : (
              /* CLEAN BLANK CARD STATE */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/70 rounded-xl border-2 border-dashed border-slate-200 min-h-[320px]">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-3 text-blue-600 shadow-2xs">
                  <Languages className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm mb-1">
                  Blank Translation Workspace
                </h4>
                <p className="text-xs text-slate-500 max-w-md mb-5 leading-relaxed">
                  Translated petition content will appear on this card. Click the button below to translate the original text from{' '}
                  <span className="font-semibold text-slate-800">
                    {sourceLang === 'kn' ? 'ಕನ್ನಡ (Kannada)' : 'English'}
                  </span>{' '}
                  to{' '}
                  <span className="font-semibold text-blue-700">
                    {targetLang === 'kn' ? 'ಕನ್ನಡ (Kannada)' : 'English'}
                  </span>{' '}
                  using the AI4Bharat IndicTrans2 model.
                </p>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleTriggerTranslation}
                  isLoading={isTranslating}
                  leftIcon={<Sparkles className="w-4 h-4" />}
                  className="shadow-sm"
                >
                  Translate to {targetLang === 'kn' ? 'ಕನ್ನಡ' : 'English'}
                </Button>
              </div>
            )}

            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-[11px] text-blue-900 flex items-start gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-700 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Data Security & Privacy:</strong> Translation executes 100% offline within the government network perimeter. Zero citizen grievance data is sent to external APIs.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Official Translated Document Preview Modal */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title="Official Translated Document Preview"
        description="Authenticated JanSetu Grievance Redressal Record"
        maxWidth="2xl"
      >
        <div className="space-y-4 text-slate-800">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-500 border-b border-slate-200 pb-2">
              <span className="font-semibold text-slate-700">Government of Karnataka &bull; JanSetu</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTranslation?.status === 'APPROVED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {activeTranslation?.status === 'APPROVED' ? 'OFFICIAL APPROVED RECORD' : 'REVIEW DRAFT'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <span className="text-slate-400 block text-[10px] font-medium">ORIGINAL DOCUMENT</span>
                <span className="font-semibold text-slate-800">{documentName || file?.name || 'Petition Document'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-medium">LANGUAGE DIRECTION</span>
                <span className="font-semibold text-slate-800">
                  {sourceLang === 'kn' ? 'ಕನ್ನಡ (KN)' : 'English (EN)'} &rarr;{' '}
                  {targetLang === 'kn' ? 'ಕನ್ನಡ (KN)' : 'English (EN)'}
                </span>
              </div>
              {activeTranslation?.checksum_sha256 && (
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px] font-medium">SHA-256 CHECKSUM</span>
                  <span className="font-mono text-[10px] text-slate-600 break-all bg-white p-1 rounded border border-slate-200 block">
                    {activeTranslation.checksum_sha256}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl max-h-[380px] overflow-y-auto shadow-inner">
            <div
              className={`whitespace-pre-wrap leading-relaxed text-xs text-slate-900 ${
                targetLang === 'kn' ? 'font-kannada text-sm leading-relaxed' : 'font-sans'
              }`}
            >
              {editableTranslatedText || 'No translated content available.'}
            </div>
          </div>

          <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">
              Original document remains 100% byte-for-byte unchanged.
            </span>
            <div className="flex items-center gap-2">
              {activeTranslation?.status === 'APPROVED' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadApproved('txt')}
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                  >
                    Download (.txt)
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleDownloadApproved('pdf')}
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                  >
                    Download PDF
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={() => setIsPreviewModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
