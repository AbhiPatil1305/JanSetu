/**
 * Client-Side WebLLM Service for JanSetu Grievance Portal.
 * Uses @mlc-ai/web-llm to perform browser-native WebGPU inference
 * to generate neutral, factual summaries of citizen petitions.
 */
import { CreateMLCEngine, MLCEngine, InitProgressReport } from '@mlc-ai/web-llm';

export interface WebLLMModelOption {
  id: string;
  name: string;
  size: string;
  description: string;
  isDefault?: boolean;
}

export const AVAILABLE_WEBLLM_MODELS: WebLLMModelOption[] = [
  {
    id: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
    name: 'SmolLM2 (360M)',
    size: '~220 MB',
    description: 'Ultra-fast download & instant in-browser inference',
    isDefault: true,
  },
  {
    id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 (0.5B)',
    size: '~390 MB',
    description: 'Compact multilingual reasoning & summarization',
  },
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 (1B)',
    size: '~880 MB',
    description: 'Meta high-accuracy administrative synopsis',
  },
];

export type ProgressCallback = (report: {
  progress: number;
  text: string;
  stage: 'downloading' | 'compiling' | 'generating' | 'ready' | 'idle';
}) => void;

class WebLLMService {
  private engine: MLCEngine | null = null;
  private currentModelId: string | null = null;
  private isInitializing: boolean = false;

  /**
   * Check whether WebGPU is supported by the client browser.
   */
  public isWebGPUSupported(): boolean {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
  }

  /**
   * Check if a model is currently loaded and ready.
   */
  public isModelLoaded(modelId?: string): boolean {
    if (!this.engine) return false;
    if (modelId) return this.currentModelId === modelId;
    return this.currentModelId !== null;
  }

  /**
   * Initialize or switch to a specific WebLLM model with progress tracking.
   */
  public async loadModel(
    modelId: string = 'SmolLM2-360M-Instruct-q4f16_1-MLC',
    onProgress?: ProgressCallback
  ): Promise<MLCEngine> {
    if (this.engine && this.currentModelId === modelId) {
      onProgress?.({
        progress: 1,
        text: 'Model ready in browser memory',
        stage: 'ready',
      });
      return this.engine;
    }

    if (this.isInitializing) {
      throw new Error('A WebLLM model is already initializing. Please wait...');
    }

    this.isInitializing = true;

    try {
      if (!this.isWebGPUSupported()) {
        throw new Error(
          'WebGPU is not enabled or supported on this browser. Please enable WebGPU or use a modern Chrome/Edge/Brave browser.'
        );
      }

      onProgress?.({
        progress: 0.05,
        text: `Initializing ${modelId}...`,
        stage: 'downloading',
      });

      const engine = await CreateMLCEngine(modelId, {
        initProgressCallback: (report: InitProgressReport) => {
          let stage: 'downloading' | 'compiling' | 'ready' = 'downloading';
          if (report.text.toLowerCase().includes('compil') || report.text.toLowerCase().includes('loading')) {
            stage = 'compiling';
          }
          if (report.progress >= 1) {
            stage = 'ready';
          }

          onProgress?.({
            progress: report.progress,
            text: report.text,
            stage,
          });
        },
      });

      this.engine = engine;
      this.currentModelId = modelId;
      this.isInitializing = false;

      onProgress?.({
        progress: 1,
        text: 'Model successfully cached in browser memory',
        stage: 'ready',
      });

      return engine;
    } catch (err: any) {
      this.isInitializing = false;
      throw err;
    }
  }

  /**
   * Generate an objective administrative summary of the grievance petition.
   */
  public async summarizePetition(
    text: string,
    modelId: string = 'SmolLM2-360M-Instruct-q4f16_1-MLC',
    onProgress?: ProgressCallback
  ): Promise<string> {
    const trimmed = text.trim();
    if (!trimmed) {
      return '';
    }

    // Ensure model is initialized
    const engine = await this.loadModel(modelId, onProgress);

    onProgress?.({
      progress: 0.9,
      text: 'Generating neutral synopsis with WebLLM...',
      stage: 'generating',
    });

    const systemPrompt = `You are an administrative officer in a government grievance intake department.
Your task is to write a concise, neutral, and factual 2-3 sentence summary of the citizen's complaint.
Rules:
- State the grievance clearly: what happened, where, and what specific action/relief is requested.
- Maintain an objective, professional tone without emotional exaggeration.
- Do NOT include conversational filler, greetings, or preamble like "Here is a summary:".
- Output only the 2-3 sentence summary text.`;

    const response = await engine.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Please summarize the following petition:\n\n${trimmed.slice(0, 3000)}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 220,
    });

    const summary = response.choices[0]?.message?.content?.trim() || '';

    onProgress?.({
      progress: 1,
      text: 'Summary generated successfully!',
      stage: 'ready',
    });

    // Post-process to remove unwanted model preambles if any
    return summary
      .replace(/^(here is a (neutral|concise|brief)?\s*summary[:\s]*)/i, '')
      .replace(/^(summary[:\s]*)/i, '')
      .trim();
  }

  /**
   * Fast rule-based extractive fallback when WebGPU is unavailable or disabled.
   */
/**
   * Run in-browser WebLLM to generate a natural, pure Kannada administrative summary.
   */
  public async summarizePetitionInKannada(
    text: string,
    modelId: string = AVAILABLE_WEBLLM_MODELS[0].id,
    onProgress?: ProgressCallback
  ): Promise<string> {
    const trimmed = text.trim();
    if (!trimmed) return '';

    const engine = await this.loadModel(modelId, onProgress);

    onProgress?.({
      progress: 0.9,
      text: 'ಕನ್ನಡ ಸಾರಾಂಶವನ್ನು ರಚಿಸಲಾಗುತ್ತಿದೆ (Generating Kannada synopsis)...',
      stage: 'generating',
    });

    const systemPrompt = `ನೀವು ಕರ್ನಾಟಕ ಸರ್ಕಾರದ ಕುಂದುಕೊರತೆ ವಿಭಾಗದ ಆಡಳಿತಾಧಿಕಾರಿ.
ನಿಮ್ಮ ಕರ್ತವ್ಯ: ಪ್ರಸ್ತುತ ನಾಗರಿಕ ಅರ್ಜಿಯನ್ನು ಪರಿಶೀಲಿಸಿ, ಕೇವಲ 2 ಸರಳ ವಾಕ್ಯಗಳಲ್ಲಿ ಶುದ್ಧ ಕನ್ನಡದಲ್ಲಿ (ಯಾವುದೇ ಇಂಗ್ಲಿಷ್ ಪದಗಳಿಲ್ಲದೆ) ಅಧಿಕೃತ ಸಾರಾಂಶವನ್ನು ಬರೆಯಿರಿ.
ನಿಯಮಗಳು:
1. ಏನು ಸಮಸ್ಯೆ ನಡೆದಿದೆ, ಸ್ಥಳ, ಮತ್ತು ಕೋರಿದ ಪರಿಹಾರವನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ತಿಳಿಸಿ.
2. ಕೇವಲ ಕನ್ನಡ ಭಾಷೆ ಮತ್ತು ಲಿಪಿಯನ್ನು ಮಾತ್ರ ಬಳಸಿ.
3. ಮುನ್ನುಡಿ ಅಥವಾ ಇಂಗ್ಲಿಷ್ ಪದಗಳನ್ನು ಬರೆಯಬೇಡಿ.`;

    try {
      const response = await engine.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `ದಯವಿಟ್ಟು ಈ ಕೆಳಗಿನ ಅರ್ಜಿಯ ಸಾರಾಂಶವನ್ನು ಕನ್ನಡದಲ್ಲಿ ನೀಡಿ:

${trimmed.slice(0, 3000)}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 220,
      });

      const summary = response.choices[0]?.message?.content?.trim() || '';
      return summary
        .replace(/^(ಸಾರಾಂಶ[:\s]*)/i, '')
        .replace(/^(ಇಲ್ಲಿ ಸಾರಾಂಶವಿದೆ[:\s]*)/i, '')
        .trim();
    } catch {
      return this.generateHeuristicKannadaSummary(trimmed);
    }
  }

  /**
   * Fast rule-based extractive fallback for pure Kannada summary.
   */
  public generateHeuristicKannadaSummary(text: string): string {
    if (!text || !text.trim()) return '';
    const clean = text.trim();
    
    // Check if original text has Kannada sentences
    const kannadaSentences = clean
      .split(/[.?!।\n]+/).map((s) => s.trim())
      .map((s) => s.trim())
      .filter((s) => /[ಀ-೿]/.test(s) && s.length > 15);

    if (kannadaSentences.length >= 2) {
      return `${kannadaSentences[0]} ${kannadaSentences[1]}`.trim();
    }
    if (kannadaSentences.length === 1) {
      return `${kannadaSentences[0]} ಸಂಬಂಧಪಟ್ಟ ಅಧಿಕಾರಿಗಳು ಸ್ಥಳ ಪರಿಶೀಲನೆ ನಡೆಸಿ ತುರ್ತು ಕ್ರಮ ಕೈಗೊಳ್ಳಬೇಕಾಗಿ ಕೋರಲಾಗಿದೆ.`.trim();
    }

    // Default formal Kannada template for English-only documents
    return 'ಸಂಬಂಧಪಟ್ಟ ಇಲಾಖೆಯ ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ಸಾರ್ವಜನಿಕ ಕುಂದುಕೊರತೆ ನಿವಾರಣೆಗಾಗಿ ಸಲ್ಲಿಕೆಯಾದ ಅರ್ಜಿ. ಸ್ಥಳ ಪರಿಶೀಲನೆ ನಡೆಸಿ ಸೂಕ್ತ ಕಾನೂನು ಕ್ರಮ ಜರುಗಿಸಲು ವಿನಂತಿಸಲಾಗಿದೆ.';
  }

  public generateHeuristicSummary(text: string): string {
    if (!text || !text.trim()) return '';
    const clean = text.trim();
    const sentences = clean
      .split(/(?<=[.?!।])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 15);

    if (sentences.length <= 2) {
      return clean.slice(0, 350);
    }

    // Pick key administrative opening sentence + key action sentence
    const firstSentence = sentences[0];
    const actionSentence =
      sentences.find(
        (s, idx) =>
          idx > 0 &&
          /(request|please|action|repair|immediate|issue|problem|broken|encroach|ವಿನಂತಿ|ಸಮಸ್ಯೆ|ಕೂಡಲೇ|ಸರಿಪಡಿಸಿ)/i.test(
            s
          )
      ) || sentences[1];

    return `${firstSentence} ${actionSentence}`.trim();
  }
}

export const webllmService = new WebLLMService();

