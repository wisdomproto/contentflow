import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GeminiModel, ImageModel } from '@/types/content';

const MODEL_MAP: Record<GeminiModel, string> = {
  flash: 'gemini-2.5-flash',
  pro: 'gemini-2.5-pro',
  'flash-3': 'gemini-3-flash-preview',
  'pro-31': 'gemini-3.1-pro-preview',
};

const IMAGE_MODEL_MAP: Record<ImageModel, string> = {
  'flash-image': 'gemini-2.5-flash-image',
  'pro-image': 'gemini-3-pro-image-preview',
  'flash-31-image': 'gemini-3.1-flash-image-preview',
};

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  return new GoogleGenerativeAI(apiKey);
}

export function getGeminiModel(model: GeminiModel = 'flash') {
  const genAI = getGenAI();
  return genAI.getGenerativeModel({ model: MODEL_MAP[model] });
}

export function getGeminiImageModel(model: ImageModel = 'flash-image') {
  const genAI = getGenAI();
  return genAI.getGenerativeModel({
    model: IMAGE_MODEL_MAP[model],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } as any,
  });
}
