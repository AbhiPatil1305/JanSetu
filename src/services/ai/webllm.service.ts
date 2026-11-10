/**
 * Client-Side WebLLM Service for JanSetu Grievance Portal.
 * Uses shared WebLlmManager to perform browser-native WebGPU inference.
 * Re-exports unified singleton methods for backward compatibility.
 */
import {
  webLlmManager,
  SUPPORTED_MODELS,
  WebLLMModelInfo,
  WebLLMProgressCallback,
  WebLLMProgressReport,
} from './webllm/WebLlmManager';
import { summarizationService } from './webllm/summarization.service';

export type WebLLMModelOption = WebLLMModelInfo;

export const AVAILABLE_WEBLLM_MODELS: WebLLMModelOption[] = SUPPORTED_MODELS;

export type ProgressCallback = (report: {
  progress: number;
  text: string;
  stage: 'downloading' | 'compiling' | 'generating' | 'ready' | 'idle';
}) => void;

class WebLLMService {
  /**
   * Check whether WebGPU is supported by the client browser.
   */
  public isWebGPUSupported(): boolean {
    return webLlmManager.isWebGPUSupported();
  }

  /**
   * Check if a model is currently loaded and ready.
   */
  public isModelLoaded(modelId?: string): boolean {
    return webLlmManager.isModelLoaded(modelId);
  }

  /**
   * Initialize or switch to a specific WebLLM model with progress tracking.
   */
  public async loadModel(
    modelId: string = AVAILABLE_WEBLLM_MODELS[0].id,
    onProgress?: ProgressCallback
  ) {
    const forwarder: WebLLMProgressCallback | undefined = onProgress
      ? (rep: WebLLMProgressReport) => {
          let stg: 'downloading' | 'compiling' | 'generating' | 'ready' | 'idle' = 'downloading';
          if (rep.stage === 'compiling' || rep.stage === 'generating' || rep.stage === 'ready' || rep.stage === 'idle') {
            stg = rep.stage;
          }
          onProgress({
            progress: rep.progress,
            text: rep.text,
            stage: stg,
          });
        }
      : undefined;

    return await webLlmManager.loadModel(modelId, forwarder);
  }

  /**
   * Generate an objective administrative summary of the grievance petition in English.
   */
  public async summarizePetition(
    text: string,
    modelId: string = AVAILABLE_WEBLLM_MODELS[0].id,
    onProgress?: ProgressCallback
  ): Promise<string> {
    const forwarder: WebLLMProgressCallback | undefined = onProgress
      ? (rep: WebLLMProgressReport) => {
          let stg: 'downloading' | 'compiling' | 'generating' | 'ready' | 'idle' = 'downloading';
          if (rep.stage === 'compiling' || rep.stage === 'generating' || rep.stage === 'ready' || rep.stage === 'idle') {
            stg = rep.stage;
          }
          onProgress({
            progress: rep.progress,
            text: rep.text,
            stage: stg,
          });
        }
      : undefined;

    const summaryObj = await summarizationService.summarizeGrievance({
      sourceText: text,
      language: 'en',
      modelId,
      onProgress: forwarder,
    });

    return summaryObj.detailed_summary || summaryObj.short_summary;
  }

  /**
   * Run in-browser WebLLM to generate a natural, pure Kannada administrative summary.
   */
  public async summarizePetitionInKannada(
    text: string,
    modelId: string = AVAILABLE_WEBLLM_MODELS[0].id,
    onProgress?: ProgressCallback
  ): Promise<string> {
    const forwarder: WebLLMProgressCallback | undefined = onProgress
      ? (rep: WebLLMProgressReport) => {
          let stg: 'downloading' | 'compiling' | 'generating' | 'ready' | 'idle' = 'downloading';
          if (rep.stage === 'compiling' || rep.stage === 'generating' || rep.stage === 'ready' || rep.stage === 'idle') {
            stg = rep.stage;
          }
          onProgress({
            progress: rep.progress,
            text: rep.text,
            stage: stg,
          });
        }
      : undefined;

    const summaryObj = await summarizationService.summarizeGrievance({
      sourceText: text,
      language: 'kn',
      modelId,
      onProgress: forwarder,
    });

    return summaryObj.detailed_summary || summaryObj.short_summary;
  }

  /**
   * Fast rule-based extractive fallback for English.
   */
  public generateHeuristicSummary(text: string): string {
    const res = summarizationService.generateHeuristicSummary(text, 'en');
    return res.detailed_summary || res.short_summary;
  }

  /**
   * Fast rule-based extractive fallback for Kannada.
   */
  public generateHeuristicKannadaSummary(text: string): string {
    const res = summarizationService.generateHeuristicSummary(text, 'kn');
    return res.detailed_summary || res.short_summary;
  }
}

export const webllmService = new WebLLMService();
