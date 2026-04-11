# AI 마케팅 전략 기능 — 설계 스펙

## 개요

ContentFlow에 **AI 마케팅 전략** 기능을 추가한다. 사용자가 타겟 URL, 비즈니스 정보, 키워드 등을 입력하면 AI가 시장 조사, 경쟁사 분석, 키워드 분석, 채널 전략, 콘텐츠 주제 생성까지 통합 마케팅 전략을 자동 수립한다.

### 핵심 가치
- 네이버 API 실데이터 + AI 분석을 결합한 데이터 기반 전략
- 전략 → 콘텐츠 생성까지 원클릭 연동
- 프로젝트 단위로 전략을 관리하여 콘텐츠 제작 시 바로 참조

---

## 1. 진입 방식 — 하이브리드

### 전용 페이지
- 프로젝트 선택 → 프로젝트 헤더의 **"AI 마케팅 전략"** 버튼 클릭
- `/dashboard/strategy` 풀페이지로 이동
- 히어로 + 5탭 대시보드 레이아웃

### 콘텐츠 탭 연동
- 블로그 패널: 전략에서 추천된 키워드를 배너로 표시, "키워드 적용" → SEO 주요/보조 키워드 자동 세팅
- 주제 목록에서 "콘텐츠 만들기" → Content + BaseArticle 자동 생성

---

## 2. 입력 폼

전략 생성 전 사용자로부터 6가지 정보를 수집한다.

| 입력 | 필수 | 설명 |
|------|------|------|
| 타겟 URL | 선택 | 홈페이지, SNS 채널 URL. 여러 개 입력 가능. AI가 크롤링하여 사이트 구조, 콘텐츠, 강점/약점 자동 파악 |
| 비즈니스 정보 | 필수 | 업종, 주요 서비스/제품, 타겟 고객, USP(차별화 포인트), 보유 채널 |
| 핵심 키워드 시드 | 필수 | 3~10개 입력 → 네이버 API로 연관 키워드 자동 확장. 입력 즉시 검색량 미리보기 |
| 경쟁사 | 선택 | 이름 또는 URL 입력. 비워두면 AI가 업종/키워드 기반으로 자동 탐색 |
| 예산 & 인력 | 선택 | 월 마케팅 예산 범위, 담당 인원 수. 미입력 시 기본값(예산: 미정, 인원: 1명) 적용 |
| 기존 프로젝트 설정 | 자동 | 이미 입력된 브랜드 정보, 마케터 페르소나, 채널 설정을 자동으로 가져옴 |

### 기존 프로젝트 설정 매핑

| 프로젝트 설정 필드 | → 전략 입력 필드 |
|-------------------|-----------------|
| `project.brand_name` | `businessInfo.industry` (참고용) |
| `project.brand_description` | `businessInfo.services` |
| `project.target_audience` | `businessInfo.targetCustomer` |
| `project.brand_usp` | `businessInfo.usp` |
| `project.channel_prompts` (키 목록) | `businessInfo.channels` |
| `project.marketer_persona` | AI 프롬프트 컨텍스트로 전달 |

사용자가 자동 채워진 값을 수정할 수 있다.

---

## 3. 전략 대시보드 — 5탭 구조

### 탭 ① 개요·경쟁사

**개요 섹션:**
- 비즈니스 핵심 요약 (AI가 URL + 비즈니스 정보 기반으로 분석)
- 핵심 차별화 포인트 카드
- 현재 문제점 & 기회 (홈페이지 분석 기반)
- 히어로 통계 (분석 키워드 수, 콘텐츠 주제 수, 모바일 검색 비중 등)

**경쟁사 섹션:**
- 경쟁사 카드 3~5개 — 강점, 약점, 마케팅 전략 분석
- 차별화 포지셔닝 도출
- 경쟁 우위 무기 제안

### 탭 ② 키워드 분석

**네이버 API 실데이터:**
- 전체 키워드 테이블 — 월간 검색량(PC/모바일 분리), 경쟁률(높음/중간/낮음)
- 파워링크 평균 노출 순위 (`plAvgDepth`) — CPC 직접 조회 불가하므로 노출 순위를 경쟁 강도 프록시로 사용
- 클릭 지표 — PC/모바일 평균 클릭수, CTR (기존 API에서 이미 반환)
- 검색 트렌드 — 네이버 DataLab API로 최근 12개월 월별 상대 검색량 추이 차트
- 연관 키워드 자동 확장 — 기존 `/keywordstool` API의 `hintKeywords`로 연관 키워드 수집 (별도 엔드포인트 불필요)
- 카테고리별 필터 (AI가 자동 분류한 그룹)

**AI 분석:**
- 황금 키워드 자동 추천 — 검색량 높고 경쟁 낮은 키워드 선별 + 공략법 카드
- 키워드 인사이트 카드 — 모바일 비중, 경쟁 현실, 시즌성 등 핵심 발견
- 파워링크 Tier 분류 — 경쟁률+노출순위 기반으로 Tier1 전환용, Tier2 정보용, Tier3 시즌성
- 블로그 SEO 키워드 연동 버튼 — 선택한 키워드를 블로그 패널에 자동 세팅

### 탭 ③ 채널·퍼널 전략

**퍼널 전략:**
- 유입 퍼널 플로우 다이어그램 (검색/SNS → 홈페이지 → 상담 → 전환 → 리텐션 → 바이럴)
- 퍼널 단계별 핵심 액션
- 홈페이지 전환 최적화 제안

**채널별 전략:**
- 채널 카드 — 네이버 블로그, 인스타그램, 유튜브(본영상/쇼츠), 스레드, 커뮤니티 등
- 채널별: 주 발행 빈도, 최적 시간대, 핵심 키워드 배분, 콘텐츠 유형
- **주간 발행 스케줄 테이블** (채널 × 요일 매트릭스) — 이 탭에서만 표시
- 담당 역할 분배 (인력 기반)
- 해외 채널 전략 (해당 시)
- 채널별 광고 예산 배분

### 탭 ④ 콘텐츠·주제

**콘텐츠 전략:**
- 카테고리 순환 구조 (A→B→C→D→E 사이클)
- 카테고리별 콘텐츠 비율
- 사이클 기간 및 반복 횟수 (예: 5주 1사이클 = 연 10회)

**주제 목록 (AI 자동 생성):**
- 키워드 데이터 기반 콘텐츠 주제 50~100개 자동 생성
- 주제별: 카테고리, 콘텐츠 각도, 핵심 키워드, 타겟 채널, 출처
- 카테고리 필터
- 유튜브 기게시/미게시 대조 (해당 시)
- **"이 주제로 콘텐츠 만들기"** 버튼 → Content + BaseArticle 자동 생성, 키워드/각도 자동 세팅

### 탭 ⑤ KPI·액션플랜

**KPI 체계:**
- 채널별 KPI 카드 — 핵심 지표 + 목표치
- 통합 KPI — 최종 전환 지표
- 측정 방법 안내

**액션플랜:**
- 우선순위 액션 테이블 — 순위, 액션, 타임라인, 예상 비용, 담당
- 즉시/단기/중기 분류 뱃지
- 예산 배분 요약

---

## 4. AI 생성 플로우

### 전체 생성 (초기)
1. 사용자가 입력 폼 작성 → "전략 생성하기" 클릭
2. **네이버 API 호출** — 시드 키워드 → `/keywordstool`로 연관 키워드 + 검색량/경쟁률/클릭수 수집
3. **네이버 DataLab API 호출** — 12개월 검색 트렌드 수집 (별도 인증: Client ID/Secret)
4. **URL 크롤링** — 타겟 URL의 HTML 가져와서 텍스트 추출 (서버사이드 `fetch` + HTML 파싱)
5. **AI 순차 생성** — 수집된 데이터를 컨텍스트로 5탭 순차 생성 (SSE 스트리밍)
   - 탭별 진행률 표시 (① 생성 중... → ② 생성 중... → ... → ⑤ 완료)
6. 결과 대시보드 렌더링

### 탭별 재생성
- 각 탭 상단 "🔄 재생성" 버튼
- 수정 지시 입력란 — "경쟁사 A를 추가해줘", "예산을 200만원으로 줄여줘" 등
- 재생성 시 다른 탭의 기존 데이터를 컨텍스트로 유지

### 키워드 → 전략 연쇄
- 키워드 탭의 데이터가 채널 전략, 콘텐츠 주제, KPI 탭의 AI 생성 컨텍스트로 자동 전달
- 키워드 탭 재생성 시, 의존하는 탭에 "데이터 변경됨 — 재생성 추천" 알림

### 에러 처리
- **네이버 API 실패**: 에러 메시지 표시 + 키워드 없이 AI 생성 진행 가능 (수동 키워드 입력 폼 제공)
- **URL 크롤링 실패**: 경고 표시 + 비즈니스 정보만으로 생성 진행. robots.txt 차단, 403, 타임아웃(10초) 모두 graceful 처리
- **AI 생성 중 실패**: 이미 완료된 탭은 유지. 실패한 탭만 에러 상태 표시 + "재시도" 버튼
- **사용자 이탈**: 생성 중 페이지 이동 시 확인 다이얼로그. 이탈해도 완료된 탭 데이터는 저장됨
- **Rate limit**: 네이버 API 429 응답 시 "잠시 후 다시 시도해주세요" 메시지

### SSE 이벤트 포맷

```typescript
// 탭 생성 시작
{ type: 'tab_start', tab: 'overview' }

// 청크 스트리밍 (텍스트)
{ type: 'chunk', tab: 'overview', content: '...' }

// 탭 생성 완료 (파싱된 구조 데이터)
{ type: 'tab_complete', tab: 'overview', data: OverviewData }

// 탭 생성 실패
{ type: 'tab_error', tab: 'keywords', error: '네이버 API 호출 실패' }

// 전체 완료
{ type: 'complete' }
```

---

## 5. 데이터 모델

Zustand Store에 `MarketingStrategy`를 추가한다. Project와 1:1 관계. 전략 재생성 시 기존 데이터를 덮어쓴다 (버전 관리 없음).

### Store 통합
- 기존 `project-store.ts`에 strategy 슬라이스 추가
- CRUD 액션: `createOrUpdateStrategy`, `deleteStrategy`, `getStrategy`
- Project 삭제 시 연관 Strategy cascade 삭제 (기존 패턴 동일)
- IndexedDB 영속화: `partialize`에 strategy 데이터 포함

```typescript
// ===== 최상위 =====

interface MarketingStrategy {
  id: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;

  // 입력 데이터
  input: StrategyInput;

  // 5탭 결과 데이터
  overview: OverviewData | null;
  keywords: KeywordData | null;
  channelStrategy: ChannelStrategyData | null;
  contentStrategy: ContentStrategyData | null;
  kpiAction: KpiActionData | null;

  // 생성 상태
  generationStatus: GenerationStatus;
}

interface GenerationStatus {
  overall: 'idle' | 'generating' | 'complete' | 'error';
  tabs: Record<StrategyTab, TabStatus>;
}

interface TabStatus {
  status: 'idle' | 'generating' | 'complete' | 'error';
  errorMessage?: string;
}

type StrategyTab = 'overview' | 'keywords' | 'channelStrategy' | 'contentStrategy' | 'kpiAction';

// ===== 입력 =====

interface StrategyInput {
  targetUrls: string[];
  businessInfo: {
    industry: string;
    services: string;
    targetCustomer: string;
    usp: string;
    channels: string[];
  };
  seedKeywords: string[];
  competitors: { name: string; url?: string }[];
  budget?: {
    monthlyRange: string;  // "100-300만원" 등. 미입력 시 "미정"
    teamSize: number;      // 미입력 시 기본 1
  };
}

// ===== 탭 ① 개요·경쟁사 =====

interface OverviewData {
  summary: string;                    // 비즈니스 핵심 요약
  differentiators: DifferentiatorCard[];  // 핵심 차별화 카드
  issues: IssueCard[];                // 문제점 & 기회
  heroStats: HeroStat[];             // 히어로 통계
  competitors: CompetitorCard[];      // 경쟁사 카드
  positioning: string;                // 차별화 포지셔닝 요약
}

interface DifferentiatorCard {
  label: string;    // 카드 라벨 (예: "핵심 차별화")
  title: string;
  description: string;
  color: 'teal' | 'amber' | 'coral' | 'purple';
}

interface IssueCard {
  severity: 'critical' | 'warning' | 'opportunity';  // 🔴 🟡 🟢
  title: string;
  description: string;
}

interface HeroStat {
  value: string;   // "259"
  label: string;   // "분석 키워드 수"
}

interface CompetitorCard {
  name: string;
  type: string;     // "한의원", "대형 병원" 등
  strengths: string;
  weaknesses: string;
  strategy: string;
}

// ===== 탭 ② 키워드 분석 =====

interface KeywordData {
  items: KeywordItem[];
  goldenKeywords: GoldenKeyword[];
  insights: KeywordInsight[];
  trends: KeywordTrend[];
  categories: string[];              // AI 분류된 카테고리 목록
}

interface KeywordItem {
  keyword: string;
  totalSearch: number;
  pcSearch: number;
  mobileSearch: number;
  mobileRatio: number;
  competition: 'high' | 'medium' | 'low';
  plAvgDepth: number;                // 파워링크 평균 노출 순위 (CPC 프록시)
  pcClickCount: number;
  mobileClickCount: number;
  pcCtr: number;
  mobileCtr: number;
  category: string;                  // AI 분류 카테고리
  isGolden: boolean;
}

interface GoldenKeyword {
  keyword: string;
  totalSearch: number;
  competition: string;
  strategy: string;                  // 공략법 설명
  priority: number;                  // 공략 우선순위
}

interface KeywordInsight {
  title: string;
  description: string;
  color: 'teal' | 'amber' | 'coral' | 'purple';
}

interface KeywordTrend {
  keyword: string;
  monthly: { period: string; ratio: number }[];  // DataLab 상대값 (0~100)
}

// ===== 탭 ③ 채널·퍼널 =====

interface ChannelStrategyData {
  funnel: FunnelStep[];
  funnelActions: string;              // 퍼널별 핵심 액션 설명
  homepageOptimization: string;       // 홈페이지 전환 최적화 제안
  channels: ChannelCard[];
  schedule: ScheduleRow[];            // 주간 발행 스케줄
  roles: RoleCard[];                  // 담당 역할 분배
  globalStrategy?: string;            // 해외 채널 전략 (해당 시)
}

interface FunnelStep {
  icon: string;
  title: string;
  description: string;
}

interface ChannelCard {
  channel: string;                    // "네이버 블로그", "인스타그램" 등
  icon: string;
  frequency: string;                  // "주 3회"
  bestTime: string;                   // "오전 10시"
  strategy: string;
  keywords: string[];                 // 이 채널에 배분된 키워드
  adBudget?: string;                  // 광고 예산
}

interface ScheduleRow {
  channel: string;
  days: Record<string, string>;       // { "월": "발행①", "화": "—", ... }
  weeklyCount: string;
  time: string;
}

interface RoleCard {
  role: string;    // "A 담당"
  title: string;   // "촬영·편집"
  tasks: string;
}

// ===== 탭 ④ 콘텐츠·주제 =====

interface ContentStrategyData {
  categories: ContentCategory[];
  cycleInfo: string;                  // "5주 1사이클 = 연 10회 반복"
  categoryRatios: string;            // 카테고리별 비율 설명
  topics: TopicItem[];
}

interface ContentCategory {
  code: string;    // "A", "B", "C"...
  name: string;    // "성장과학", "부모공감"...
  description: string;
  topicCount: number;
}

interface TopicItem {
  id: string;
  category: string;                   // "A", "B", "C", "D", "E"
  title: string;
  angle: string;                      // 콘텐츠 각도
  keywords: string[];
  targetChannels: string[];           // 타겟 채널 ["블로그", "유튜브", "인스타"]
  source: string;
  youtubeStatus?: 'new' | 'done' | 'similar';
  youtubeMatch?: string;             // 매칭된 기존 영상 제목
}

// ===== 탭 ⑤ KPI·액션 =====

interface KpiActionData {
  channelKpis: ChannelKpi[];
  integratedKpi: {
    metrics: string[];
    warning: string;                  // 주의사항 (예: "유입 경로 수집 없으면 KPI 측정 무의미")
  };
  actions: ActionItem[];
  budgetSummary: string;              // 예산 배분 요약
}

interface ChannelKpi {
  channel: string;
  icon: string;
  metrics: string[];
  target: string;                     // 목표치
}

interface ActionItem {
  priority: 'now' | 'soon' | 'mid';
  action: string;
  description?: string;
  timeline: string;
  cost: string;
  assignee: string;
}
```

---

## 6. 콘텐츠 탭 연동 (하이브리드 핵심)

### 블로그 패널 연동
- 전략이 생성된 프로젝트의 블로그 패널 상단에 **추천 키워드 배너** 표시
- 황금 키워드에 🥇 뱃지
- "키워드 적용" 클릭 → 블로그 콘텐츠의 SEO 주요/보조 키워드에 자동 세팅

### 주제 → 콘텐츠 생성
- 콘텐츠·주제 탭의 주제 목록에서 **"콘텐츠 만들기"** 클릭
- → Content 자동 생성 (제목: topic.title, 키워드: topic.keywords)
- → BaseArticle 초안에 주제·각도·키워드 반영
- → 해당 Content 편집 화면으로 자동 이동

---

## 7. API 엔드포인트

| 엔드포인트 | 메서드 | 용도 | 요청 | 응답 |
|-----------|--------|------|------|------|
| `/api/naver/keywords` | POST | 키워드 검색량/경쟁률 (기존) | `{ keywords: string[] }` | `{ keywords: KeywordResult[] }` |
| `/api/naver/keywords/trend` | POST | 12개월 검색 트렌드 | `{ keywords: string[], startDate: string, endDate: string }` | `{ trends: KeywordTrend[] }` |
| `/api/ai/strategy/generate` | POST | 전체 전략 생성 (SSE) | `{ input: StrategyInput, naverData: KeywordItem[], crawlData?: CrawlResult }` | SSE 스트림 |
| `/api/ai/strategy/regenerate` | POST | 탭별 재생성 (SSE) | `{ tab: StrategyTab, instruction: string, context: MarketingStrategy }` | SSE 스트림 |
| `/api/ai/strategy/crawl` | POST | URL 크롤링 | `{ urls: string[] }` | `{ results: CrawlResult[] }` |

### 네이버 DataLab API 참고
- 기존 검색광고 API와 **별도 인증** 필요: Client ID + Client Secret (네이버 개발자센터)
- 엔드포인트: `https://openapi.naver.com/v1/datalab/search`
- 환경변수 추가: `NAVER_DATALAB_CLIENT_ID`, `NAVER_DATALAB_CLIENT_SECRET`

### URL 크롤링 구현
- 서버사이드 `fetch`로 HTML 가져오기 (Puppeteer 불필요 — SPA는 지원 범위 외)
- HTML에서 텍스트 추출: `<title>`, `<meta description>`, `<h1>`~`<h3>`, `<p>` 태그 파싱
- 라이브러리: `cheerio` (경량 HTML 파서, 서버리스 호환)
- 타임아웃: 10초 per URL
- robots.txt 체크하지 않음 (단순 GET 요청, 브라우저 수준)
- 실패 시 빈 결과 반환 + 경고 메시지

```typescript
interface CrawlResult {
  url: string;
  success: boolean;
  title?: string;
  description?: string;
  headings?: string[];
  bodyText?: string;          // 처음 2000자
  error?: string;
}
```

---

## 8. 파일 구조 (신규)

```
src/
├── app/
│   └── dashboard/
│       └── strategy/
│           └── page.tsx              # 전략 페이지
├── components/
│   └── strategy/
│       ├── strategy-input-form.tsx    # 입력 폼
│       ├── strategy-dashboard.tsx     # 5탭 대시보드 래퍼
│       ├── strategy-tabs.tsx          # 탭 네비게이션
│       ├── overview-tab.tsx           # ① 개요·경쟁사
│       ├── keyword-tab.tsx            # ② 키워드 분석
│       ├── keyword-table.tsx          # 키워드 테이블 컴포넌트
│       ├── channel-tab.tsx            # ③ 채널·퍼널
│       ├── content-tab.tsx            # ④ 콘텐츠·주제
│       ├── topic-table.tsx            # 주제 목록 테이블
│       ├── kpi-tab.tsx                # ⑤ KPI·액션플랜
│       └── strategy-hero.tsx          # 히어로 통계
├── app/api/
│   ├── ai/strategy/
│   │   ├── generate/route.ts          # 전체 생성 SSE
│   │   ├── regenerate/route.ts        # 탭별 재생성 SSE
│   │   └── crawl/route.ts             # URL 크롤링 (cheerio)
│   └── naver/
│       └── keywords/
│           └── trend/route.ts         # DataLab 트렌드 API
├── hooks/
│   └── use-strategy-generation.ts     # 전략 생성 SSE 훅
├── lib/
│   └── strategy-prompt-builder.ts     # 전략 생성 프롬프트 빌더
└── types/
    └── strategy.ts                    # 전략 관련 타입 정의
```

**참고:** 연관 키워드 확장은 기존 `/api/naver/keywords` (hintKeywords)를 그대로 사용하므로 별도 엔드포인트 불필요.

---

## 9. 참고

- 샘플 레퍼런스: `sample/통합_마케팅_전략.html` — 12개 섹션의 실제 마케팅 전략 출력 예시
- 기존 네이버 키워드 API: `src/app/api/naver/keywords/route.ts` — HMAC 인증, `/keywordstool` 엔드포인트
- 기존 네이버 키워드 패널: `src/components/content/naver-keyword-panel.tsx` — UI 패턴 참조
- 기존 블로그 SEO: `src/lib/seo-scorer.ts` — SEO 점수 계산 로직 참조
- 채널 패널 패턴: `src/components/content/blog-panel.tsx` — Outer+Inner 패턴 참조
- 기존 AI 생성 훅: `src/hooks/use-ai-generation.ts` — SSE 스트리밍 패턴 참조
