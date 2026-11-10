import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Languages,
  ChevronRight,
  RefreshCw,
  Cpu,
  ShieldCheck,
  FileText,
  Info,
  Clock,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import {
  webLlmExtractorService,
  EXTRACTION_MODELS,
} from '../../services/ai/webllmExtractor.service';
import {
  ExtractionLanguage,
  ExtractionProgress,
  GrievanceExtractionResult,
} from '../../types/extraction';

interface IntelligentFormExtractionSectionProps {
  documentId?: string | null;
  documentName?: string;
  reviewedOcrText?: string;
  rawOcrText?: string;
  translatedText?: string;
  onApplyExtraction: (result: GrievanceExtractionResult) => void;
  onProceedToForm: () => void;
  lastExtractionResult?: GrievanceExtractionResult | null;
}

export const IntelligentFormExtractionSection: React.FC<IntelligentFormExtractionSectionProps> = ({
  documentId,
  documentName,
  reviewedOcrText,
  rawOcrText,
  translatedText,
  onApplyExtraction,
  onProceedToForm,
  lastExtractionResult,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<ExtractionLanguage>('en');
  const [selectedModelId, setSelectedModelId] = useState<string>(EXTRACTION_MODELS[0].id);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [progress, setProgress] = useState<ExtractionProgress>({
    state: 'idle',
    percent: 0,
    message: 'Select language to start intelligent extraction',
  });
  const [activeResult, setActiveResult] = useState<GrievanceExtractionResult | null>(
    lastExtractionResult || null
  );
  const [showSourceExcerpts, setShowSourceExcerpts] = useState<boolean>(false);

  const sourceTextLength = (reviewedOcrText || rawOcrText || '').trim().length;

  const handleStartExtraction = async (lang: ExtractionLanguage) => {
    setSelectedLanguage(lang);
    if (!sourceTextLength && !translatedText?.trim().length) {
      setProgress({
        state: 'failed',
        percent: 0,
        message: 'No document text available. Please upload or OCR a document first.',
        error: 'Document text is empty.',
      });
      return;
    }

    setIsExtracting(true);
    setProgress({
      state: 'extracting',
      percent: 25,
      message: `Analyzing petition with local ${selectedModelId} (${lang === 'kn' ? 'Kannada' : 'English'})...`,
    });

    try {
      const result = await webLlmExtractorService.extractGrievance({
        documentId,
        reviewedOcrText,
        rawOcrText,
        translatedText,
        language: lang,
        modelId: selectedModelId,
        onProgress: (prog) => {
          setProgress(prog);
        },
      });

      setActiveResult(result);
      onApplyExtraction(result);
    } catch (err: any) {
      console.error('Backend Extraction Error:', err);
      setProgress({
        state: 'failed',
        percent: 0,
        message: 'Extraction failed: ' + (err?.message || 'Server connection error'),
        error: err?.message || 'Local model execution failure.',
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const getStatusBadge = (status: string, confidence: number) => {
    const confPercent = Math.round(confidence * 100);
    switch (status) {
      case 'EXTRACTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
            Extracted ({confPercent}%)
          </span>
        );
      case 'PARTIALLY_EXTRACTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <HelpCircle className="w-2.5 h-2.5 text-amber-600" />
            Partial ({confPercent}%)
          </span>
        );
      case 'AMBIGUOUS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
            Ambiguous ({confPercent}%)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
            Not Found
          </span>
        );
    }
  };

  return (
    <Card className="border-indigo-200 bg-gradient-to-b from-indigo-50/40 to-white shadow-sm overflow-hidden">
      <CardHeader className="border-b border-indigo-100/70 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Intelligent Grievance Form Extraction</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 text-emerald-600" />
                  Qwen 2.5 (Local GPU)
                </span>
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Select your preferred form language. JanSetu's backend local neural engine extracts entities and automatically populates the registration form.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Model Selector Pill */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 shadow-2xs">
              <Cpu className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                disabled={isExtracting}
                className="text-[11px] bg-transparent text-slate-700 font-medium focus:border-indigo-500 outline-none cursor-pointer"
              >
                {EXTRACTION_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.size})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-4 text-xs">
        {/* Language Selection Buttons */}
        <div className="space-y-2">
          <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">
            Target Form Language
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Option A: Fill in English */}
            <button
              type="button"
              disabled={isExtracting}
              onClick={() => handleStartExtraction('en')}
              className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-2 shadow-2xs ${
                selectedLanguage === 'en' && activeResult
                  ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/80'
              } ${isExtracting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                    EN
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">1. Fill in English</h4>
                    <p className="text-[11px] text-slate-500">
                      Standard administrative English form values
                    </p>
                  </div>
                </div>
                {selectedLanguage === 'en' && activeResult && (
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                )}
              </div>
              <div className="text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-100 flex items-center justify-between">
                <span>Fastest processing (~2.3s)</span>
                <span className="font-semibold text-indigo-600 flex items-center gap-0.5">
                  Start Analysis <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </button>

            {/* Option B: Fill in Kannada */}
            <button
              type="button"
              disabled={isExtracting}
              onClick={() => handleStartExtraction('kn')}
              className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-2 shadow-2xs ${
                selectedLanguage === 'kn' && activeResult
                  ? 'border-amber-600 bg-amber-50/60 ring-2 ring-amber-500/20'
                  : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-slate-50/80'
              } ${isExtracting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs font-kannada">
                    ಕ
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs font-kannada">
                      2. ಕನ್ನಡದಲ್ಲಿ ಭರ್ತಿ ಮಾಡಿ
                    </h4>
                    <p className="text-[11px] text-slate-500 font-kannada">
                      ಅಧಿಕೃತ ಆಡಳಿತಾತ್ಮಕ ಕನ್ನಡ ನಮೂನೆ ವಿವರಗಳು
                    </p>
                  </div>
                </div>
                {selectedLanguage === 'kn' && activeResult && (
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                )}
              </div>
              <div className="text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-100 flex items-center justify-between">
                <span className="font-kannada">ಶುದ್ಧ ಕನ್ನಡ ವಿಶ್ಲೇಷಣೆ (~5.8s)</span>
                <span className="font-semibold text-amber-700 flex items-center gap-0.5 font-kannada">
                  ವಿಶ್ಲೇಷಿಸಿ <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Extraction Progress Indicator */}
        {isExtracting && (
          <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-indigo-900 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                {progress.message || 'Extracting structured data from document...'}
              </span>
              <span className="text-[11px] font-mono text-indigo-700 font-bold">
                {progress.percent}%
              </span>
            </div>
            <div className="w-full bg-indigo-200/50 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500">
              Running locally on your dedicated GPU via FastAPI & Ollama Qwen2.5. No external APIs used.
            </p>
          </div>
        )}

        {/* Error Notice with Retry */}
        {progress.state === 'failed' && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <div>
                <p className="font-semibold text-rose-900">Extraction Error</p>
                <p className="text-[11px] text-rose-700">{progress.message}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleStartExtraction(selectedLanguage)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Extraction</span>
            </button>
          </div>
        )}

        {/* Extracted Fields Preview Table */}
        {activeResult && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-bold text-slate-800">
                  Extracted Form Fields (Language:{' '}
                  {activeResult.output_language === 'kn' ? 'ಕನ್ನಡ (Kannada)' : 'English'})
                </span>
                {progress.extractionTimeMs && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                    {(progress.extractionTimeMs / 1000).toFixed(2)}s
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowSourceExcerpts(!showSourceExcerpts)}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
              >
                {showSourceExcerpts ? 'Hide Source Excerpts' : 'Show Source Excerpts'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {Object.entries(activeResult.fields).map(([key, field]) => {
                const label = key
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, (c) => c.toUpperCase());

                return (
                  <div
                    key={key}
                    className="p-2.5 bg-slate-50/80 border border-slate-200/80 rounded-lg flex flex-col justify-between gap-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700 text-[11px]">{label}</span>
                      {getStatusBadge(field.status, field.confidence)}
                    </div>
                    <div className="font-medium text-slate-900 break-words">
                      {field.value ? (
                        <span className={activeResult.output_language === 'kn' ? 'font-kannada' : ''}>
                          {field.value}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Not detected in document</span>
                      )}
                    </div>
                    {showSourceExcerpts && field.source_excerpt && (
                      <div className="text-[10px] text-slate-500 bg-white p-1.5 rounded border border-slate-100 italic mt-0.5">
                        <span className="font-semibold not-italic text-slate-400">Excerpt: </span>
                        "{field.source_excerpt}"
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Fields pre-fill into Stage 3 and can be freely edited before final submission.
              </span>
              <Button
                type="button"
                variant="primary"
                onClick={onProceedToForm}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2"
              >
                Proceed to Form & Pre-Fill <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
