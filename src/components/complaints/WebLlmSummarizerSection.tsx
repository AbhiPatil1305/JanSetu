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
  RefreshCw,
  SlidersHorizontal,
  FileText,
} from 'lucide-react';
import {
  webllmService,
  AVAILABLE_WEBLLM_MODELS,
  ProgressCallback,
} from '../../services/ai/webllm.service';
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
    AVAILABLE_WEBLLM_MODELS[0].id
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [progressText, setProgressText] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressStage, setProgressStage] = useState<string>('idle');
  const [copiedEng, setCopiedEng] = useState<boolean>(false);
  const [copiedKan, setCopiedKan] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastGeneratedBy, setLastGeneratedBy] = useState<string | null>(null);

  const isWebGpuAvailable = webllmService.isWebGPUSupported();

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
    setStatusMessage('Preparing WebLLM in-browser model...');
    setProgressPercent(5);

    const onProgress: ProgressCallback = (report) => {
      setProgressPercent(Math.round(report.progress * 100));
      setProgressText(report.text);
      setProgressStage(report.stage);
    };

    try {
      let generatedEng = '';
      let generatedKan = '';

      if (isWebGpuAvailable) {
        // Run in-browser WebGPU LLM for pure English summary
        generatedEng = await webllmService.summarizePetition(
          textToSummarize,
          selectedModel,
          onProgress
        );
        const modelObj = AVAILABLE_WEBLLM_MODELS.find((m) => m.id === selectedModel);
        setLastGeneratedBy(modelObj ? modelObj.name : 'WebLLM');

        // Generate pure Kannada summary directly with WebLLM to avoid mixed language
        try {
          generatedKan = await webllmService.summarizePetitionInKannada(
            textToSummarize,
            selectedModel,
            onProgress
          );
        } catch {
          generatedKan = webllmService.generateHeuristicKannadaSummary(textToSummarize);
        }
      } else {
        // Graceful fallback for browsers without WebGPU
        setProgressText('Generating offline administrative synopsis...');
        generatedEng = webllmService.generateHeuristicSummary(textToSummarize);
        generatedKan = webllmService.generateHeuristicKannadaSummary(textToSummarize);
        setLastGeneratedBy('Heuristic Synopsis');
      }

      onEnglishSummaryChange(generatedEng);
      if (generatedKan) {
        onKannadaSummaryChange(generatedKan);
      } else {
        // Fallback to backend translation if needed
        setIsTranslating(true);
        try {
          const transRes = await translationsService.translateText(
            generatedEng,
            'en',
            'kn'
          );
          if (transRes?.translated_text) {
            onKannadaSummaryChange(transRes.translated_text);
          }
        } catch (transErr: any) {
          console.warn('Kannada translation fallback notice:', transErr);
        } finally {
          setIsTranslating(false);
        }
      }

      setStatusMessage('Bilingual summaries populated in editable boxes below!');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      console.error('WebLLM generation error:', err);
      // If WebLLM fails, provide heuristic summary
      try {
        const fallback = webllmService.generateHeuristicSummary(textToSummarize);
        onEnglishSummaryChange(fallback);
        setLastGeneratedBy('Heuristic Fallback');
        setErrorMessage(
          `WebLLM notice: ${err?.message || 'GPU memory allocation issue'}. Applied heuristic synopsis instead.`
        );
      } catch {
        setErrorMessage(err?.message || 'Failed to generate summary.');
      }
    } finally {
      setIsLoading(false);
      setProgressStage('idle');
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
      <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 text-white">
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
                Client-side private neural summarization — zero API keys, 100% private in browser
              </p>
            </div>
          </div>

          {/* Model Selector & Action Button */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={isLoading}
                className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer pr-1"
              >
                {AVAILABLE_WEBLLM_MODELS.map((m) => (
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
                  <span>Translating to Kannada...</span>
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
                className="bg-linear-to-r from-indigo-500 to-emerald-400 h-1.5 rounded-full transition-all duration-300"
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
