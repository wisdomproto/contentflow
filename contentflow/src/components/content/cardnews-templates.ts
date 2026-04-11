import type { TextBlock } from './cardnews-card-item';

export interface CardTemplate {
  id: string;
  name: string;
  bgColor: string;
  textBlocks: Omit<TextBlock, 'text'>[];
  imageY: number;
  preview: { bg: string; textColor: string };
}

export const CARD_TEMPLATES: CardTemplate[] = [
  {
    id: 'clean-center',
    name: '클린 센터',
    bgColor: '#ffffff',
    imageY: 50,
    preview: { bg: '#ffffff', textColor: '#1a1a1a' },
    textBlocks: [
      { id: 'header', x: 10, y: 3, fontSize: 10, color: '#888888', fontWeight: 'normal', textAlign: 'center', width: 80 },
      { id: 'title', x: 10, y: 8, fontSize: 24, color: '#1a1a1a', fontWeight: 'bold', textAlign: 'center', width: 80 },
      { id: 'body', x: 10, y: 75, fontSize: 13, color: '#444444', fontWeight: 'normal', textAlign: 'center', width: 80 },
      { id: 'footer', x: 10, y: 92, fontSize: 10, color: '#999999', fontWeight: 'normal', textAlign: 'center', width: 80 },
    ],
  },
  {
    id: 'dark-modern',
    name: '다크 모던',
    bgColor: '#111111',
    imageY: 50,
    preview: { bg: '#111111', textColor: '#ffffff' },
    textBlocks: [
      { id: 'header', x: 10, y: 8, fontSize: 11, color: '#00FF88', fontWeight: 'bold', textAlign: 'left', width: 80 },
      { id: 'title', x: 10, y: 20, fontSize: 36, color: '#ffffff', fontWeight: 'bold', textAlign: 'left', width: 80 },
      { id: 'body', x: 10, y: 55, fontSize: 14, color: '#aaaaaa', fontWeight: 'normal', textAlign: 'left', width: 80 },
      { id: 'footer', x: 10, y: 90, fontSize: 10, color: '#555555', fontWeight: 'normal', textAlign: 'left', width: 80 },
    ],
  },
  {
    id: 'minimal',
    name: '미니멀',
    bgColor: '#f5f5f5',
    imageY: 50,
    preview: { bg: '#f5f5f5', textColor: '#222222' },
    textBlocks: [
      { id: 'title', x: 10, y: 40, fontSize: 40, color: '#222222', fontWeight: 'bold', textAlign: 'center', width: 80 },
      { id: 'footer', x: 10, y: 90, fontSize: 10, color: '#999999', fontWeight: 'normal', textAlign: 'center', width: 80 },
    ],
  },
  {
    id: 'magazine',
    name: '매거진',
    bgColor: '#ffffff',
    imageY: 50,
    preview: { bg: '#ffffff', textColor: '#1a1a1a' },
    textBlocks: [
      { id: 'header', x: 10, y: 5, fontSize: 10, color: '#E74C3C', fontWeight: 'bold', textAlign: 'left', width: 40 },
      { id: 'title', x: 10, y: 15, fontSize: 28, color: '#1a1a1a', fontWeight: 'bold', textAlign: 'left', width: 80 },
      { id: 'body', x: 10, y: 40, fontSize: 13, color: '#444444', fontWeight: 'normal', textAlign: 'left', width: 70 },
      { id: 'footer', x: 50, y: 90, fontSize: 9, color: '#aaaaaa', fontWeight: 'normal', textAlign: 'right', width: 40 },
    ],
  },
  {
    id: 'bold-dark',
    name: '볼드 다크',
    bgColor: '#0A0A0F',
    imageY: 50,
    preview: { bg: '#0A0A0F', textColor: '#ffffff' },
    textBlocks: [
      { id: 'title', x: 5, y: 30, fontSize: 48, color: '#ffffff', fontWeight: 'bold', textAlign: 'center', width: 90 },
      { id: 'body', x: 10, y: 65, fontSize: 15, color: '#888888', fontWeight: 'normal', textAlign: 'center', width: 80 },
    ],
  },
  {
    id: 'photo-cover',
    name: '포토 커버',
    bgColor: '#000000',
    imageY: 30,
    preview: { bg: '#333333', textColor: '#ffffff' },
    textBlocks: [
      { id: 'header', x: 10, y: 5, fontSize: 11, color: '#ffffff', fontWeight: 'bold', textAlign: 'left', width: 80 },
      { id: 'title', x: 10, y: 70, fontSize: 30, color: '#ffffff', fontWeight: 'bold', textAlign: 'left', width: 80 },
      { id: 'body', x: 10, y: 82, fontSize: 13, color: '#dddddd', fontWeight: 'normal', textAlign: 'left', width: 80 },
      { id: 'footer', x: 10, y: 92, fontSize: 10, color: '#aaaaaa', fontWeight: 'normal', textAlign: 'left', width: 80 },
    ],
  },
  {
    id: 'step-card',
    name: '스텝 카드',
    bgColor: '#fafaf8',
    imageY: 50,
    preview: { bg: '#fafaf8', textColor: '#1a1a1a' },
    textBlocks: [
      { id: 'header', x: 10, y: 8, fontSize: 36, color: '#8B5CF6', fontWeight: 'bold', textAlign: 'left', width: 30 },
      { id: 'title', x: 10, y: 30, fontSize: 24, color: '#1a1a1a', fontWeight: 'bold', textAlign: 'left', width: 80 },
      { id: 'body', x: 10, y: 45, fontSize: 14, color: '#555555', fontWeight: 'normal', textAlign: 'left', width: 80 },
      { id: 'footer', x: 10, y: 90, fontSize: 10, color: '#aaaaaa', fontWeight: 'normal', textAlign: 'left', width: 80 },
    ],
  },
  {
    id: 'brand-card',
    name: '브랜드 카드',
    bgColor: '#7C3AED',
    imageY: 50,
    preview: { bg: '#7C3AED', textColor: '#ffffff' },
    textBlocks: [
      { id: 'header', x: 10, y: 8, fontSize: 12, color: '#F472B6', fontWeight: 'bold', textAlign: 'center', width: 80 },
      { id: 'title', x: 10, y: 35, fontSize: 34, color: '#ffffff', fontWeight: 'bold', textAlign: 'center', width: 80 },
      { id: 'body', x: 10, y: 60, fontSize: 14, color: '#eeeeee', fontWeight: 'normal', textAlign: 'center', width: 80 },
      { id: 'footer', x: 10, y: 88, fontSize: 12, color: '#ffffff', fontWeight: 'bold', textAlign: 'center', width: 80 },
    ],
  },
];
