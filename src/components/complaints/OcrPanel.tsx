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
} from 'lucide-react';
import { Button } from '../common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
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
}

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
}) => {
  // Top-level tab: 'ocr' or 'translate'
  const [activeMainTab, setActiveMainTab] = useState<'ocr' | 'translate'>('ocr');

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

  // Translation state (Stage 2)
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
  const [isCopied, setIsCopied] = useState<boolean>(false);

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

  // Fetch translation history whenever documentId changes or when switching to translation tab
  useEffect(() => {
    if (documentId && activeMainTab === 'translate') {
      translationsService
        .listDocumentTranslations(documentId)
        .then((records) => {
          setTranslationHistory(records);
          if (records.length > 0 && !activeTranslation) {
            setActiveTranslation(records[0]);
            setEditableTranslatedText(
              records[0].corrected_text || records[0].translated_text || ''
            );
          }
        })
        .catch(() => {
          // ignore or set empty
        });
    }
  }, [documentId, activeMainTab]);

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
        await new Promise((resolve) => setTimeout(resolve, 600));
        setOcrStatus('COMPLETED');
        if (!localRawText) {
          const sample = `[Sample Extracted Content from ${file?.name || 'Uploaded Document'}]\n\nದೂರು: ಬೆಂಗಳೂರು ದಕ್ಷಿಣ ತಾಲ್ಲೂಕಿನಲ್ಲಿ ಭೂ ಒತ್ತುವರಿ ಬಗ್ಗೆ ತನಿಖೆ ನಡೆಸಲು ವಿನಂತಿ.\nComplainant requests inquiry regarding land boundary dispute.`;
          setLocalRawText(sample);
          setLocalReviewedText(sample);
          onRawTextChange?.(sample);
          onReviewedTextChange?.(sample);
        }
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
      setSaveSuccessMsg('Reviewed text successfully saved!');
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

  // Translation actions
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
        'Cannot translate: selected OCR text is empty. Please extract or enter text first.'
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
        setEditableTranslatedText(
          transRecord.corrected_text || transRecord.translated_text || ''
        );
        setTranslationHistory((prev) => [transRecord, ...prev]);

        if (transRecord.status === 'FAILED') {
          setTransErrorMessage(
            transRecord.error_message || 'Translation failed on server.'
          );
        } else {
          setTransSuccessMsg('Document successfully translated!');
          setTimeout(() => setTransSuccessMsg(null), 3500);
        }
      } else {
        // Preview mode simulation
        await new Promise((resolve) => setTimeout(resolve, 800));
        const isKnToEn = sourceLang === 'kn';
        const simulatedOutput = isKnToEn
          ? `[English Translation]\nOfficial Citizen Grievance Petition\nRegarding: Land Encroachment and Unauthorized Construction.\nRelief Demanded: Please conduct spot inspection and issue notice.`
          : `[ಕನ್ನಡ ಭಾಷಾಂತರ]\nಅಧಿಕೃತ ನಾಗರಿಕ ಕುಂದುಕೊರತೆ ಅರ್ಜಿ\nವಿಷಯ: ಭೂ ಒತ್ತುವರಿ ಮತ್ತು ಅನಧಿಕೃತ ನಿರ್ಮಾಣ ಕುರಿತು.\nಕೋರಿದ ಪರಿಹಾರ: ದಯವಿಟ್ಟು ಸ್ಥಳ ಪರಿಶೀಲನೆ ನಡೆಸಿ ನೋಟಿಸ್ ಜಾರಿ ಮಾಡಿ.`;

        const mockRecord: TranslationRecord = {
          id: `preview-${Date.now()}`,
          document_id: 'preview-doc',
          source_language: sourceLang,
          target_language: targetLang,
          text_source: textSource,
          source_text: inputForTrans,
          translated_text: simulatedOutput,
          corrected_text: simulatedOutput,
          provider_name: transEngineStatus?.provider_name || 'JanSetu-LocalAdministrativeEngine',
          model_version: 'v2.1',
          status: 'COMPLETED',
          created_at: new Date().toISOString(),
        };
        setActiveTranslation(mockRecord);
        setEditableTranslatedText(simulatedOutput);
        setTranslationHistory((prev) => [mockRecord, ...prev]);
        setTransSuccessMsg('Preview translation generated.');
        setTimeout(() => setTransSuccessMsg(null), 3000);
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
      if (documentId && !activeTranslation.id.startsWith('preview-')) {
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
      setTransSuccessMsg('Human corrections saved successfully!');
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
      if (documentId && !activeTranslation.id.startsWith('preview-')) {
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const renderOcrStatusBadge = () => {
    switch (ocrStatus) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            OCR Completed
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

  const renderTranslationStatusBadge = (status?: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Approved Official Translation
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
            Human Reviewed (Pending Approval)
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Unapproved Machine Translation
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Translating...
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
            <AlertTriangle className="w-3.5 h-3.5" />
            Translation Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
            <Info className="w-3.5 h-3.5" />
            Translation Not Initiated
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Workflow Tab Switcher: Stage 1 OCR vs Stage 2 Translation */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveMainTab('ocr')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold text-xs transition ${
              activeMainTab === 'ocr'
                ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-700" />
            <span>Document OCR & Text Review</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab('translate')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold text-xs transition ${
              activeMainTab === 'translate'
                ? 'bg-blue-100 text-blue-900 border border-blue-300 shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Languages className="w-4 h-4 text-blue-700" />
            <span>Bidirectional Translation (ಕನ್ನಡ ⇄ English)</span>
            {translationHistory.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-200 text-blue-800">
                {translationHistory.length}
              </span>
            )}
          </button>
        </div>

        {activeMainTab === 'ocr' && renderOcrStatusBadge()}
        {activeMainTab === 'translate' &&
          renderTranslationStatusBadge(activeTranslation?.status)}
      </div>

      {/* ============================================================== */}
      {/* TAB 1: OCR TEXT EXTRACTION (Stage 1)                           */}
      {/* ============================================================== */}
      {activeMainTab === 'ocr' && (
        <div className="space-y-4">
          {/* OCR Engine Info Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-slate-500" />
              <span className="font-semibold">OCR Engine:</span>
              {engineStatus?.installed ? (
                <span className="text-emerald-700 font-medium">
                  Tesseract {engineStatus.version || ''} (Languages:{' '}
                  {engineStatus.languages.join(', ') || 'eng'})
                </span>
              ) : (
                <span className="text-amber-700 font-medium">
                  Digital PDF & DOCX Direct Ingestion (Tesseract OCR server not installed)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  disabled={isProcessing}
                  className="text-xs bg-transparent outline-none text-slate-700 font-medium cursor-pointer"
                >
                  <option value="eng+kan">Bilingual (English + Kannada)</option>
                  <option value="eng">English (eng)</option>
                  <option value="kan">Kannada (kan)</option>
                </select>
              </div>

              <Button
                variant="primary"
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
                  ? 'Re-extract Text'
                  : 'Extract Text'}
              </Button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">OCR Processing Error</p>
                <p className="leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {saveSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Original Document Viewer */}
            <div className="lg:col-span-5 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-bold flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>Original Document</span>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(60, z - 20))}
                    className="p-1 rounded hover:bg-slate-200 text-slate-600"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-[11px] w-10 text-center">
                    {zoomLevel}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(180, z + 20))}
                    className="p-1 rounded hover:bg-slate-200 text-slate-600"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="h-[460px] bg-slate-900 text-slate-200 rounded-xl overflow-hidden border border-slate-800 text-xs shadow-inner font-sans relative">
                {file?.url && (file.name.toLowerCase().endsWith('.pdf') || file.url.toLowerCase().includes('.pdf') || file.url.includes('/preview')) ? (
                  <iframe
                    src={file.url}
                    title={documentName || file.name || 'Document Preview'}
                    className="w-full h-full border-0 bg-white"
                  />
                ) : file?.url && (file.name.toLowerCase().match(/\.(png|jpe?g|webp|bmp)$/i)) ? (
                  <div className="w-full h-full flex items-center justify-center p-2 overflow-auto bg-slate-950">
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
                  <div className="h-full p-4 overflow-y-auto">
                    <div
                      style={{
                        transform: `scale(${zoomLevel / 100})`,
                        transformOrigin: 'top left',
                      }}
                      className="space-y-3"
                    >
                      <div className="text-center pb-2 border-b border-slate-700 text-slate-400 uppercase text-[10px] tracking-widest font-mono">
                        {documentName || file?.name || 'Original Document Record'} &bull;{' '}
                        {file?.size ? `${Math.round(file.size / 1024)} KB` : 'Preserved'}
                      </div>
                      <pre className="whitespace-pre-wrap leading-relaxed text-slate-300 font-mono text-[11px]">
                        {localRawText ||
                          'No visual preview available. Extracted text will appear on the right.'}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: OCR Text & Human Review Interface */}
            <div className="lg:col-span-7 space-y-2">
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-amber-600" />
                    <CardTitle className="text-sm font-bold text-slate-900">
                      Extracted Text & Human Review
                    </CardTitle>
                  </div>
                  {renderOcrStatusBadge()}
                </CardHeader>

                <CardContent className="space-y-4 p-5 flex-1 flex flex-col text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTextView('reviewed')}
                        className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition ${
                          activeTextView === 'reviewed'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Human Reviewed Text (Editable)
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTextView('raw')}
                        className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition ${
                          activeTextView === 'raw'
                            ? 'bg-slate-800 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Raw OCR Output (Read-Only)
                      </button>
                    </div>

                    {activeTextView === 'reviewed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveReview}
                        isLoading={isSavingReview}
                        leftIcon={<Save className="w-3.5 h-3.5" />}
                      >
                        Save Reviewed Text
                      </Button>
                    )}
                  </div>

                  <div className="flex-1 min-h-[280px] flex flex-col">
                    {activeTextView === 'reviewed' ? (
                      <div className="flex-1 flex flex-col space-y-2">
                        <label className="text-[11px] font-bold text-slate-600 block">
                          Edit and verify extracted text below. Original OCR output is preserved.
                        </label>
                        <textarea
                          rows={12}
                          value={localReviewedText}
                          onChange={(e) => {
                            setLocalReviewedText(e.target.value);
                            onReviewedTextChange?.(e.target.value);
                          }}
                          placeholder="Verified complaint petition text will appear here..."
                          className="w-full flex-1 p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-slate-800 outline-none leading-relaxed text-xs font-mono"
                        />
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 block">
                          Raw immutable OCR text extracted from document binary:
                        </label>
                        <pre className="w-full flex-1 p-3 bg-slate-900 text-emerald-400 border border-slate-800 rounded-lg leading-relaxed text-xs font-mono overflow-y-auto whitespace-pre-wrap select-all">
                          {localRawText || 'No raw OCR data available.'}
                        </pre>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Strict Data Governance:</strong> OCR text is provided for reference only and does not automatically overwrite official grievance descriptions or verified case data.
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: BIDIRECTIONAL TRANSLATION (Stage 2)                     */}
      {/* ============================================================== */}
      {activeMainTab === 'translate' && (
        <div className="space-y-4">
          {/* Translation Engine Architecture Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-blue-900">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-600" />
              <span className="font-semibold">Translation Engine:</span>
              <span className="font-medium text-slate-800">
                {transEngineStatus?.provider_name || 'JanSetu-LocalAdministrativeEngine'}
              </span>
              <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                100% Local / Offline &bull; Zero External Network Transmission
              </span>
            </div>

            {/* Translation History Toggle */}
            {translationHistory.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1.5 text-xs text-blue-700 font-semibold hover:underline"
              >
                <History className="w-3.5 h-3.5" />
                <span>
                  {showHistory ? 'Hide Translation History' : `Translation History (${translationHistory.length})`}
                </span>
              </button>
            )}
          </div>

          {/* Translation Control Bar */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Language Direction Controls */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold">
                  <span className="text-slate-400">Source:</span>
                  <select
                    value={sourceLang}
                    onChange={(e) => {
                      const newSrc = e.target.value as 'kn' | 'en';
                      setSourceLang(newSrc);
                      setTargetLang(newSrc === 'kn' ? 'en' : 'kn');
                    }}
                    className="bg-transparent text-slate-800 font-bold outline-none cursor-pointer"
                  >
                    <option value="kn">ಕನ್ನಡ (Kannada)</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleSwapTranslationDirection}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                  title="Swap translation direction"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold">
                  <span className="text-slate-400">Target:</span>
                  <select
                    value={targetLang}
                    onChange={(e) => {
                      const newTgt = e.target.value as 'kn' | 'en';
                      setTargetLang(newTgt);
                      setSourceLang(newTgt === 'kn' ? 'en' : 'kn');
                    }}
                    className="bg-transparent text-slate-800 font-bold outline-none cursor-pointer"
                  >
                    <option value="en">English</option>
                    <option value="kn">ಕನ್ನಡ (Kannada)</option>
                  </select>
                </div>
              </div>

              {/* Text Source Selection: REVIEWED_OCR vs RAW_OCR */}
              <div className="flex items-center gap-3 text-xs">
                <span className="font-semibold text-slate-600">OCR Source:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="textSource"
                    value="REVIEWED_OCR"
                    checked={textSource === 'REVIEWED_OCR'}
                    onChange={() => setTextSource('REVIEWED_OCR')}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-slate-800 font-medium">
                    Verified OCR Text (Recommended)
                  </span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="textSource"
                    value="RAW_OCR"
                    checked={textSource === 'RAW_OCR'}
                    onChange={() => setTextSource('RAW_OCR')}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-slate-600">Raw Machine OCR</span>
                </label>
              </div>

              {/* Action Button */}
              <Button
                variant="primary"
                size="sm"
                onClick={handleTriggerTranslation}
                isLoading={isTranslating}
                leftIcon={<Languages className="w-3.5 h-3.5" />}
              >
                Translate Document ({sourceLang.toUpperCase()} → {targetLang.toUpperCase()})
              </Button>
            </div>
          </div>

          {/* Translation History Accordion */}
          {showHistory && translationHistory.length > 0 && (
            <Card className="border-blue-200 bg-blue-50/20">
              <CardHeader className="py-2.5 px-4 bg-blue-50/50 border-b border-blue-200">
                <CardTitle className="text-xs font-bold text-blue-900 flex items-center gap-2">
                  <History className="w-3.5 h-3.5 text-blue-600" />
                  <span>Prior Translation History for this Document</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 text-xs space-y-2">
                {translationHistory.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border transition flex items-center justify-between gap-3 ${
                      activeTranslation?.id === item.id
                        ? 'bg-blue-100/70 border-blue-300'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-800">
                        #{idx + 1} &bull; {item.source_language.toUpperCase()} → {item.target_language.toUpperCase()}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {item.created_at ? new Date(item.created_at).toLocaleString() : 'Recent'}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        via {item.provider_name}
                      </span>
                      {renderTranslationStatusBadge(item.status)}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTranslation(item);
                        setEditableTranslatedText(
                          item.corrected_text || item.translated_text || ''
                        );
                        setSourceLang(item.source_language as 'kn' | 'en');
                        setTargetLang(item.target_language as 'kn' | 'en');
                      }}
                      className="text-xs font-semibold text-blue-700 hover:underline"
                    >
                      Load into Workspace
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {transErrorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Translation Error</p>
                <p className="leading-relaxed">{transErrorMessage}</p>
              </div>
            </div>
          )}

          {transSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{transSuccessMsg}</span>
            </div>
          )}

          {/* Side-by-Side Bilingual Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Source Text (Input) */}
            <div className="lg:col-span-6 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-700">
                <span className="font-bold flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>
                    Original Text ({sourceLang === 'kn' ? 'ಕನ್ನಡ / Kannada' : 'English'})
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      textSource === 'REVIEWED_OCR'
                        ? localReviewedText || localRawText
                        : localRawText
                    )
                  }
                  className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900"
                >
                  {isCopied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{isCopied ? 'Copied' : 'Copy Text'}</span>
                </button>
              </div>

              <div
                className={`h-[440px] bg-slate-900 text-slate-200 rounded-xl p-4 overflow-y-auto border border-slate-800 text-xs font-mono leading-relaxed select-all ${
                  sourceLang === 'kn' ? 'font-kannada text-sm leading-relaxed' : ''
                }`}
              >
                <pre className="whitespace-pre-wrap leading-relaxed">
                  {(textSource === 'REVIEWED_OCR'
                    ? localReviewedText || localRawText
                    : localRawText) ||
                    'No OCR text available to translate. Extract text first in the OCR Tab.'}
                </pre>
              </div>
            </div>

            {/* Right: Translated & Human Review Workspace */}
            <div className="lg:col-span-6 space-y-2">
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Languages className="w-4 h-4 text-blue-600" />
                    <CardTitle className="text-sm font-bold text-slate-900">
                      Translated Content ({targetLang === 'kn' ? 'ಕನ್ನಡ / Kannada' : 'English'})
                    </CardTitle>
                  </div>
                  {renderTranslationStatusBadge(activeTranslation?.status)}
                </CardHeader>

                <CardContent className="space-y-4 p-5 flex-1 flex flex-col text-xs">
                  {/* Status & Review Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                    <span className="text-[11px] text-slate-500">
                      {activeTranslation?.status === 'APPROVED' ? (
                        <strong className="text-emerald-700">Verified & Approved Official Record</strong>
                      ) : (
                        <strong className="text-amber-800">
                          Unapproved Machine Translation &bull; Verification Mandated
                        </strong>
                      )}
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveTranslationCorrections}
                        isLoading={isSavingTransReview}
                        disabled={!activeTranslation || activeTranslation.status === 'APPROVED'}
                        leftIcon={<Save className="w-3.5 h-3.5" />}
                      >
                        Save Corrections
                      </Button>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleApproveTranslation}
                        isLoading={isApprovingTrans}
                        disabled={!activeTranslation || activeTranslation.status === 'APPROVED'}
                        leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
                      >
                        {activeTranslation?.status === 'APPROVED' ? 'Approved' : 'Approve Translation'}
                      </Button>
                    </div>
                  </div>

                  {/* Editable Translated Text */}
                  <div className="flex-1 flex flex-col space-y-2 min-h-[280px]">
                    <textarea
                      rows={14}
                      value={editableTranslatedText}
                      onChange={(e) => setEditableTranslatedText(e.target.value)}
                      placeholder="Translated text will appear here. Operators can edit and correct translations before official approval..."
                      className={`w-full flex-1 p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-blue-600 outline-none leading-relaxed text-xs ${
                        targetLang === 'kn' ? 'font-kannada text-sm leading-relaxed' : 'font-mono'
                      }`}
                    />
                  </div>

                  {/* Strict Governance Notice */}
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Strict Data Governance:</strong> Machine translations must be verified and approved by an authorized officer. Translations do not automatically replace original grievance petitions or citizen records.
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
