import type { Folder } from '@/types/folder';

export const MOCK_FOLDERS: Folder[] = [
  {
    id: 'folder-1',
    settings: {
      name: '강남 맛집',
      color: '#f97316',
      icon: '🍔',
      naverCategory: '강남/서초 맛집',
      mainKeywords: ['강남맛집', '강남역점심', '강남역카페'],
      seriesEnabled: true,
      seriesTitle: '강남 맛집 탐방',
      seriesCount: 5,
    },
    persona: {
      tone: '친근한 이웃',
      firstPerson: '저',
      intro: '10년차 강남 직장인, 맛집 탐방이 취미',
      style: '경어체',
      emoji: '적당히',
      blacklist: ['광고', '협찬'],
    },
    contentIds: ['content-1', 'content-2'],
    isExpanded: true,
    createdAt: '2025-01-15T09:00:00Z',
    updatedAt: '2025-01-20T14:30:00Z',
  },
  {
    id: 'folder-2',
    settings: {
      name: '육아 꿀팁',
      color: '#3b82f6',
      icon: '👶',
      naverCategory: '육아/교육',
      mainKeywords: ['육아팁', '신생아돌보기', '아기용품추천'],
      seriesEnabled: false,
      seriesTitle: '',
      seriesCount: 0,
    },
    persona: {
      tone: '따뜻한 육아맘',
      firstPerson: '저',
      intro: '두 아이를 키우고 있는 워킹맘',
      style: '경어체',
      emoji: '많이',
      blacklist: [],
    },
    contentIds: ['content-3'],
    isExpanded: false,
    createdAt: '2025-01-10T09:00:00Z',
    updatedAt: '2025-01-18T10:00:00Z',
  },
];
