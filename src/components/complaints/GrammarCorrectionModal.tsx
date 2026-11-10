import React, { useState } from 'react';
import {
  TextCorrectionResponse,
  CorrectionItem,
} from '../../types/textAssistance';
import { Button } from '../common/Button';
import {
  Sparkles,
  Check,
  X,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Info,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

interface GrammarCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetField: 'title' | 'description' | 'ocr' | 'summary';
  originalText: string;
  response: TextCorrectionResponse | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onAcceptAll: (correctedText: string, appliedCorrections: CorrectionItem[]) => void;
  onKeepOriginal: () => void;
}

export const GrammarCorrectionModal: React.FC<GrammarCorrectionModalProps> = ({
  isOpen,
  onClose,
  targetField,
  originalText,
  response,
  isLoading,
  error,
  onRetry,
  onAcceptAll,
  onKeepOriginal,
}) => {
  if (!isOpen) return null;

  // Individual selection mode
  const [isReviewIndividual, setIsReviewIndividual] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // Initialize selected indices when response changes
  React.useEffect(() => {
    if (response?.corrections) {
      setSelectedIndices(new Set(response.corrections.map((_, i) => i)));
    }
  }, [response]);

  const toggleCorrection = (index: number) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedIndices(next);
  };

  // Compute text when in individual review mode
  const computeCustomCorrectedText = (): string => {
    if (!response) return originalText;
    if (!isReviewIndividual || selectedIndices.size === response.corrections.length) {
      return response.corrected_text;
    }

    let modified = originalText;
    // Apply only selected corrections
    response.corrections.forEach((c, idx) => {
      if (selectedIndices.has(idx) && c.original && c.corrected) {
        // Safe word boundary / exact replacement
        modified = modified.replace(c.original, c.corrected);
      }
    });
    return modified;
  };

  const getCorrectionTypeBadge = (type: string) => {
    switch (type.toUpperCase()) {
      case 'SPELLING':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">SPELLING</span>;
      case 'TYPO':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">TYPO</span>;
      case 'GRAMMAR':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">GRAMMAR</span>;
      case 'PUNCTUATION':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">PUNCTUATION</span>;
      case 'SENTENCE_STRUCTURE':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">STRUCTURE</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">{type}</span>;
    }
  };

  const effectiveCorrectedText = computeCustomCorrectedText();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>AI Grammar & Writing Assistant</span>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded-full">
                  qwen2.5:1.5b (Local Ollama)
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Checking {
                  targetField === 'title'
                    ? 'Grievance Title'
                    : targetField === 'ocr'
                    ? 'Extracted Document (OCR Text)'
                    : targetField === 'summary'
                    ? 'Grievance Summary'
                    : 'Detailed Complaint Statement'
                }
                {response && ` • Detected Language: ${response.language}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Loading State */}
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
              <div>
                <p className="font-semibold text-slate-900 text-sm">
                  Analyzing petition with local Qwen2.5 1.5B via Ollama...
                </p>
                <p className="text-xs text-slate-500 max-w-md mt-1">
                  Checking spelling, grammar, punctuation, and phrasing while strictly protecting person names, numbers, allegations, and locations.
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-sm">Text Correction Service Notice</p>
                  <p className="text-xs text-amber-800 leading-relaxed">{error}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" onClick={onRetry} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* Response Display */}
          {response && !isLoading && !error && (
            <div className="space-y-4">
              {/* Flagged Entity / Manual Review Notice */}
              {(response.requires_manual_review || response.flagged_entity_changes.length > 0) && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Manual Review Recommended</p>
                    <p className="text-amber-800 text-[11px]">
                      The AI identified uncertainty or potential entity modifications. Verify names and figures carefully before accepting.
                    </p>
                    {response.flagged_entity_changes.map((flag, idx) => (
                      <p key={idx} className="text-[10px] text-amber-900 font-mono bg-amber-100/60 px-1.5 py-0.5 rounded">
                        • {flag}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Zero Errors Banner */}
              {response.corrections.length === 0 ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-900">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold">No Errors Found</p>
                    <p className="text-xs text-emerald-700">
                      Spelling, grammar, and sentence structure are already well-formed.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Side-by-side or stacked text comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Original */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Original Text
                        </span>
                        <span className="text-[10px] text-slate-400">{originalText.length} chars</span>
                      </div>
                      <p className="text-xs text-slate-800 font-medium leading-relaxed whitespace-pre-wrap bg-white p-2.5 rounded-lg border border-slate-100">
                        {originalText}
                      </p>
                    </div>

                    {/* Corrected */}
                    <div className="p-3.5 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Corrected Version
                        </span>
                        <span className="text-[10px] text-indigo-600 font-medium">
                          {isReviewIndividual ? `${selectedIndices.size}/${response.corrections.length} applied` : 'All applied'}
                        </span>
                      </div>
                      <p className="text-xs text-indigo-950 font-medium leading-relaxed whitespace-pre-wrap bg-white p-2.5 rounded-lg border border-indigo-100 shadow-xs">
                        {effectiveCorrectedText}
                      </p>
                    </div>
                  </div>

                  {/* Corrections List */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-indigo-600" />
                        Specific Improvements ({response.corrections.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsReviewIndividual(!isReviewIndividual)}
                        className="inline-flex items-center gap-1 text-xs text-indigo-700 hover:text-indigo-900 font-medium cursor-pointer"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>{isReviewIndividual ? 'Apply All Mode' : 'Review Individual Edits'}</span>
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {response.corrections.map((corr, idx) => {
                        const isSelected = selectedIndices.has(idx);
                        return (
                          <div
                            key={idx}
                            onClick={() => isReviewIndividual && toggleCorrection(idx)}
                            className={`p-2.5 rounded-lg border text-xs transition-colors ${
                              isReviewIndividual
                                ? isSelected
                                  ? 'bg-indigo-50/70 border-indigo-300 cursor-pointer'
                                  : 'bg-slate-50 border-slate-200 opacity-60 cursor-pointer'
                                : 'bg-slate-50/70 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                {isReviewIndividual && (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleCorrection(idx)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                  />
                                )}
                                {getCorrectionTypeBadge(corr.type)}
                                <span className="line-through text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded font-mono text-[11px]">
                                  {corr.original}
                                </span>
                                <ArrowRight className="w-3 h-3 text-slate-400" />
                                <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded font-mono text-[11px]">
                                  {corr.corrected}
                                </span>
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-1 pl-0.5">
                              {corr.explanation}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Administrative Disclaimer & Telemetry */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="leading-tight text-slate-600">
                    Administrative Writing Assistant. Meaning and facts must be verified before submission. Changes are not applied automatically.
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
                    <span>Model: <strong>{response.model_version}</strong></span>
                    <span>Latency: <strong>{response.latency_sec.toFixed(2)}s</strong></span>
                    <span>Speed: <strong>{response.eval_tokens_per_sec.toFixed(1)} tok/s</strong></span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / 3 Actions */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          {/* Action 1: Keep Original */}
          <Button
            size="sm"
            variant="outline"
            onClick={onKeepOriginal}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Keep Original
          </Button>

          <div className="flex items-center gap-2">
            {response && response.corrections.length > 0 && (
              <>
                {/* Action 2: Review Individual Toggle */}
                {!isReviewIndividual ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsReviewIndividual(true)}
                    leftIcon={<Sliders className="w-3.5 h-3.5" />}
                  >
                    Review Individual
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedIndices(new Set(response.corrections.map((_, i) => i)));
                      setIsReviewIndividual(false);
                    }}
                  >
                    Select All
                  </Button>
                )}

                {/* Action 3: Accept Corrections */}
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    const applied = isReviewIndividual
                      ? response.corrections.filter((_, i) => selectedIndices.has(i))
                      : response.corrections;
                    onAcceptAll(effectiveCorrectedText, applied);
                  }}
                  leftIcon={<Check className="w-3.5 h-3.5" />}
                >
                  {isReviewIndividual
                    ? `Accept Selected (${selectedIndices.size})`
                    : 'Accept All Corrections'}
                </Button>
              </>
            )}

            {response && response.corrections.length === 0 && (
              <Button size="sm" variant="primary" onClick={onClose}>
                Done
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

