// Post-MVP: Short-form video script types
export type SceneType = 'hook' | 'body' | 'outro';
export type Platform = 'reels' | 'shorts' | 'tiktok' | 'clip';

export interface Scene {
  id: string;
  type: SceneType;
  visual: string;
  narration: string;
  sec: number;
}

export interface VideoData {
  platform: Platform;
  totalSec: number;
  scenes: Scene[];
}
