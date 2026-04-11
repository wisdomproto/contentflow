// Centralized AI model definitions
// Source of truth for all Gemini model references across the app

export interface AIModel {
  id: string;
  label: string;
  tier: 'pro' | 'flash' | 'lite';
}

// --- Text Models ---
export const TEXT_MODELS: AIModel[] = [
  { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (Preview)', tier: 'pro' },
  { id: 'gemini-3-pro-preview', label: 'Gemini 3 Pro (Preview)', tier: 'pro' },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash (Preview)', tier: 'flash' },
  { id: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite (Preview)', tier: 'lite' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', tier: 'pro' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', tier: 'flash' },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', tier: 'lite' },
];

// --- Image Models ---
export const IMAGE_MODELS: AIModel[] = [
  { id: 'gemini-3.1-flash-image-preview', label: 'Gemini 3.1 Flash Image (Preview)', tier: 'flash' },
  { id: 'gemini-3-pro-image-preview', label: 'Gemini 3 Pro Image (Preview)', tier: 'pro' },
  { id: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image', tier: 'flash' },
];

// --- TTS Models ---
export const TTS_MODELS: AIModel[] = [
  { id: 'gemini-2.5-flash-preview-tts', label: 'Gemini 2.5 Flash TTS', tier: 'flash' },
  { id: 'gemini-2.5-pro-preview-tts', label: 'Gemini 2.5 Pro TTS', tier: 'pro' },
];

// --- Default model IDs ---
export const DEFAULT_TEXT_MODEL = 'gemini-2.5-flash';
export const DEFAULT_IMAGE_MODEL = 'gemini-3.1-flash-image-preview';
export const DEFAULT_TTS_MODEL = 'gemini-2.5-flash-preview-tts';

// Strategy/analysis uses stable models by default
export const DEFAULT_STRATEGY_MODEL = 'gemini-2.5-flash';
export const DEFAULT_ANALYSIS_MODEL = 'gemini-2.5-flash';

// --- ID arrays for quick lookups ---
export const TEXT_MODEL_IDS = TEXT_MODELS.map(m => m.id);
export const IMAGE_MODEL_IDS = IMAGE_MODELS.map(m => m.id);
export const TTS_MODEL_IDS = TTS_MODELS.map(m => m.id);

// --- Helpers ---
export function getModelLabel(id: string): string {
  const all = [...TEXT_MODELS, ...IMAGE_MODELS, ...TTS_MODELS];
  return all.find(m => m.id === id)?.label ?? id;
}
