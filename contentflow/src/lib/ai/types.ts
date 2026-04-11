// 이미지 생성 서비스 인터페이스 (Strategy Pattern)

export type AspectRatio = '1:1' | '4:5' | '9:16' | '16:9' | '3:4' | '4:3';
export type ImageSize = '512' | '1K' | '2K';

export interface ImageGenerationRequest {
  prompt: string;
  referenceImage?: string; // base64 data URL
  aspectRatio?: AspectRatio;
  imageSize?: ImageSize;
}

export interface ImageGenerationResult {
  base64: string;
  mimeType: string;
}

/**
 * Strategy 인터페이스: 이미지 생성 모델을 추상화
 * 새로운 이미지 생성 모델 추가 시 이 인터페이스만 구현하면 됨
 */
export interface ImageGenerator {
  generate(request: ImageGenerationRequest): Promise<ImageGenerationResult>;
}
