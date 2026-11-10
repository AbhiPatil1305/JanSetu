import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Loader2,
  Copy,
  CheckCircle2,
  Languages,
  Cpu,
  AlertCircle,
  SlidersHorizontal,
  FileText,
  ListOrdered,
  Target,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  summarizationService,
  GrievanceSummary,
  ExtractionLanguage,
  SUPPORTED_MODELS,
  WebLLMProgressReport,
  webLlmManager,
} from '../../services/ai/webllm';
import { translationsService } from '../../services/api/translations.service';

interface WebLlmSummarizerSectionProps {
  sourceText: string;
  englishSummary: string;
  kannadaSummary: string;
  onEnglishSummaryChange: (text: string) => void;
  onKannadaSummaryChange: (text: string) => void;
  confidenceScores?: {
    citizen: any;
    category: any;
    location: any;
    date: any;
  };
  getConfidenceBadge?: (level: any) => React.ReactNode;
}

export const WebLlmSummarizerSection: React.FC<WebLlmSummarizerSectionProps> = ({
  sourceText,
  englishSummary,
  kannadaSummary,
  onEnglishSummaryChange,
  onKannadaSummaryChange,
  confidenceScores,
  getConfidenceBadge,
}) => {
  const [selectedModel, setSelectedModel] = useState<string>(
    SUPPORTED_MODELS[0].id
  );
  const [targetLang, setTargetLang] = useState<ExtractionLanguage>('en');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [progressText, setProgressText] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [copiedEng, setCopiedEng] = useState<boolean>(false);
  const [copiedKan, setCopiedKan] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastGeneratedBy, setLastGeneratedBy] = useState<string | null>(null);
  const [structuredSummary, setStructuredSummary] = useState<GrievanceSummary | null>(null);
  const [showKeyDetails, setShowKeyDetails] = useState<boolean>(true);

  const isWebGpuAvailable = webLlmManager.isWebGPUSupported();

  const handleSummarize = async () => {
    const textToSummarize = sourceText.trim() || englishSummary.trim();
    if (!textToSummarize) {
      setErrorMessage(
        'Cannot generate summary: petition text is empty. Upload or extract a petition first.'
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage('Preparing WebLLM in-browser engine (WebGPU)...');
    setProgressPercent(5);

    const onProgress = (report: WebLLMProgressReport) => {
      setProgressPercent(Math.round(report.progress * 100));
      setProgressText(report.text);
    };

    try {
      let summaryObj: GrievanceSummary;

      if (isWebGpuAvailable) {
        summaryObj = await summarizationService.summarizeGrievance({
          sourceText: textToSummarize,
          supportingTranslation: targetLang === 'kn' ? englishSummary : kannadaSummary,
          language: targetLang,
          modelId: selectedModel,
          onProgress,
        });

        const modelObj = SUPPORTED_MODELS.find((m) => m.id === selectedModel);
        setLastGeneratedBy(modelObj ? modelObj.name : 'WebLLM');
      } else {
        setProgressText('Generating administrative synopsis via heuristics...');
        summaryObj = summarizationService.generateHeuristicSummary(textToSummarize, targetLang);
        setLastGeneratedBy('Heuristic Synopsis');
      }

      setStructuredSummary(summaryObj);

      // Populate textareas
      if (targetLang === 'kn') {
        const fullKannadaText = summaryObj.detailed_summary || summaryObj.short_summary;
        onKannadaSummaryChange(fullKannadaText);

        // Optionally translate to English via IndicTrans2
        setIsTranslating(true);
        try {
          const transRes = await translationsService.translateText(fullKannadaText, 'kn', 'en');
          if (transRes?.translated_text) {
            onEnglishSummaryChange(transRes.translated_text);
          }
        } catch (transErr) {
          console.warn('Translation notice:', transErr);
        } finally {
          setIsTranslating(false);
        }
      } else {
        const fullEnglishText = summaryObj.detailed_summary || summaryObj.short_summary;
        onEnglishSummaryChange(fullEnglishText);

        // Translate to Kannada via IndicTrans2
        setIsTranslating(true);
        try {
          const transRes = await translationsService.translateText(fullEnglishText, 'en', 'kn');
          if (transRes?.translated_text) {
            onKannadaSummaryChange(transRes.translated_text);
          }
        } catch (transErr) {
          console.warn('Translation notice:', transErr);
        } finally {
          setIsTranslating(false);
        }
      }

      setStatusMessage('Factual summaries populated in editable fields below!');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      console.error('WebLLM generation error:', err);
      try {
        const fallback = summarizationService.generateHeuristicSummary(textToSummarize, targetLang);
        setStructuredSummary(fallback);
        onEnglishSummaryChange(fallback.detailed_summary);
        setLastGeneratedBy('Heuristic Fallback');
        setErrorMessage(
          `WebLLM notice: ${err?.message || 'WebGPU memory issue'}. Applied heuristic synopsis instead.`
        );
      } catch {
        setErrorMessage(err?.message || 'Failed to generate summary.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: 'en' | 'kn') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'en') {
      setCopiedEng(true);
      setTimeout(() => setCopiedEng(false), 2000);
    } else {
      setCopiedKan(true);
      setTimeout(() => setCopiedKan(false), 2000);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-lg">
              <Bot className="w-5 h-5 text-indigo-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-tight">
                  WebLLM In-Browser Summarizer
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {isWebGpuAvailable ? 'WebGPU Active' : 'Fallback Mode'}
                </span>
                {lastGeneratedBy && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                    Model: {lastGeneratedBy}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Shared WebGPU in-browser inference — zero external APIs, zero data leaves device
              </p>
            </div>
          </div>

          {/* Model Selector, Language & Action Button */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Target Language Toggle */}
            <div className="flex items-center bg-slate-800/80 border border-slate-700 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setTargetLang('en')}
                disabled={isLoading}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
                  targetLang === 'en'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setTargetLang('kn')}
                disabled={isLoading}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
                  targetLang === 'kn'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ಕನ್ನಡ
              </button>
            </div>

            {/* Model Selector */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={isLoading}
                className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer pr-1"
              >
                {SUPPORTED_MODELS.map((m) => (
                  <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                    {m.name} ({m.size})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSummarize}
              disabled={isLoading || isTranslating}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm ${
                isLoading || isTranslating
                  ? 'bg-indigo-700/60 text-indigo-200 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating ({progressPercent}%)...</span>
                </>
              ) : isTranslating ? (
                <>
                  <Languages className="w-3.5 h-3.5 animate-spin" />
                  <span>Translating with IndicTrans2...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Summarize with WebLLM</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar when Loading/Generating */}
        {isLoading && (
          <div className="mt-3 pt-3 border-t border-slate-800/80">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-slate-300 font-medium truncate max-w-md">
                {progressText || 'Initializing WebLLM WebGPU weights...'}
              </span>
              <span className="text-indigo-300 font-bold ml-2 font-mono">
                {progressPercent}%
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(progressPercent, 5)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="p-5 space-y-4">
        {/* Status or Error Notifications */}
        {statusMessage && (
          <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Verification Scores Strip if provided */}
        {confidenceScores && getConfidenceBadge && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-3 border-b border-slate-100 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Citizen Identity</span>
              {getConfidenceBadge(confidenceScores.citizen)}
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Classification</span>
              {getConfidenceBadge(confidenceScores.category)}
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Location</span>
              {getConfidenceBadge(confidenceScores.location)}
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Incident Date</span>
              {getConfidenceBadge(confidenceScores.date)}
            </div>
          </div>
        )}

        {/* Structured Summary Breakdown Card (Short Summary, Action, Key Points) */}
        {structuredSummary && (
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Extracted Administrative Insights
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                  Confidence: {Math.round(structuredSummary.confidence_score * 100)}%
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyDetails(!showKeyDetails)}
                className="text-slate-500 hover:text-slate-700 text-xs flex items-center gap-1"
              >
                {showKeyDetails ? (
                  <>Hide Details <ChevronUp className="w-3.5 h-3.5" /></>
                ) : (
                  <>Show Details <ChevronDown className="w-3.5 h-3.5" /></>
                )}
              </button>
            </div>

            {showKeyDetails && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {/* Short Summary */}
                <div className="bg-white p-3 rounded-lg border border-indigo-100/80 shadow-2xs">
                  <div className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    Short Synopsis (ಮುಖ್ಯ ಸಾರಾಂಶ)
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    {structuredSummary.short_summary}
                  </p>
                </div>

                {/* Requested Action */}
                <div className="bg-white p-3 rounded-lg border border-indigo-100/80 shadow-2xs">
                  <div className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1 text-[11px]">
                    <Target className="w-3.5 h-3.5 text-amber-600" />
                    Requested Action (ಕೋರಿದ ಪರಿಹಾರ)
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    {structuredSummary.requested_action || 'No specific relief stated in petition.'}
                  </p>
                </div>

                {/* Key Points */}
                {structuredSummary.key_points && structuredSummary.key_points.length > 0 && (
                  <div className="md:col-span-2 bg-white p-3 rounded-lg border border-indigo-100/80 shadow-2xs">
                    <div className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1 text-[11px]">
                      <ListOrdered className="w-3.5 h-3.5 text-emerald-600" />
                      Key Factual Points (ಮುಖ್ಯ ಅಂಶಗಳು)
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-600">
                      {structuredSummary.key_points.map((pt, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {pt}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Editable Summary Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* English Summary Box */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>English Summary (Editable)</span>
              </label>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[11px] text-slate-400 font-mono">
                  {englishSummary.length} chars
                </span>
                <button
                  onClick={() => copyToClipboard(englishSummary, 'en')}
                  disabled={!englishSummary}
                  className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-700 transition-colors"
                  title="Copy English summary"
                >
                  {copiedEng ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
            <textarea
              rows={4}
              value={englishSummary}
              onChange={(e) => onEnglishSummaryChange(e.target.value)}
              placeholder="Click 'Summarize with WebLLM' above or type an objective English summary of the petition..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none leading-relaxed text-xs shadow-2xs transition-all resize-y"
            />
          </div>

          {/* Kannada Summary Box */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-800 text-xs font-kannada flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-amber-600" />
                <span>ಕನ್ನಡ ಸಾರಾಂಶ (Kannada Summary - Editable)</span>
              </label>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[11px] text-slate-400 font-mono">
                  {kannadaSummary.length} chars
                </span>
                <button
                  onClick={() => copyToClipboard(kannadaSummary, 'kn')}
                  disabled={!kannadaSummary}
                  className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-700 transition-colors"
                  title="Copy Kannada summary"
                >
                  {copiedKan ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
            <textarea
              rows={4}
              value={kannadaSummary}
              onChange={(e) => onKannadaSummaryChange(e.target.value)}
              placeholder="ವೆಬ್ ಎಲ್‌ಎಲ್‌ಎಂ ಅಥವಾ ಇಂಡಿಕ್‌ಟ್ರಾನ್ಸ್‌೨ ನಿಂದ ಕನ್ನಡ ಸಾರಾಂಶ ಇಲ್ಲಿ ಮೂಡುತ್ತದೆ (ಸಂಪಾದಿಸಬಹುದು)..."
              className="w-full p-3 bg-amber-50/40 border border-amber-200/80 rounded-xl text-slate-900 focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-100 outline-none leading-relaxed text-sm font-kannada shadow-2xs transition-all resize-y"
            />
          </div>
        </div>

        {/* Footer Guidance */}
        <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-slate-400" />
            Runs client-side via WebGPU. All summaries can be freely edited before final registration.
          </span>
          {(englishSummary || kannadaSummary) && (
            <button
              onClick={() => {
                onEnglishSummaryChange('');
                onKannadaSummaryChange('');
                setStructuredSummary(null);
              }}
              className="text-slate-400 hover:text-rose-500 text-[11px] transition-colors"
            >
              Clear Summaries
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
