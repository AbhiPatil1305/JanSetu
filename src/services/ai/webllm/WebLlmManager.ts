/**
 * Unified WebLLM Manager for JanSetu
 * 
 * Provides a robust singleton managing in-browser WebGPU LLM inference via @mlc-ai/web-llm.
 * Ensures a single model instance is shared across Grievance Summarisation and
 * Intelligent Form Auto-Fill, preventing redundant downloads or memory leaks.
 */
import { CreateMLCEngine, MLCEngine, InitProgressReport } from '@mlc-ai/web-llm';

export interface WebLLMModelInfo {
  id: string;
  name: string;
  size: string;
  description: string;
  isDefault?: boolean;
}

export const SUPPORTED_MODELS: WebLLMModelInfo[] = [
  {
    id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 (0.5B) - Recommended',
    size: '~390 MB',
    description: 'Superior Kannada & English comprehension, strict JSON compliance',
    isDefault: true,
  },
  {
    id: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
    name: 'SmolLM2 (360M) - Ultra Light',
    size: '~220 MB',
    description: 'Fastest download & lowest VRAM footprint (~600 MB VRAM)',
  },
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 (1B) - High Accuracy',
    size: '~880 MB',
    description: 'Meta administrative synopsis model for detailed analysis',
  },
];

export type WebLLMStage = 'downloading' | 'compiling' | 'generating' | 'ready' | 'idle' | 'error';

export interface WebLLMProgressReport {
  progress: number;
  text: string;
  stage: WebLLMStage;
}

export type WebLLMProgressCallback = (report: WebLLMProgressReport) => void;

export interface ChatCompletionOptions {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  max_tokens?: number;
  timeoutMs?: number;
}

export class WebLlmManager {
  private static instance: WebLlmManager | null = null;
  private engine: MLCEngine | null = null;
  private activeModelId: string | null = null;
  private initPromise: Promise<MLCEngine> | null = null;
  private progressListeners: Set<WebLLMProgressCallback> = new Set();

  private constructor() {
    // Singleton
  }

  public static getInstance(): WebLlmManager {
    if (!WebLlmManager.instance) {
      WebLlmManager.instance = new WebLlmManager();
    }
    return WebLlmManager.instance;
  }

  /**
   * Check whether WebGPU is supported by the client browser.
   */
  public isWebGPUSupported(): boolean {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
  }

  /**
   * Determine if the model is loaded and ready in browser memory.
   */
  public isModelLoaded(modelId?: string): boolean {
    if (!this.engine) return false;
    if (modelId) return this.activeModelId === modelId;
    return this.activeModelId !== null;
  }

  /**
   * Get the ID of the currently loaded model, if any.
   */
  public getActiveModelId(): string | null {
    return this.activeModelId;
  }

  /**
   * Subscribe to model loading and generation progress events.
   */
  public onProgress(callback: WebLLMProgressCallback): () => void {
    this.progressListeners.add(callback);
    return () => {
      this.progressListeners.delete(callback);
    };
  }

  private notifyProgress(report: WebLLMProgressReport): void {
    for (const listener of this.progressListeners) {
      try {
        listener(report);
      } catch (err) {
        console.error('Error in WebLLM progress listener:', err);
      }
    }
  }

  /**
   * Initialize or return the cached MLCEngine instance.
   * Employs an init lock promise to prevent concurrent duplicate model loads.
   */
  public async loadModel(
    modelId: string = SUPPORTED_MODELS[0].id,
    onProgress?: WebLLMProgressCallback
  ): Promise<MLCEngine> {
    if (onProgress) {
      this.progressListeners.add(onProgress);
    }

    try {
      // Return existing engine if already loaded with requested model
      if (this.engine && this.activeModelId === modelId) {
        this.notifyProgress({
          progress: 1,
          text: `Model ${modelId} is already active in WebGPU memory.`,
          stage: 'ready',
        });
        return this.engine;
      }

      // If an initialization is already underway, await it
      if (this.initPromise) {
        this.notifyProgress({
          progress: 0.5,
          text: 'Awaiting existing model initialization...',
          stage: 'downloading',
        });
        return await this.initPromise;
      }

      // Verify WebGPU capability
      if (!this.isWebGPUSupported()) {
        throw new Error(
          'WebGPU is not supported in this browser. Please use Chrome 113+, Edge 113+, or enable WebGPU under chrome://flags.'
        );
      }

      // If switching models, unload current engine first
      if (this.engine && this.activeModelId !== modelId) {
        await this.unloadModel();
      }

      this.notifyProgress({
        progress: 0.05,
        text: `Starting initialization of ${modelId}...`,
        stage: 'downloading',
      });

      this.initPromise = (async () => {
        try {
          const engine = await CreateMLCEngine(modelId, {
            initProgressCallback: (report: InitProgressReport) => {
              let stage: WebLLMStage = 'downloading';
              const textLower = report.text.toLowerCase();
              if (textLower.includes('compil') || textLower.includes('loading') || textLower.includes('cache')) {
                stage = 'compiling';
              }
              if (report.progress >= 1) {
                stage = 'ready';
              }

              this.notifyProgress({
                progress: report.progress,
                text: report.text,
                stage,
              });
            },
          });

          this.engine = engine;
          this.activeModelId = modelId;
          this.notifyProgress({
            progress: 1,
            text: `Model ${modelId} successfully initialized in WebGPU VRAM.`,
            stage: 'ready',
          });

          return engine;
        } finally {
          this.initPromise = null;
        }
      })();

      return await this.initPromise;
    } finally {
      if (onProgress) {
        this.progressListeners.delete(onProgress);
      }
    }
  }

  /**
   * Execute chat completion using the loaded model with timeout protection.
   */
  public async chatCompletion(
    options: ChatCompletionOptions,
    modelId: string = SUPPORTED_MODELS[0].id
  ): Promise<string> {
    const { messages, temperature = 0.1, max_tokens = 1000, timeoutMs = 90000 } = options;

    const engine = await this.loadModel(modelId);

    this.notifyProgress({
      progress: 0.9,
      text: 'Running WebGPU tensor inference...',
      stage: 'generating',
    });

    const completionPromise = engine.chat.completions.create({
      messages,
      temperature,
      max_tokens,
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`WebLLM inference timed out after ${timeoutMs / 1000} seconds.`));
      }, timeoutMs);
    });

    const response = await Promise.race([completionPromise, timeoutPromise]);
    const output = response.choices[0]?.message?.content?.trim() || '';

    this.notifyProgress({
      progress: 1,
      text: 'Inference completed successfully.',
      stage: 'ready',
    });

    return output;
  }

  /**
   * Unload the model and release WebGPU memory.
   */
  public async unloadModel(): Promise<void> {
    if (this.engine) {
      try {
        await this.engine.unload();
      } catch (e) {
        console.warn('Error during MLCEngine unload:', e);
      }
      this.engine = null;
      this.activeModelId = null;
      this.notifyProgress({
        progress: 0,
        text: 'Model unloaded from WebGPU memory.',
        stage: 'idle',
      });
    }
  }
}

export const webLlmManager = WebLlmManager.getInstance();

