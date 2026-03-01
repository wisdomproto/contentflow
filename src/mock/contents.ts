import type { ContentContext } from '@/types/content';

export const MOCK_CONTENTS: Record<string, ContentContext> = {
  'content-1': {
    id: 'content-1',
    folderId: 'folder-1',
    status: 'generated',
    source: {
      topic: '강남역 카페 투어',
      keywords: ['강남역카페', '강남카페추천', '강남역디저트'],
      tone: '친근한 이웃',
      insights: '주차 편함, 디저트 맛있음, 2층 루프탑 분위기 좋음',
      referenceUrls: [],
    },
    blog: {
      title: '강남역 카페 TOP5 | 웨이팅 없이 즐긴 솔직 후기',
      sections: [
        {
          id: 'sec-1',
          type: 'intro',
          header: '안녕하세요!',
          imageUrl: null,
          imagePlaceholder: '카페 외관 또는 대표 음료 사진을 추가해보세요',
          text: '<p>강남역에서 웨이팅 없이 카페 갈 수 있다고? 저도 처음엔 믿지 않았어요. 10년차 강남 직장인인 제가 직접 다녀온 카페 5곳을 솔직하게 리뷰해 드릴게요!</p>',
          isCollapsed: false,
        },
        {
          id: 'sec-2',
          type: 'body',
          header: '☕ 1. 모멘트 커피 - 루프탑의 매력',
          imageUrl: null,
          imagePlaceholder: '루프탑 전경 또는 시그니처 음료 사진',
          text: '<p>강남역 3번 출구에서 도보 5분 거리에 위치한 모멘트 커피는 2층 루프탑이 정말 예뻐요. 시그니처 라떼가 6,500원인데, 분위기 값까지 생각하면 가성비 훌륭합니다.</p><p>주차는 건물 지하 주차장 이용 가능하고, 2시간 무료예요!</p>',
          isCollapsed: false,
        },
        {
          id: 'sec-3',
          type: 'body',
          header: '🍰 2. 디저트바 루나 - 케이크 맛집',
          imageUrl: null,
          imagePlaceholder: '케이크 또는 디저트 클로즈업 사진',
          text: '<p>제가 직접 방문해 보니 디저트 퀄리티가 인상 깊었습니다. 특히 바스크 치즈케이크는 꼭 드셔보세요. 한 조각에 8,000원이지만 크기가 상당해요.</p>',
          isCollapsed: false,
        },
        {
          id: 'sec-4',
          type: 'qa',
          header: '자주 묻는 질문',
          imageUrl: null,
          imagePlaceholder: '',
          text: '',
          isCollapsed: false,
          question: '강남역 주차 가능한가요?',
          answer: '네, 건물 지하 2층 주차장 이용 가능합니다 (2시간 무료).',
        },
        {
          id: 'sec-5',
          type: 'summary',
          header: '오늘의 핵심 요약',
          imageUrl: null,
          imagePlaceholder: '',
          text: '',
          isCollapsed: false,
          points: [
            '강남역 도보 5분 거리 카페 5곳 소개',
            '가성비 좋은 디저트 카페 위주 선정',
            '모든 곳 주차 가능, 웨이팅 없음',
          ],
        },
      ],
      tags: ['#강남맛집', '#강남역카페', '#강남카페추천', '#강남디저트'],
    },
    cardnews: null,
    video: null,
    modelSettings: { blog: 'flash', cardnews: 'flash', video: 'flash' },
    imageModel: 'flash-image',
    createdAt: '2025-01-20T10:00:00Z',
    updatedAt: '2025-01-20T14:30:00Z',
  },
  'content-2': {
    id: 'content-2',
    folderId: 'folder-1',
    status: 'draft',
    source: {
      topic: '홍대 파스타 맛집 TOP5',
      keywords: ['홍대파스타', '홍대맛집', '홍대이탈리안'],
      tone: '',
      insights: '',
      referenceUrls: [],
    },
    blog: {
      title: '',
      sections: [
        {
          id: 'sec-6',
          type: 'intro',
          header: '',
          imageUrl: null,
          imagePlaceholder: '파스타 또는 레스토랑 외관 사진을 추가해보세요',
          text: '',
          isCollapsed: false,
        },
      ],
      tags: [],
    },
    cardnews: null,
    video: null,
    modelSettings: { blog: 'flash', cardnews: 'flash', video: 'flash' },
    imageModel: 'flash-image',
    createdAt: '2025-01-21T09:00:00Z',
    updatedAt: '2025-01-21T09:00:00Z',
  },
  'content-3': {
    id: 'content-3',
    folderId: 'folder-2',
    status: 'generated',
    source: {
      topic: '신생아 수면 교육 방법',
      keywords: ['신생아수면교육', '아기재우기', '수면훈련'],
      tone: '따뜻한 육아맘',
      insights: '첫째 때 실패 경험, 둘째 때 성공한 방법 공유',
      referenceUrls: [],
    },
    blog: {
      title: '신생아 수면 교육, 저는 이렇게 성공했어요 (실패 경험담 포함)',
      sections: [
        {
          id: 'sec-7',
          type: 'intro',
          header: '안녕하세요, 두 아이 맘이에요 🤗',
          imageUrl: null,
          imagePlaceholder: '아기 수면 관련 이미지',
          text: '<p>두 아이를 키우면서 가장 힘들었던 건 바로 수면 교육이었어요. 첫째 때는 완전히 실패했지만, 둘째 때 성공한 방법을 오늘 자세히 공유해 드릴게요! 😊</p>',
          isCollapsed: false,
        },
      ],
      tags: ['#수면교육', '#신생아', '#육아팁'],
    },
    cardnews: null,
    video: null,
    modelSettings: { blog: 'flash', cardnews: 'flash', video: 'flash' },
    imageModel: 'flash-image',
    createdAt: '2025-01-18T10:00:00Z',
    updatedAt: '2025-01-18T15:00:00Z',
  },
};

// AI idea extraction mock results keyed by topic keyword
export interface IdeaExtraction {
  keywords: string[];
  angles: string[];
  titles: string[];
}

const IDEA_MAP: Record<string, IdeaExtraction> = {
  카페: {
    keywords: ['카페추천', '분위기좋은카페', '디저트맛집', '카페투어', '브런치카페', '루프탑카페'],
    angles: [
      '웨이팅 없는 숨은 카페 리스트',
      '가성비 vs 분위기, 용도별 카페 가이드',
      '직장인 점심시간에 다녀올 수 있는 카페',
      '디저트가 맛있는 카페 TOP 5',
    ],
    titles: [
      '직접 가본 카페 TOP5 | 솔직 후기 (주차/가격 정보)',
      '웨이팅 없이 즐기는 숨은 카페 모음',
      '카페 투어 코스 추천 | 반나절 만에 다 돌기',
    ],
  },
  맛집: {
    keywords: ['맛집추천', '맛집리스트', '가성비맛집', '데이트맛집', '혼밥맛집', '주차가능맛집'],
    angles: [
      '현지인만 아는 찐 맛집 리스트',
      '가격대별 맛집 정리 (1만원 이하 / 2만원대)',
      '혼밥하기 좋은 맛집 모음',
      '데이트 코스로 완벽한 레스토랑',
    ],
    titles: [
      '현지인 추천 맛집 TOP5 | 웨이팅 각오 필수',
      '가성비 끝판왕! 만원 이하 맛집 총정리',
      '솔직 후기로 검증된 맛집 리스트',
    ],
  },
  육아: {
    keywords: ['육아팁', '신생아', '수면교육', '이유식', '아기발달', '워킹맘'],
    angles: [
      '실패 경험에서 배운 육아 노하우',
      '전문가 조언 vs 실제 육아 현실 비교',
      '월령별 맞춤 가이드',
      '워킹맘 시간 관리 꿀팁',
    ],
    titles: [
      '두 아이 맘의 솔직 육아 후기 (실패담 포함)',
      '이것만 알면 OK! 초보맘 필수 가이드',
      '소아과 의사가 알려준 육아 핵심 포인트',
    ],
  },
};

// Default fallback for any topic
const DEFAULT_IDEAS: IdeaExtraction = {
  keywords: ['추천', '후기', '비교', '가이드', '꿀팁', '총정리'],
  angles: [
    '초보자를 위한 완벽 가이드',
    '실제 경험자의 솔직 후기',
    '비용 대비 효과 분석',
    'TOP 5 리스트 형식 정리',
  ],
  titles: [
    '직접 경험한 솔직 후기 | 장단점 총정리',
    '초보자도 쉽게 따라하는 완벽 가이드',
    '꼭 알아야 할 핵심 포인트 5가지',
  ],
};

export function getMockIdeaExtraction(topic: string): IdeaExtraction {
  const matchedKey = Object.keys(IDEA_MAP).find((key) => topic.includes(key));
  if (!matchedKey) return DEFAULT_IDEAS;

  const matched = IDEA_MAP[matchedKey];
  // Prepend topic-specific prefix to generic keywords
  const topicPrefix = topic.replace(/\s+/g, '').slice(0, 6);
  return {
    ...matched,
    keywords: matched.keywords.map((kw) =>
      kw.startsWith(topicPrefix) ? kw : kw,
    ),
  };
}

export const MOCK_BLOG_GENERATION = {
  title: '강남역 카페 TOP5 | 웨이팅 없이 즐긴 솔직 후기',
  sections: [
    {
      id: 'gen-1',
      type: 'intro' as const,
      header: '안녕하세요! 👋',
      imageUrl: null,
      imagePlaceholder: '카페 외관 또는 대표 음료 사진을 추가해보세요',
      text: '<p>강남역에서 웨이팅 없이 카페 갈 수 있다고? 저도 처음엔 믿지 않았어요.</p><p>10년차 강남 직장인인 제가 직접 다녀온 카페 5곳을 솔직하게 리뷰해 드릴게요!</p>',
      isCollapsed: false,
    },
    {
      id: 'gen-2',
      type: 'body' as const,
      header: '☕ 1. 모멘트 커피 - 루프탑의 매력',
      imageUrl: null,
      imagePlaceholder: '루프탑 전경 또는 시그니처 음료 사진',
      text: '<p>강남역 3번 출구에서 도보 5분 거리에 위치한 모멘트 커피는 2층 루프탑이 정말 예뻐요.</p><p>시그니처 라떼가 6,500원인데, 분위기 값까지 생각하면 가성비 훌륭합니다. 주차는 건물 지하 주차장 이용 가능하고, 2시간 무료예요!</p>',
      isCollapsed: false,
    },
    {
      id: 'gen-3',
      type: 'body' as const,
      header: '🍰 2. 디저트바 루나 - 케이크 맛집',
      imageUrl: null,
      imagePlaceholder: '케이크 또는 디저트 클로즈업 사진',
      text: '<p>제가 직접 방문해 보니 디저트 퀄리티가 인상 깊었습니다.</p><p>특히 바스크 치즈케이크는 꼭 드셔보세요. 한 조각에 8,000원이지만 크기가 상당해요.</p>',
      isCollapsed: false,
    },
    {
      id: 'gen-4',
      type: 'qa' as const,
      header: '자주 묻는 질문 💬',
      imageUrl: null,
      imagePlaceholder: '',
      text: '',
      isCollapsed: false,
      question: '강남역 카페 주차 가능한가요?',
      answer: '네, 소개한 카페 모두 건물 지하 주차장 이용 가능합니다. 대부분 2시간 무료 주차를 제공해요.',
    },
    {
      id: 'gen-5',
      type: 'summary' as const,
      header: '오늘의 핵심 요약 📌',
      imageUrl: null,
      imagePlaceholder: '',
      text: '',
      isCollapsed: false,
      points: [
        '강남역 도보 5분 거리 카페 5곳 소개',
        '가성비 좋은 디저트 카페 위주 선정',
        '모든 곳 주차 가능, 웨이팅 없음',
      ],
    },
  ],
  tags: ['#강남맛집', '#강남역카페', '#강남카페추천', '#강남디저트'],
};
