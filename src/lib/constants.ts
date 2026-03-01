export const TONE_OPTIONS = [
  { value: '친근한 이웃', label: '친근한 이웃' },
  { value: '전문적 정보형', label: '전문적 정보형' },
  { value: '유머러스 MZ', label: '유머러스 MZ' },
  { value: '따뜻한 육아맘', label: '따뜻한 육아맘' },
] as const;

export const FIRST_PERSON_OPTIONS = [
  { value: '나', label: '나' },
  { value: '저', label: '저' },
  { value: '필자', label: '필자' },
] as const;

export const STYLE_OPTIONS = [
  { value: '경어체', label: '경어체' },
  { value: '반말체', label: '반말체' },
  { value: '혼용', label: '혼용' },
] as const;

export const EMOJI_OPTIONS = [
  { value: '많이', label: '많이' },
  { value: '적당히', label: '적당히' },
  { value: '사용 안 함', label: '사용 안 함' },
] as const;

export const FOLDER_COLORS = [
  '#f97316', // orange
  '#3b82f6', // blue
  '#22c55e', // green
  '#ef4444', // red
  '#a855f7', // purple
  '#eab308', // yellow
  '#06b6d4', // cyan
  '#ec4899', // pink
] as const;

export const FOLDER_ICONS = [
  '📁', '🍔', '👶', '✈️', '💼', '🎨', '📚', '🏋️',
  '🎵', '🛍️', '🏠', '💻', '🌿', '📷', '🎮', '☕',
] as const;

export const STATUS_CONFIG = {
  draft: { label: '초안', color: 'bg-gray-200 text-gray-700' },
  generated: { label: '생성완료', color: 'bg-blue-100 text-blue-700' },
  published: { label: '발행', color: 'bg-green-100 text-green-700' },
  needs_edit: { label: '수정필요', color: 'bg-orange-100 text-orange-700' },
} as const;

export const GEMINI_MODELS = [
  {
    value: 'flash' as const,
    label: 'Gemini 2.5 Flash',
    badge: '⚡',
    speed: '빠름',
    quality: 3,
    description: '빠른 초안·카드뉴스 텍스트·대량 생성',
  },
  {
    value: 'pro' as const,
    label: 'Gemini 2.5 Pro',
    badge: '🎯',
    speed: '보통',
    quality: 4,
    description: '블로그 정교화·경쟁 분석·멀티모달 입력',
  },
  {
    value: 'flash-3' as const,
    label: 'Gemini 3 Flash',
    badge: '🚀',
    speed: '빠름',
    quality: 4,
    description: '3세대 빠른 모델·고품질·효율적',
  },
  {
    value: 'pro-31' as const,
    label: 'Gemini 3.1 Pro',
    badge: '👑',
    speed: '느림',
    quality: 5,
    description: '최고 품질·복잡한 구조·심층 SEO 전략',
  },
] as const;

export const GEMINI_IMAGE_MODELS = [
  {
    value: 'flash-image' as const,
    label: 'Gemini 2.5 Flash',
    badge: '⚡',
    description: '빠른 이미지 생성',
  },
  {
    value: 'pro-image' as const,
    label: 'Gemini 3 Pro Image',
    badge: '🎯',
    description: '고품질 이미지 생성',
  },
  {
    value: 'flash-31-image' as const,
    label: 'Gemini 3.1 Flash Image',
    badge: '👑',
    description: '최신 이미지 모델',
  },
] as const;

export const DEFAULT_MODEL_SETTINGS = {
  blog: 'flash' as const,
  cardnews: 'flash' as const,
  video: 'flash' as const,
};

export const DEFAULT_IMAGE_MODEL = 'flash-image' as const;

export const CARD_NEWS_TEMPLATES = [
  { value: 'minimal', label: '미니멀' },
  { value: 'bold', label: '볼드' },
  { value: 'magazine', label: '매거진' },
  { value: 'gradient', label: '그라데이션' },
] as const;

export const CARD_NEWS_COLOR_THEMES = [
  { value: 'white', label: '화이트', bg: '#ffffff', text: '#111827' },
  { value: 'dark', label: '다크', bg: '#111827', text: '#f3f4f6' },
  { value: 'blue', label: '블루', bg: '#1e40af', text: '#ffffff' },
  { value: 'warm', label: '따뜻한', bg: '#fef3c7', text: '#78350f' },
  { value: 'mint', label: '민트', bg: '#d1fae5', text: '#064e3b' },
  { value: 'pink', label: '핑크', bg: '#fce7f3', text: '#831843' },
] as const;

export const CARD_NEWS_FONTS = [
  { value: 'pretendard', label: 'Pretendard' },
  { value: 'noto-sans', label: 'Noto Sans KR' },
] as const;

export const DEFAULT_PERSONA = {
  tone: '친근한 이웃',
  firstPerson: '저' as const,
  intro: '',
  style: '경어체' as const,
  emoji: '적당히' as const,
  blacklist: [],
};
