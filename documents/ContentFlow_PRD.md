# ContentFlow — Product Requirements Document (PRD)

**SNS 마케팅 컨텐츠 저작 및 관리 플랫폼**

| 항목 | 내용 |
|------|------|
| 문서 버전 | v2.0 |
| 작성일 | 2026-03-11 |
| 프로젝트명 | ContentFlow |
| 프로젝트 유형 | 웹 서비스 (SaaS) |

---

## 1. 프로젝트 개요

### 1.1 배경 및 목적

SNS 마케팅 담당자는 하나의 주제를 네이버 블로그, 인스타그램, 스레드, 유튜브 등 여러 채널에 맞게 각각 재가공해야 한다. 이 반복 작업은 시간 소모가 크고, 채널별 최적화가 어렵다.

ContentFlow는 하나의 주제에서 멀티 채널 컨텐츠를 AI로 자동 생성하고, 각 플랫폼에 최적화된 형태로 편집·배포·분석할 수 있는 올인원 웹 서비스이다.

### 1.2 핵심 가치

- **원 소스 멀티 유즈**: 하나의 기본 글 → 블로그 + 인스타 카드뉴스 + 스레드 + 유튜브(롱폼/릴스)
- **AI 네이티브**: Gemini API 기반 텍스트 생성, 이미지 생성, TTS 음성 합성
- **플랫폼 연동**: 각 SNS API와 직접 연동하여 자동 업로드
- **데이터 기반**: 네이버 키워드 분석, Perplexity 팩트체크, GA4/Pixel 성과 추적

### 1.3 타겟 사용자

- 1인 마케터 / 소규모 마케팅 팀
- 콘텐츠 크리에이터
- SNS 대행사

---

## 2. 기술 스택

### 2.1 프론트엔드

| 기술 | 용도 |
|------|------|
| **Next.js 14+ (App Router)** | 프레임워크 |
| **TypeScript** | 타입 안전성 |
| **Tailwind CSS** | 스타일링 |
| **shadcn/ui** | UI 컴포넌트 라이브러리 |
| **@dnd-kit/core** | 드래그앤드랍 (카드 순서 이동) |
| **Zustand** | 클라이언트 상태 관리 |
| **TanStack Query** | 서버 상태 관리 및 캐싱 |
| **Tiptap** | 블로그 리치 텍스트 에디터 |
| **React Player** | 미디어 미리보기 |

### 2.2 백엔드 (Next.js API Routes + Server Actions)

| 기술 | 용도 |
|------|------|
| **Next.js API Routes** | REST API 엔드포인트 |
| **Next.js Server Actions** | 서버 사이드 뮤테이션 |
| **Supabase** | PostgreSQL DB + Auth + Storage |
| **Supabase Realtime** | 실시간 업데이트 |
| **Bull MQ + Redis** | 백그라운드 작업 큐 (영상 생성, 업로드 등) |

### 2.3 AI 서비스 (Google Gemini API)

| 모델 | 용도 |
|------|------|
| **Gemini 2.5 Pro** | 고품질 텍스트 생성 (블로그, 대본 등) |
| **Gemini 2.5 Flash** | 빠른 텍스트 생성 (스레드, 짧은 카피) |
| **Gemini 2.5 Flash Image** | AI 이미지 생성 |
| **Gemini 2.5 Flash TTS / Pro TTS** | 텍스트→음성 변환 (카드뉴스 오디오, 유튜브 나레이션) |

> 사용자가 설정에서 모델을 직접 선택 가능. Gemini API에서 지원하는 모든 모델 목록을 동적으로 불러와 표시.

### 2.4 외부 API 연동

| API | 용도 |
|-----|------|
| **Instagram Graph API** | 인스타그램 피드/카루셀/릴스 자동 게시 |
| **Threads API (Meta)** | 스레드 자동 게시 |
| **YouTube Data API v3** | 유튜브 영상 업로드 + 메타데이터 관리 |
| **네이버 검색광고 API** | 키워드 검색량 조회, 연관 키워드 추출 |
| **Perplexity Sonar API** | 팩트체크 — 논문/출처 기반 검증 리포트 생성 |
| **Meta Pixel (Conversions API)** | 광고 성과 추적 |
| **Google Analytics 4 (GA4 Data API)** | 트래픽/전환 분석 |

### 2.5 배포 인프라

| 구성 | 서비스 |
|------|--------|
| **웹 호스팅** | Vercel |
| **데이터베이스** | Supabase (PostgreSQL) |
| **파일 스토리지** | Supabase Storage |
| **작업 큐** | Upstash Redis + BullMQ (Vercel Serverless 호환) |
| **도메인/DNS** | Vercel Domains 또는 외부 DNS |

---

## 3. 핵심 기능 상세

### 3.1 프로젝트(Project) 관리

프로젝트는 ContentFlow의 **최상위 단위**이다. 폴더 개념으로, 하나의 마케팅 캠페인이나 브랜드를 관리하는 컨테이너 역할을 한다. 프로젝트 아래에 여러 컨텐츠(주제)가 생성되며, 각 컨텐츠에서 블로그/인스타/스레드/유튜브 채널별 결과물이 파생된다.

**계층 구조:**

```
프로젝트 (Project)
 └─ 컨텐츠 (Content)
     ├─ 블로그
     ├─ 인스타그램 카드뉴스
     ├─ 스레드
     └─ 유튜브
```

**프로젝트 생성:**

- 프로젝트명, 대표 이미지(선택), 설명 입력
- 프로젝트별 기본 설정(3.2 참조)이 하위 컨텐츠에 상속됨

**프로젝트 목록 (왼쪽 사이드바 상단):**

- 프로젝트를 폴더 형태로 리스트 표시
- 프로젝트 접기/펼치기 토글
- 프로젝트 선택 시 해당 프로젝트의 컨텐츠 목록이 하단에 표시
- 프로젝트 우클릭 / ··· 메뉴: 이름 변경, 설정, 복제, 삭제

**컨텐츠 목록 (선택된 프로젝트 하위):**

- 리스트 형태로 표시
- 생성/삭제 버튼
- 필터링: 카테고리별, 상태별(초안/작성중/게시완료)
- 정렬: 이름순, 날짜순(최신/오래된), 카테고리순
- 검색: 컨텐츠명 텍스트 검색
- 컨텐츠 선택 시 오른쪽 메인 영역에 탭 인터페이스 표시

**컨텐츠 생성:**

- **수동 생성**: 사용자가 직접 컨텐츠명, 카테고리, 태그, 메모를 입력
- **AI 생성**: 키워드 또는 아이디어 입력 → Gemini가 컨텐츠 주제 후보 5~10개 제안 → 사용자 선택/수정
  - 네이버 키워드 검색량 데이터를 참조하여 검색 수요가 높은 주제 추천
  - 프로젝트 설정(마케팅 주체, 마케터 정의)이 AI 추천에 자동 반영

---

### 3.2 프로젝트 설정 (Project Settings)

프로젝트를 선택하고 "설정" 메뉴를 클릭하면 표시되는 프로젝트 레벨의 설정 화면. 이 설정은 해당 프로젝트의 모든 하위 컨텐츠에 공통 적용된다.

**3.2.1 마케팅 주체 정보**

- **브랜드/서비스명**: 마케팅 대상의 이름
- **브랜드 설명**: 브랜드 소개, 미션, 핵심 가치 (자유 텍스트)
- **업종/산업**: 드롭다운 선택 (뷰티, 식품, IT, 교육, 패션, 건강, 금융 등)
- **타겟 고객**: 연령대, 성별, 관심사, 페르소나 설명
- **USP (핵심 차별점)**: 경쟁사 대비 차별화 포인트
- **브랜드 톤앤매너**: 공식적/캐주얼/유머러스/전문적 등 선택 + 커스텀 입력
- **금지 키워드/표현**: AI 생성 시 사용하지 말아야 할 단어 목록
- **브랜드 로고/이미지**: 카드뉴스 워터마크 등에 사용할 이미지 업로드

**3.2.2 마케터 정의 (페르소나)**

- **마케터 이름/별칭**: AI가 콘텐츠 작성 시 활용할 화자 정보
- **전문 분야**: 마케터의 전문성 영역
- **어조 및 스타일**: 구체적 문체 가이드 (예: "전문적이지만 친근한", "데이터 기반 논리적" 등)
- **자주 사용하는 표현**: AI 생성 시 자연스럽게 포함될 표현 목록
- **SNS 운영 목표**: 브랜딩 / 판매 전환 / 커뮤니티 구축 / 정보 제공 등

**3.2.3 채널별 말투 및 그림체 프롬프트**

각 채널에서 AI가 글과 이미지를 생성할 때 적용할 스타일을 프로젝트 단위로 설정한다.

- **블로그 말투 프롬프트**:
  - 블로그 글 작성 시 적용할 문체/톤 지시문 (예: "전문적이되 친근하게, ~입니다 체로 작성")
  - 프리셋 제공: 공식적/캐주얼/교육적/감성적 + 커스텀 입력
- **블로그 그림체 프롬프트**:
  - 블로그 이미지 생성 시 적용할 스타일 지시문 (예: "밝고 깔끔한 플랫 일러스트, 파스텔 톤")
  - 프리셋 제공: 사진풍/일러스트/미니멀/3D 렌더링 + 커스텀 입력

- **인스타그램 말투 프롬프트**:
  - 카드뉴스 텍스트 작성 시 적용할 문체 (예: "짧고 임팩트 있는 캐주얼 톤, 이모지 활용")
- **인스타그램 그림체 프롬프트**:
  - 카드뉴스 이미지/배경 생성 스타일 (예: "트렌디한 그라데이션 배경, 세련된 타이포그래피")

- **스레드 말투 프롬프트**:
  - 스레드 게시물 작성 시 적용할 문체 (예: "대화체, 생각을 공유하는 느낌")

- **유튜브 말투 프롬프트**:
  - 유튜브 대본 작성 시 적용할 나레이션 스타일 (예: "에너지 넘치는 진행자 톤, 시청자에게 말 걸듯이")
- **유튜브 그림체 프롬프트**:
  - 유튜브 썸네일/영상 내 이미지 생성 스타일

각 프롬프트는 텍스트 에어리어로 자유 입력 가능하며, 프리셋 선택 후 커스텀 수정도 가능하다.

**3.2.4 글쓰기 가이드 업로드**

- **전체 글쓰기 가이드**: 모든 채널에 공통 적용되는 문서 업로드 (PDF, DOCX, MD, TXT)
  - AI가 컨텐츠 생성 시 이 가이드를 참조하여 톤앤매너, 문체, 구조 등을 반영
- **채널별 글쓰기 가이드**: 블로그/인스타/스레드/유튜브 각각의 가이드 개별 업로드
  - 해당 채널 컨텐츠 생성 시에만 적용

**3.2.5 API 키 관리**

| API | 필요한 키/인증 |
|-----|---------------|
| Google Gemini | API Key |
| Instagram / Threads | Meta App ID + Access Token (OAuth 2.0) |
| YouTube | Google OAuth 2.0 + API Key |
| 네이버 검색광고 | API License Key + Secret Key + Customer ID |
| Perplexity | API Key |
| Meta Pixel | Pixel ID + Access Token |
| Google Analytics 4 | Property ID + Service Account JSON |

- 각 API 키 입력 필드 + 연결 테스트 버튼
- 연결 상태 표시 (연결됨 / 미연결 / 오류)
- 키는 Supabase Vault로 암호화 저장

**3.2.6 AI 모델 설정**

- Gemini 모델 선택 (텍스트 생성용, 이미지 생성용, TTS용 각각)
- 온도(Temperature), 최대 토큰 수 등 생성 파라미터 조절
- 기본 프롬프트 템플릿 설정 (고급)

---

### 3.3 컨텐츠 설정 탭

컨텐츠를 선택했을 때 첫 번째 탭. 해당 컨텐츠(주제) 고유의 설정을 관리한다. 프로젝트 설정을 상속받되, 컨텐츠 단위로 오버라이드 가능.

**3.3.1 컨텐츠 정보**

- 컨텐츠명 (수정 가능)
- 카테고리 (드롭다운 선택)
- 태그 (복수 입력)
- 메모 (자유 텍스트)
- 생성일 / 최종 수정일 (자동)
- 소속 프로젝트 (변경 가능 — 다른 프로젝트로 이동)

**3.3.2 참고 자료 (Reference Materials)**

주제 기획 및 기본 글 작성 시 AI가 참조할 외부 자료를 등록한다.

- **문서 업로드**: PDF, DOCX, MD, TXT, HWP 파일 업로드
  - 업로드된 문서는 자동 파싱하여 텍스트를 추출, AI 프롬프트 컨텍스트에 포함
  - 복수 파일 업로드 가능
- **유튜브 링크 등록**: YouTube URL 입력
  - YouTube Data API로 자막(transcript)을 자동 추출하여 텍스트화
  - 자막이 없는 경우 영상 설명(description)을 참조
  - 복수 링크 등록 가능
- **웹 URL 등록**: 참고할 웹 페이지 URL 입력
  - 해당 페이지 본문 텍스트를 크롤링하여 참조 자료로 활용
- 각 자료별 요약 미리보기 + 삭제 기능
- AI 생성 시 "참고 자료 포함/제외" 토글

**3.3.3 컨텐츠별 설정 오버라이드**

- AI 모델 설정 (프로젝트 기본값에서 변경 시)
- 채널별 글쓰기 가이드 추가/교체 (프로젝트 가이드와 별도)
- 타겟 고객 세분화 (프로젝트 기본값 상속 후 추가 조건)

---

### 3.4 기본 글 탭 (Base Article)

모든 채널별 컨텐츠의 **원본(Source)**이 되는 기본 글을 작성하는 탭. 채널별 글(블로그, 카드뉴스, 유튜브 등)은 이 기본 글을 기반으로 각 채널에 맞게 변환·생성된다.

> **컨텐츠 작성 워크플로우:**
> 설정(주제/참고자료) → **기본 글 작성** → 블로그 변환 → 카드뉴스 변환 → 유튜브 변환

**3.4.1 기본 글 에디터**

- 리치 텍스트 에디터 (Tiptap) 기반 장문 작성
- 카드(블록) 기반이 아닌 **일반 문서 편집** 방식 (제목, 소제목, 본문, 이미지 삽입)
- 글자수 카운터 실시간 표시
- 기본 글 구조:
  - 제목 (H1)
  - 서론 / 본론 / 결론 섹션 (자유 구성)
  - 핵심 메시지 / 키 포인트 하이라이트
  - 이미지 삽입 위치 표시

**3.4.2 AI 기본 글 생성**

- "AI 글 생성" 버튼 클릭 시:
  1. 컨텐츠 설정(주제 정보) + 참고 자료(PDF, 유튜브 자막 등) + 프로젝트 설정(브랜드, 마케터 페르소나) + 글쓰기 가이드를 프롬프트에 포함
  2. Gemini API 호출
  3. 결과를 에디터에 스트리밍 삽입
- **기본 프롬프트 시스템**: 프로젝트 설정의 브랜드 톤, 마케터 스타일이 자동 적용
- 사용자가 기본 프롬프트 내용을 확인/수정할 수 있는 "프롬프트 편집" 모달
- 부분 재생성: 특정 구간을 드래그 선택 → "이 부분 재생성" 가능

**3.4.3 Perplexity 첨삭 기능**

기본 글의 내용을 Perplexity API로 검증하고 첨삭하는 기능.

- **"Perplexity 첨삭" 버튼** 클릭 시:
  1. 기본 글에서 핵심 주장(claim)을 AI가 자동 추출
  2. 각 주장에 대해 Perplexity Sonar API로 검증 쿼리 실행
  3. 논문, 공신력 있는 출처를 기반으로 검증 + 첨삭 결과 생성

- **첨삭 결과 패널 (우측 슬라이드):**

| 구성 요소 | 설명 |
|----------|------|
| 주장 목록 | 기본 글에서 추출된 핵심 주장들 |
| 검증 상태 | 확인됨(녹색) / 부분 확인(노란색) / 반박됨(빨간색) / 확인 불가(회색) |
| 출처 | 각 검증 결과의 근거 논문/기사 링크 |
| 첨삭 제안 | 사실 오류 수정, 표현 개선, 근거 보강 제안 |
| 보강 자료 | Perplexity가 찾은 관련 통계, 인용구 제안 |
| 신뢰도 점수 | 전체 글의 사실 신뢰도 (0~100) |

- **인라인 첨삭**: 에디터 본문에서 검증된 부분을 하이라이트 표시
  - 녹색 밑줄: 확인된 사실
  - 노란색 밑줄: 부분 확인 (보강 필요)
  - 빨간색 밑줄: 반박된 주장 (수정 필요)
- **"AI 자동 수정" 버튼**: 반박된 부분 + 표현 개선 사항을 일괄 적용 (변경 전/후 diff 표시)
- 첨삭 리포트 PDF 다운로드 가능

**3.4.4 기본 글에서 채널별 변환**

- 기본 글 작성 완료 후, 각 채널 탭에서 "기본 글 기반 생성" 버튼으로 채널 맞춤 컨텐츠 자동 생성
- 변환 시 프로젝트 설정의 **채널별 말투/그림체 프롬프트**가 자동 적용
- 기본 글이 수정되면 "채널 동기화" 알림 → 선택적 재생성

---

### 3.5 블로그 탭 (네이버 블로그)

네이버 블로그에 최적화된 컨텐츠를 작성·편집·분석하는 탭.

**3.5.1 컨텐츠 에디터 — 카드 기반 편집**

- 기본 글을 기반으로 블로그에 최적화된 형태로 변환, 또는 직접 작성
- 블로그 글을 **카드(블록) 단위**로 구성
- 카드 유형: 텍스트 블록, 이미지 블록, 구분선, 인용문, 리스트
- 각 카드:
  - **추가**: + 버튼으로 신규 카드 삽입
  - **삭제**: 카드별 삭제 버튼
  - **순서 이동**: 드래그앤드랍 (@dnd-kit)
  - **편집**: 인라인 리치 텍스트 에디터 (Tiptap)

**3.5.2 AI 컨텐츠 생성**

- **"기본 글 기반 생성" 버튼**: 기본 글 탭의 원본 글을 네이버 블로그에 최적화된 형태로 자동 변환
  - 프로젝트 설정의 **블로그 말투 프롬프트** + 블로그 글쓰기 가이드 자동 적용
- **"AI 글 생성" 버튼**: 기본 글 없이 직접 생성
  1. 주제 정보 + 전체 글쓰기 가이드 + 블로그 가이드를 프롬프트에 포함
  2. Gemini API 호출
  3. 결과를 카드 블록으로 자동 분할하여 에디터에 삽입
- 개별 카드 단위 AI 재생성도 가능

**3.5.3 이미지 생성 및 관리**

- 이미지 블록에서 "AI 이미지 생성" 클릭
- 프롬프트 입력 또는 해당 텍스트 블록 기반 자동 프롬프트 생성
- Gemini Image API로 이미지 생성
- **이미지 히스토리**: 해당 블록에서 생성된 모든 이미지 버전 목록 표시
  - 이전 버전 복원 가능
  - 개별 삭제 가능
- **재생성**: 같은 프롬프트 또는 수정된 프롬프트로 새 이미지 생성
- 직접 업로드도 지원

**3.5.4 네이버 블로그 SEO 최적화**

네이버의 C-Rank 및 D.I.A.+ 알고리즘 기준에 맞춰 최적화 점수를 산출한다.

**SEO 점수 항목 (100점 만점):**

| 항목 | 배점 | 측정 기준 |
|------|------|----------|
| 제목 최적화 | 15점 | 핵심 키워드 포함 여부, 길이(25~35자), 검색 의도 일치 |
| 본문 키워드 밀도 | 15점 | 핵심 키워드 자연 분포 (2~3%), 동의어/연관어 포함 |
| 콘텐츠 길이 | 10점 | 최소 1,500자 이상, 적정 2,000~3,000자 |
| 구조화 | 15점 | 소제목(H2/H3) 사용, 리스트, 이미지 배치 |
| 이미지 최적화 | 10점 | ALT 텍스트, 이미지 수(3장 이상), 적정 크기 |
| 내부/외부 링크 | 10점 | 관련 포스트 링크, 출처 링크 포함 |
| 모바일 가독성 | 10점 | 단락 길이, 문장 길이, 여백 |
| 메타 정보 | 15점 | 태그 설정, 카테고리 일치, 대표 이미지 |

- 실시간 점수 표시 (에디터 우측 사이드 패널)
- 항목별 개선 제안 메시지 표시
- "AI 최적화" 버튼으로 자동 개선 적용

**3.5.5 네이버 키워드 분석**

네이버 검색광고 API 연동으로 키워드 데이터를 제공한다.

- **키워드 검색량**: 월간 PC/모바일 검색량
- **연관 키워드**: 입력 키워드 기반 연관 키워드 목록 + 각각의 검색량
- **경쟁 강도**: 키워드별 경쟁 수준 표시
- **키워드 추천**: 주제와 관련된 롱테일 키워드 추천
- 조회 결과 테이블 형태로 표시, CSV 다운로드 가능

---

### 3.6 인스타그램 카드뉴스 탭

인스타그램 피드용 카드뉴스(카루셀)를 제작하는 탭. 기본 글을 기반으로 인스타그램에 최적화된 비주얼 컨텐츠를 자동 생성한다.

**3.6.1 카드뉴스 에디터**

- 슬라이드(카드) 단위 편집기
- 카드 추가/삭제/순서 이동(드래그앤드랍)
- 각 카드 구성 요소:
  - 배경 색상 / 배경 이미지
  - 텍스트 레이어 (위치, 크기, 색상, 폰트 조절)
  - 이미지 레이어
  - 로고/워터마크
- 인스타그램 피드 비율 프리셋: 1:1 (1080×1080), 4:5 (1080×1350)
- 미리보기 (인스타그램 피드 시뮬레이션)

**3.6.2 AI 카드뉴스 생성**

- **"기본 글 기반 생성"**: 기본 글의 핵심 포인트를 추출하여 카드뉴스 구조 자동 생성
  - 프로젝트 설정의 **인스타 말투/그림체 프롬프트** 자동 적용
- **직접 생성**: 주제 기반으로 AI가 카드뉴스 구조(카드 수, 각 카드 텍스트, 이미지 프롬프트) 자동 생성
- 사용자 수정 후 확정

**3.6.3 이미지 생성**

- 블로그와 동일한 이미지 생성/히스토리/재생성/삭제 기능
- 카드뉴스 전용 이미지 스타일 프리셋 제공

**3.6.4 동영상 카드뉴스 (오디오북 모드)**

카드뉴스를 동영상으로 변환하여 릴스/피드 영상으로도 활용할 수 있는 기능.

- **TTS 음성 생성**:
  - 각 카드의 텍스트를 Gemini TTS API로 음성 변환
  - **성우 목소리 선택**: Gemini TTS가 지원하는 음성 목록에서 선택
  - **재생성**: 다른 음성으로 재생성 가능
  - **히스토리**: 생성된 모든 음성 버전 관리 (복원/삭제)
- **영상 합성**:
  - 카드 이미지 + TTS 오디오 → 슬라이드쇼 형태 MP4 생성
  - 각 카드별 표시 시간 = 해당 카드 TTS 오디오 길이 + 여유 시간
  - 전환 효과 선택 (페이드, 슬라이드 등)
  - BGM 추가 옵션
- **미리보기**: 생성된 영상 즉시 재생

**3.6.5 인스타그램 자동 업로드**

- Instagram Graph API 연동
- 업로드 유형: 이미지 카루셀 / 단일 이미지 / 릴스(동영상)
- 캡션 편집기 (해시태그 추천 포함)
- 즉시 게시 / 예약 게시
- 게시 상태 추적

---

### 3.7 스레드 탭

Meta Threads 플랫폼용 컨텐츠를 작성하는 탭. 기본 글을 기반으로 스레드에 맞는 짧은 형태로 변환한다.

**3.7.1 스레드 에디터**

- 스레드 특성: 최대 500자 텍스트 + 이미지/동영상/링크
- 단일 포스트 또는 멀티 스레드(연속 포스트) 작성 가능
- 멀티 스레드 시 카드 기반 편집 (추가/삭제/순서 이동)

**3.7.2 AI 컨텐츠 생성**

- **"기본 글 기반 생성"**: 기본 글에서 핵심 메시지를 추출하여 스레드 형식으로 변환
  - 프로젝트 설정의 **스레드 말투 프롬프트** 자동 적용
- **직접 생성**: 주제 기반으로 스레드 형식에 맞는 짧고 임팩트 있는 글 자동 생성
- 채널별 가이드 반영
- 단일 포스트 / 시리즈 스레드 선택

**3.7.3 스레드 자동 업로드**

- Threads API 연동
- 텍스트 + 이미지/동영상 게시
- 즉시 게시 / 예약 게시
- 게시 상태 추적

---

### 3.8 유튜브 탭 (롱폼 + 릴스)

유튜브 영상 대본 작성 및 영상 제작·업로드를 관리하는 탭. 기본 글을 기반으로 롱폼 영상과 릴스(숏폼) 두 가지 형태의 영상 컨텐츠를 제작한다.

**3.8.1 영상 유형 선택**

- 탭 진입 시 **롱폼** / **릴스(숏폼)** 서브탭으로 분리
- 롱폼: 3분~30분 이상의 본격 유튜브 영상
- 릴스: 15초~90초의 YouTube Shorts / Instagram Reels 겸용 숏폼

**3.8.2 대본 에디터 (롱폼)**

- 섹션(인트로/본론/아웃트로) 기반 카드 편집
- 각 섹션별:
  - 나레이션 텍스트
  - 화면 지시 (어떤 이미지/영상을 보여줄지)
  - 자막 텍스트
- 카드 추가/삭제/순서 이동

**3.8.3 대본 에디터 (릴스/숏폼)**

- 숏폼 전용 편집기: 단일 섹션 또는 2~3 섹션으로 간결하게 구성
- 세로 비율(9:16) 전용 레이아웃
- 초 단위 타임라인 표시 (15초/30초/60초/90초 가이드)
- 후킹 문구 강조 영역 (첫 3초)

**3.8.4 AI 대본 생성**

- **"기본 글 기반 생성"**: 기본 글을 유튜브 대본 형식으로 자동 변환
  - 롱폼: 기본 글 전체를 영상 대본 구조(인트로/본론/아웃트로)로 재구성
  - 릴스: 기본 글에서 가장 임팩트 있는 핵심 포인트 1~2개를 추출하여 숏폼 대본 생성
- **직접 생성**: 주제 기반으로 유튜브 영상 대본 자동 생성
- 예상 영상 길이 설정 (숏폼: 15~90초 / 미드폼: 3~10분 / 롱폼: 10분 이상)
- SEO 최적화된 제목, 설명, 태그 자동 생성

**3.8.5 TTS 나레이션 생성**

- 대본 텍스트 → Gemini TTS API로 나레이션 음성 생성
- 성우 목소리 선택 / 변경 / 재생성
- 히스토리 관리 (버전별 복원/삭제)

**3.8.6 영상 자동 생성**

- **롱폼**: 대본 섹션별 이미지 + TTS 나레이션 → 가로(16:9) MP4 합성
- **릴스**: 대본 + 이미지 + TTS → 세로(9:16) MP4 합성
- 자막 자동 오버레이 (릴스는 대형 자막 스타일)
- BGM 선택 및 볼륨 조절
- 인트로/아웃트로 템플릿

**3.8.7 유튜브 자동 업로드**

- YouTube Data API v3 연동
- **롱폼 업로드**: 메타데이터(제목, 설명, 태그, 카테고리, 썸네일), 공개 설정
- **릴스(Shorts) 업로드**: #Shorts 태그 자동 포함, 세로 영상 업로드
- 예약 게시
- 업로드 진행률 표시
- 게시 후 영상 링크 및 상태 표시

---

### 3.9 Perplexity 팩트체크 기능 (채널별)

작성된 컨텐츠의 과학적·사실적 타당성을 검증하는 기능. 모든 채널 탭에서 접근 가능.

**동작 방식:**

1. 사용자가 "팩트체크" 버튼 클릭
2. 작성된 컨텐츠에서 핵심 주장(claim)을 AI가 자동 추출
3. 각 주장에 대해 Perplexity Sonar API로 검증 쿼리 실행
4. 논문, 공신력 있는 출처를 기반으로 검증 결과 수집

**리포트 출력:**

| 구성 요소 | 설명 |
|----------|------|
| 주장 목록 | 컨텐츠에서 추출된 핵심 주장들 |
| 검증 상태 | 각 주장별 — 확인됨(녹색) / 부분 확인(노란색) / 반박됨(빨간색) / 확인 불가(회색) |
| 출처 | 각 검증 결과의 근거 논문/기사 링크 |
| 수정 제안 | 반박된 주장에 대한 수정 문구 제안 |
| 신뢰도 점수 | 전체 컨텐츠의 사실 신뢰도 (0~100) |

- 리포트는 패널 형태로 표시
- PDF 다운로드 가능
- "AI 자동 수정" 버튼으로 반박된 부분 자동 교정 가능

---

### 3.10 애널리틱스 기능

Meta Pixel과 GA4를 연동하여 게시된 컨텐츠의 성과를 추적한다.

**3.10.1 Meta Pixel 연동**

- Conversions API를 통한 서버 사이드 이벤트 전송
- 추적 이벤트: 페이지뷰, 컨텐츠 조회, 링크 클릭, 전환
- 인스타그램/스레드 게시물별 성과 연동

**3.10.2 GA4 연동**

- GA4 Data API를 통한 데이터 조회
- 대시보드 표시 항목:
  - 페이지뷰 / 사용자 수 / 평균 체류시간
  - 유입 채널별 트래픽
  - 전환율
  - 인기 컨텐츠 순위
- 기간별 필터 (7일 / 30일 / 90일 / 커스텀)

**3.10.3 통합 대시보드**

- 주제별 / 채널별 성과 비교
- 게시 일정 캘린더 뷰
- 주간/월간 리포트 자동 생성

---

## 4. UI/UX 설계

### 4.1 전체 레이아웃

```
┌──────────────────────────────────────────────────────────────┐
│  헤더: 로고  |  전역 검색  |  알림  |  🌙/☀️ 테마  |  프로필  │
├───────────┬──────────────────────────────────────────────────┤
│           │                                                  │
│  사이드바   │           메인 컨텐츠 영역                       │
│           │                                                  │
│ ┌───────┐ │  ┌────────────────────────────────────────────┐  │
│ │+ 프로젝│ │  │ 설정 | 기본글 | 블로그 | 카드뉴스 | 유튜브 │  │
│ │  트 생성│ │  ├────────────────────────────────────────────┤  │
│ ├───────┤ │  │                                            │  │
│ │📁 프로 │ │  │      선택된 탭의 컨텐츠 편집 영역           │  │
│ │  젝트 A│ │  │                                            │  │
│ │ ├─ 📄 │ │  │                                            │  │
│ │ ├─ 📄 │ │  │                                            │  │
│ │ └─ 📄 │ │  │                                            │  │
│ │📁 프로 │ │  │                                            │  │
│ │  젝트 B│ │  │                                            │  │
│ │ (접힘) │ │  └────────────────────────────────────────────┘  │
│ ├───────┤ │                                                  │
│ │ 필터   │ │                                                  │
│ │ 정렬   │ │                                                  │
│ │ 검색   │ │                                                  │
│ └───────┘ │                                                  │
└───────────┴──────────────────────────────────────────────────┘
```

### 4.2 사이드바 상세 — 프로젝트/컨텐츠 트리

**프로젝트 영역 (상단):**

- "+ 새 프로젝트" 버튼
- 프로젝트를 폴더 아이콘(📁)과 함께 리스트 표시
- 각 프로젝트 항목: 프로젝트명, 컨텐츠 수 뱃지, ··· 메뉴(설정/이름변경/복제/삭제)
- 프로젝트 클릭 시 접기/펼치기 토글 → 하위 컨텐츠 목록 표시

**컨텐츠 영역 (프로젝트 하위):**

- 프로젝트가 펼쳐지면 트리 형태로 컨텐츠(📄) 나열
- 각 컨텐츠 항목: 컨텐츠명, 상태 뱃지(초안/작성중/게시완료), 채널별 완료 아이콘
- 컨텐츠 선택 시 오른쪽 메인 영역에 탭 인터페이스 표시
- "+ 새 컨텐츠" 버튼 (프로젝트 하위에 표시)
- 컨텐츠 우클릭 / ··· 메뉴: 이름 변경, 복제, 다른 프로젝트로 이동, 삭제

**필터/정렬/검색 영역 (하단):**

- 필터: 카테고리별, 상태별(초안/작성중/게시완료)
- 정렬: 이름순, 날짜순(최신/오래된), 카테고리순
- 검색: 프로젝트명 + 컨텐츠명 통합 텍스트 검색

**프로젝트 설정 진입:**

- 프로젝트의 ··· 메뉴 → "설정" 클릭 시 메인 영역에 프로젝트 설정 화면(3.2) 표시
- 또는 프로젝트 더블클릭으로도 설정 화면 진입 가능

### 4.3 카드 에디터 공통 UI 패턴

블로그, 인스타 카드뉴스, 스레드, 유튜브 대본 모두 "카드 기반 편집"을 사용한다.

```
┌─────────────────────────────┐
│ ⠿ 드래그 핸들  |  카드 #1  |  ✕ 삭제  │
├─────────────────────────────┤
│                             │
│    카드 컨텐츠 영역          │
│    (텍스트/이미지/오디오)     │
│                             │
├─────────────────────────────┤
│ 🔄 AI 재생성 | 🖼️ 이미지 | 🔊 TTS │
└─────────────────────────────┘
        ┌───────┐
        │ + 추가 │
        └───────┘
┌─────────────────────────────┐
│ ⠿ 드래그 핸들  |  카드 #2  |  ✕ 삭제  │
├─────────────────────────────┤
│    ...                      │
└─────────────────────────────┘
```

### 4.4 이미지 히스토리 패널

이미지 블록 클릭 시 우측에 히스토리 패널이 슬라이드 인.

```
┌─────────────────┐
│ 이미지 히스토리   │
├─────────────────┤
│ v3 (현재) 03/11  │  ← 현재 사용 중
│ [썸네일] [삭제]  │
├─────────────────┤
│ v2       03/10  │
│ [썸네일] [복원] [삭제] │
├─────────────────┤
│ v1       03/09  │
│ [썸네일] [복원] [삭제] │
├─────────────────┤
│ [+ 새로 생성]    │
│ [프롬프트 수정]   │
└─────────────────┘
```

### 4.5 TTS 패널

```
┌─────────────────────┐
│ TTS 음성 설정        │
├─────────────────────┤
│ 성우: [드롭다운 ▼]   │
│ 속도: [──●──────]    │
│ 피치: [──────●──]    │
├─────────────────────┤
│ ▶️ 미리듣기          │
│ 🔄 재생성            │
├─────────────────────┤
│ 음성 히스토리         │
│ v2 (현재) 여성A 03/11│
│ v1       남성B 03/10 │
└─────────────────────┘
```

### 4.6 채널별 컨텐츠 미리보기

각 채널 탭 내부에 "미리보기" 버튼/토글을 배치하여, 편집 화면에서 바로 실제 플랫폼 게시 모습을 시뮬레이션할 수 있다. 별도의 미리보기 탭 없이 각 탭에서 에디터 ↔ 미리보기를 전환한다.

**4.6.1 블로그 미리보기**

```
┌─────────────────────────────────┐
│  📱 모바일  |  💻 PC  |  전체화면  │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │   네이버 블로그 시뮬레이션    │ │
│ │                             │ │
│ │  [블로그 제목]               │ │
│ │  프로필 │ 날짜 │ 카테고리     │ │
│ │  ─────────────────          │ │
│ │  본문 내용 (카드 순서대로)    │ │
│ │  이미지, 텍스트, 구분선 등    │ │
│ │                             │ │
│ │  태그: #키워드1 #키워드2      │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│  SEO 점수: 85/100  |  글자수: 2,450 │
└─────────────────────────────────┘
```

- 모바일/PC 뷰포트 전환
- 네이버 블로그 레이아웃 시뮬레이션 (상단바, 프로필 영역, 본문 스타일)
- 실시간 SEO 점수 + 글자수 오버레이
- 전체화면 모드 지원

**4.6.2 인스타그램 미리보기**

```
┌──────────────────────┐
│  Instagram Feed 미리보기 │
├──────────────────────┤
│ ┌──────────────────┐ │
│ │ 🔵 username      │ │
│ │ ┌──────────────┐ │ │
│ │ │              │ │ │
│ │ │  카드뉴스     │ │ │
│ │ │  슬라이드     │ │ │
│ │ │  (1:1 비율)   │ │ │
│ │ │              │ │ │
│ │ │  ◀ ● ○ ○ ▶  │ │ │
│ │ └──────────────┘ │ │
│ │ ♡ 💬 ✈️  🔖     │ │
│ │                  │ │
│ │ 캡션 텍스트...    │ │
│ │ #해시태그들       │ │
│ └──────────────────┘ │
└──────────────────────┘
```

- 인스타그램 피드 UI 시뮬레이션 (프로필, 좋아요/댓글 아이콘, 캡션)
- 카루셀 슬라이드 좌우 넘김 지원
- 1:1 / 4:5 비율 전환
- 동영상 카드뉴스일 경우 영상 재생 미리보기

**4.6.3 스레드 미리보기**

```
┌──────────────────────┐
│  Threads 미리보기      │
├──────────────────────┤
│ ┌──────────────────┐ │
│ │ 🔵 username      │ │
│ │                  │ │
│ │ 스레드 본문 텍스트 │ │
│ │ (500자 이내)      │ │
│ │                  │ │
│ │ [이미지/미디어]    │ │
│ │                  │ │
│ │ ♡ 💬 🔁 ✈️      │ │
│ ├──────────────────┤ │
│ │ │ (연결선)        │ │
│ ├──────────────────┤ │
│ │ 🔵 username      │ │
│ │ 이어지는 스레드... │ │
│ └──────────────────┘ │
└──────────────────────┘
```

- 스레드 UI 시뮬레이션 (프로필, 반응 아이콘, 연결선)
- 멀티 스레드일 경우 연속된 포스트 체인 표시
- 글자수 카운터 (500자 제한 표시)

**4.6.4 유튜브 미리보기**

```
┌──────────────────────────────┐
│  YouTube 미리보기              │
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │                          │ │
│ │    영상 플레이어           │ │
│ │    (생성된 영상 재생)      │ │
│ │                          │ │
│ │  ▶ ──●───────── 3:24     │ │
│ └──────────────────────────┘ │
│                              │
│ 영상 제목                     │
│ 조회수 · 날짜                  │
│ ────────────────────────     │
│ 채널명 │ 구독                  │
│ ────────────────────────     │
│ 설명:                         │
│ [AI 생성된 설명 텍스트]         │
│ 태그: #태그1 #태그2            │
└──────────────────────────────┘
```

- 유튜브 영상 페이지 레이아웃 시뮬레이션
- 생성된 MP4 영상 인라인 재생
- 썸네일 미리보기
- 제목/설명/태그 표시
- 영상 미생성 시 대본 기반 스토리보드 뷰로 대체

### 4.7 다크모드 (테마 시스템)

ContentFlow는 라이트모드와 다크모드를 모두 지원한다.

**테마 전환:**

- 헤더 우측에 🌙/☀️ 테마 토글 버튼
- 시스템 설정 자동 감지 (prefers-color-scheme) 옵션
- 3가지 모드: 라이트 / 다크 / 시스템 자동

**다크모드 디자인 원칙:**

- **배경**: 순수 검정(#000) 대신 다크 그레이(#1a1a2e, #16213e) 사용으로 눈의 피로 감소
- **텍스트**: 순수 흰색(#fff) 대신 약간 따뜻한 흰색(#e8e8e8, #f0f0f0) 사용
- **액센트 색상**: 라이트모드와 동일한 브랜드 컬러 유지, 밝기만 조정
- **그림자/보더**: 다크모드에서는 보더를 미세한 밝은 선(#2a2a3e)으로, 그림자 대신 보더 강조
- **카드/패널**: 배경보다 약간 밝은 표면색 사용 (#1e1e32)

**구현 방식:**

- Tailwind CSS `dark:` 변형 클래스 사용
- CSS 변수 기반 테마 토큰 시스템 (colors, spacing, shadows)
- `next-themes` 라이브러리 활용하여 SSR 호환 테마 전환
- 사용자 테마 선호 설정은 localStorage + Supabase user profile에 저장

**다크모드 적용 범위:**

- 전체 레이아웃 (헤더, 사이드바, 메인 영역)
- 카드 에디터, 리치 텍스트 에디터
- 모달, 드롭다운, 토스트 알림
- 차트/그래프 (애널리틱스 대시보드)
- 미리보기 영역은 실제 플랫폼 색상을 유지하되, 외부 프레임만 테마 적용

---

## 5. 데이터 모델 (Supabase PostgreSQL)

### 5.1 주요 테이블

```sql
-- 사용자
users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  theme_preference TEXT DEFAULT 'system',  -- 'light', 'dark', 'system'
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- 프로젝트 (Project) — 최상위 폴더 단위
projects (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,              -- 대표 이미지
  industry TEXT,                     -- 업종/산업
  brand_name TEXT,                   -- 마케팅 주체 브랜드명
  brand_description TEXT,            -- 브랜드 설명
  target_audience JSONB,             -- 타겟 고객 정보 (연령대, 성별, 관심사 등)
  usp TEXT,                          -- 핵심 차별점
  brand_tone TEXT,                   -- 브랜드 톤앤매너
  banned_keywords TEXT[],            -- 금지 키워드/표현
  brand_logo_url TEXT,               -- 브랜드 로고
  marketer_name TEXT,                -- 마케터 이름/별칭
  marketer_expertise TEXT,           -- 마케터 전문 분야
  marketer_style TEXT,               -- 마케터 어조 및 스타일
  marketer_phrases TEXT[],           -- 자주 사용하는 표현
  sns_goal TEXT,                     -- SNS 운영 목표
  -- 채널별 말투/그림체 프롬프트
  blog_tone_prompt TEXT,             -- 블로그 말투 프롬프트
  blog_image_style_prompt TEXT,      -- 블로그 그림체 프롬프트
  instagram_tone_prompt TEXT,        -- 인스타그램 말투 프롬프트
  instagram_image_style_prompt TEXT, -- 인스타그램 그림체 프롬프트
  threads_tone_prompt TEXT,          -- 스레드 말투 프롬프트
  youtube_tone_prompt TEXT,          -- 유튜브 말투 프롬프트
  youtube_image_style_prompt TEXT,   -- 유튜브 그림체 프롬프트
  ai_model_settings JSONB,          -- 프로젝트 기본 AI 모델 설정
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- API 키 (암호화 저장) — 프로젝트 단위로 관리
api_keys (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,  -- 'gemini', 'instagram', 'threads', 'youtube', 'naver', 'perplexity', 'meta_pixel', 'ga4'
  encrypted_key TEXT NOT NULL,
  metadata JSONB,  -- 추가 설정 (customer_id 등)
  is_connected BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- 글쓰기 가이드 — 프로젝트 단위로 관리
writing_guides (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,  -- 'global', 'blog', 'instagram', 'threads', 'youtube'
  file_url TEXT NOT NULL,
  file_name TEXT,
  extracted_text TEXT,  -- 파싱된 텍스트 (AI 프롬프트용)
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
)

-- 컨텐츠 (Content) — 프로젝트 하위의 주제/컨텐츠 단위
contents (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  category TEXT,
  tags TEXT[],
  memo TEXT,
  status TEXT DEFAULT 'draft',  -- 'draft', 'in_progress', 'published'
  ai_model_settings JSONB,  -- 컨텐츠별 모델 설정 오버라이드 (프로젝트 설정 상속)
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- 참고 자료 (Reference Materials)
reference_materials (
  id UUID PRIMARY KEY,
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  type TEXT NOT NULL,             -- 'pdf', 'docx', 'md', 'txt', 'hwp', 'youtube', 'url'
  source_url TEXT,                -- YouTube/웹 URL (문서의 경우 Storage URL)
  file_url TEXT,                  -- 업로드된 파일의 Storage URL
  file_name TEXT,
  extracted_text TEXT,            -- 파싱/추출된 텍스트
  summary TEXT,                   -- AI 요약
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- 기본 글 (Base Article)
base_articles (
  id UUID PRIMARY KEY,
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  title TEXT,
  body TEXT NOT NULL,              -- 기본 글 본문 (Tiptap JSON 또는 HTML)
  body_plain_text TEXT,            -- 검색/AI 프롬프트용 플레인 텍스트
  word_count INTEGER DEFAULT 0,
  factcheck_status TEXT,           -- 'unchecked', 'checking', 'checked'
  factcheck_score INTEGER,         -- Perplexity 신뢰도 점수 (0~100)
  factcheck_report JSONB,          -- 첨삭 결과 상세
  prompt_used TEXT,                -- 생성 시 사용된 프롬프트
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- 블로그 컨텐츠
blog_contents (
  id UUID PRIMARY KEY,
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  seo_title TEXT,
  seo_score INTEGER,
  seo_details JSONB,
  naver_keywords JSONB,  -- 키워드 분석 결과 캐시
  status TEXT DEFAULT 'draft',
  published_url TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- 블로그 카드 (블록)
blog_cards (
  id UUID PRIMARY KEY,
  blog_content_id UUID REFERENCES blog_contents(id) ON DELETE CASCADE,
  card_type TEXT NOT NULL,  -- 'text', 'image', 'divider', 'quote', 'list'
  content JSONB NOT NULL,   -- 카드 타입별 데이터
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- 인스타그램 카드뉴스
instagram_contents (
  id UUID PRIMARY KEY,
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  caption TEXT,
  hashtags TEXT[],
  content_type TEXT DEFAULT 'carousel',  -- 'carousel', 'video', 'single'
  video_settings JSONB,  -- BGM, 전환효과 등
  status TEXT DEFAULT 'draft',
  published_url TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- 인스타그램 카드 (슬라이드)
instagram_cards (
  id UUID PRIMARY KEY,
  instagram_content_id UUID REFERENCES instagram_contents(id) ON DELETE CASCADE,
  text_content TEXT,
  background_color TEXT,
  background_image_url TEXT,
  text_style JSONB,  -- 위치, 크기, 색상, 폰트
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- 스레드 컨텐츠
threads_contents (
  id UUID PRIMARY KEY,
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  thread_type TEXT DEFAULT 'single',  -- 'single', 'multi'
  status TEXT DEFAULT 'draft',
  published_url TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- 스레드 카드 (개별 포스트)
threads_cards (
  id UUID PRIMARY KEY,
  threads_content_id UUID REFERENCES threads_contents(id) ON DELETE CASCADE,
  text_content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,  -- 'image', 'video', null
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- 유튜브 컨텐츠
youtube_contents (
  id UUID PRIMARY KEY,
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  video_title TEXT,
  video_description TEXT,
  video_tags TEXT[],
  video_category TEXT,
  target_duration TEXT,  -- 'short', 'mid', 'long'
  thumbnail_url TEXT,
  video_url TEXT,       -- 생성된 영상 파일 URL
  status TEXT DEFAULT 'draft',
  youtube_video_id TEXT, -- 업로드 후 YouTube ID
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- 유튜브 대본 카드 (섹션)
youtube_cards (
  id UUID PRIMARY KEY,
  youtube_content_id UUID REFERENCES youtube_contents(id) ON DELETE CASCADE,
  section_type TEXT,  -- 'intro', 'body', 'outro'
  narration_text TEXT,
  screen_direction TEXT,
  subtitle_text TEXT,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- 미디어 에셋 (이미지, 오디오 히스토리 통합)
media_assets (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  parent_type TEXT NOT NULL,      -- 'blog_card', 'instagram_card', 'youtube_card', 'threads_card'
  parent_id UUID NOT NULL,
  asset_type TEXT NOT NULL,       -- 'image', 'audio', 'video'
  file_url TEXT NOT NULL,
  prompt TEXT,                    -- AI 생성 시 사용된 프롬프트
  generation_params JSONB,        -- 모델, 음성 등 생성 파라미터
  version INTEGER NOT NULL DEFAULT 1,
  is_current BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- 팩트체크 리포트
factcheck_reports (
  id UUID PRIMARY KEY,
  content_type TEXT NOT NULL,  -- 'blog', 'instagram', 'threads', 'youtube'
  content_id UUID NOT NULL,
  claims JSONB NOT NULL,       -- [{claim, status, sources, suggestion}]
  trust_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- 게시 이력
publish_logs (
  id UUID PRIMARY KEY,
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  platform TEXT NOT NULL,  -- 'instagram', 'threads', 'youtube'
  status TEXT NOT NULL,    -- 'pending', 'uploading', 'success', 'failed'
  platform_post_id TEXT,
  error_message TEXT,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

### 5.2 Supabase Storage 버킷

| 버킷 | 용도 |
|------|------|
| `guides` | 업로드된 글쓰기 가이드 파일 |
| `references` | 참고 자료 파일 (PDF, DOCX 등) |
| `images` | AI 생성 이미지 + 사용자 업로드 이미지 |
| `audio` | TTS 생성 오디오 파일 |
| `video` | 합성된 동영상 파일 |
| `thumbnails` | 유튜브 썸네일 |

---

## 6. AI 프롬프트 아키텍처

### 6.1 프롬프트 구성 체계

AI 컨텐츠 생성 시 프롬프트는 다음 계층으로 합성된다:

```
[시스템 프롬프트]
├── 역할 정의 (SNS 마케팅 전문 카피라이터)
├── 프로젝트 설정
│   ├── 브랜드 정보 (이름, 설명, USP, 타겟 고객)
│   ├── 마케터 페르소나 (이름, 전문 분야, 어조, 자주 쓰는 표현)
│   ├── 채널별 말투 프롬프트 (블로그/인스타/스레드/유튜브)
│   └── 채널별 그림체 프롬프트 (이미지 생성 시)
├── 전체 글쓰기 가이드 (사용자 업로드)
├── 채널별 글쓰기 가이드 (사용자 업로드)
└── 채널별 최적화 규칙 (시스템 내장)

[사용자 프롬프트]
├── 컨텐츠 정보 (제목, 카테고리, 태그, 메모)
├── 참고 자료 (PDF 텍스트, 유튜브 자막, 웹 URL 본문)
├── 기본 글 원본 (채널별 변환 시)
├── 네이버 키워드 데이터 (블로그의 경우)
├── 생성 지시 (어떤 형식으로 몇 개의 카드를 만들지)
└── 추가 요구사항 (톤, 길이, 타겟 등)
```

**기본 글 생성 시 프롬프트 플로우:**
1. 프로젝트 설정(브랜드, 마케터) + 글쓰기 가이드 + 참고 자료 → 기본 글 생성

**채널별 변환 시 프롬프트 플로우:**
1. 기본 글 원본 + 프로젝트 설정 + 채널별 말투/그림체 프롬프트 + 채널별 가이드 → 채널 최적화 컨텐츠 생성

### 6.2 채널별 시스템 프롬프트 (내장)

**블로그 (네이버):**
- C-Rank 최적화: 주제 전문성 강조, 일관된 톤
- D.I.A.+ 최적화: 검색 의도 일치, 구조화된 콘텐츠
- SEO: 키워드 자연 분포, 소제목 활용, 이미지 ALT 텍스트

**인스타그램 카드뉴스:**
- 시각적 임팩트 우선, 짧고 강렬한 텍스트
- 첫 카드에서 주의 끌기, 마지막 카드에 CTA
- 해시태그 전략 포함

**스레드:**
- 500자 제한 내에서 핵심 전달
- 대화체/캐주얼 톤
- 시리즈 스레드 시 각 포스트 독립적 + 전체 연결

**유튜브:**
- 초반 15초 후킹
- 시청 유지율 최적화된 구조
- SEO 최적화 제목/설명/태그

---

## 7. API 연동 상세

### 7.1 Instagram Graph API

| 항목 | 상세 |
|------|------|
| 인증 | Meta Business Suite OAuth 2.0 + Long-Lived Token |
| 게시 엔드포인트 | `POST /{ig-user-id}/media` → `POST /{ig-user-id}/media_publish` |
| 카루셀 | 개별 이미지 컨테이너 생성 후 카루셀 컨테이너로 묶어 게시 |
| 릴스 | 동영상 URL + 캡션으로 릴스 게시 |
| 제한 | 24시간 내 25개 게시, 이미지 최대 10장/카루셀 |

### 7.2 Threads API (Meta)

| 항목 | 상세 |
|------|------|
| 인증 | Instagram 계정 기반 OAuth 2.0 |
| 게시 | `POST /{threads-user-id}/threads` → `POST /{threads-user-id}/threads_publish` |
| 지원 미디어 | 텍스트(500자), 이미지, 동영상, 링크 |
| 멀티 스레드 | reply_to_id로 체인 구성 |

### 7.3 YouTube Data API v3

| 항목 | 상세 |
|------|------|
| 인증 | Google OAuth 2.0 (youtube.upload 스코프) |
| 업로드 | Resumable Upload API 사용 (대용량 파일 지원) |
| 메타데이터 | snippet(제목, 설명, 태그), status(공개/비공개), recordingDetails |
| 일일 쿼터 | 10,000 유닛/일 (영상 업로드 = 1,600 유닛) |

### 7.4 네이버 검색광고 API

| 항목 | 상세 |
|------|------|
| 인증 | API License + Secret Key + Customer ID (HMAC-SHA256 서명) |
| 키워드 도구 | `GET /keywordstool?hintKeywords={keyword}&showDetail=1` |
| 응답 데이터 | 월간 검색량(PC/모바일), 경쟁 강도, 월평균 클릭수, CTR |
| 연관 키워드 | hintKeywords 기반 연관 키워드 목록 자동 반환 |

### 7.5 Perplexity Sonar API

| 항목 | 상세 |
|------|------|
| 인증 | Bearer Token (API Key) |
| 엔드포인트 | `POST https://api.perplexity.ai/chat/completions` |
| 모델 | sonar (빠른 검증), sonar-pro (심층 분석) |
| 팩트체크 활용 | 주장 추출 → 각 주장별 검증 쿼리 → citations 기반 출처 수집 |
| 과금 | 토큰 기반 (Input $1~3/1M, Output $1~15/1M) |

### 7.6 Meta Pixel (Conversions API)

| 항목 | 상세 |
|------|------|
| 설정 | Pixel ID + System User Access Token |
| 서버 사이드 전송 | `POST /v21.0/{pixel-id}/events` |
| 이벤트 | PageView, ViewContent, Lead, Purchase 등 |
| 활용 | 게시된 컨텐츠 링크 클릭 → 전환 추적 |

### 7.7 Google Analytics 4 (Data API)

| 항목 | 상세 |
|------|------|
| 인증 | Service Account + GA4 Property ID |
| 데이터 조회 | `POST /v1beta/{property}:runReport` |
| 조회 가능 항목 | 세션수, 사용자수, 페이지뷰, 체류시간, 전환, 유입 소스 등 |
| 활용 | 게시된 컨텐츠별 성과 대시보드 |

---

## 8. 개발 로드맵

### Phase 1: Foundation (5주)

**목표: 기본 프레임워크 + 프로젝트/컨텐츠 관리 + 기본 글 + 다크모드**

| 주차 | 작업 |
|------|------|
| 1주 | 프로젝트 초기 설정 (Next.js + Supabase + Auth), DB 스키마 생성, UI 레이아웃, 다크모드 테마 시스템 |
| 2주 | 프로젝트 CRUD, 프로젝트 설정 (마케팅 주체, 마케터 정의, 채널별 프롬프트), 사이드바 트리 네비게이션 |
| 3주 | 컨텐츠 CRUD, 컨텐츠 설정 탭, 참고 자료 업로드/파싱 (PDF, 유튜브 자막 추출, URL 크롤링) |
| 4주 | 기본 글 탭 에디터 (Tiptap), AI 기본 글 생성 (Gemini 연동), 기본 프롬프트 시스템 |
| 5주 | Perplexity 첨삭 기능 (인라인 하이라이트 + 첨삭 패널), 글쓰기 가이드 업로드/파싱 |

### Phase 2: Channel Content (5주)

**목표: 블로그 + 카드뉴스 + 스레드 + 유튜브(롱폼/릴스) 탭 완성**

| 주차 | 작업 |
|------|------|
| 6주 | 블로그 카드 에디터 (추가/삭제/순서이동), 기본 글 기반 블로그 변환, 이미지 생성 + 히스토리 |
| 7주 | 네이버 SEO 점수 산출, 네이버 키워드 분석, 블로그 미리보기 |
| 8주 | 인스타 카드뉴스 에디터 + 기본 글 기반 변환, 이미지 생성, TTS(동영상 카드뉴스) |
| 9주 | 스레드 에디터 + 기본 글 기반 변환, 유튜브 대본 에디터 (롱폼/릴스) + 기본 글 기반 변환 |
| 10주 | 유튜브 TTS + 영상 합성 파이프라인 (롱폼 16:9 + 릴스 9:16), 채널별 미리보기 완성 |

### Phase 3: Integration (3주)

**목표: 외부 API 연동 + 자동 업로드**

| 주차 | 작업 |
|------|------|
| 11주 | Instagram Graph API + Threads API 연동 (OAuth + 자동 게시) |
| 12주 | YouTube Data API 연동 (OAuth + 업로드 + Shorts), 네이버 검색광고 API 연동 |
| 13주 | Meta Pixel + GA4 연동 |

### Phase 4: Polish (3주)

**목표: 품질 개선 + 대시보드 + 최적화**

| 주차 | 작업 |
|------|------|
| 14주 | 통합 애널리틱스 대시보드, 예약 게시 시스템 |
| 15주 | 반응형 UI, 성능 최적화, 에러 핸들링 |
| 16주 | E2E 테스트, 베타 테스트, 버그 수정, 배포 |

---

## 9. 비기능 요구사항

### 9.1 성능

- 페이지 로드: First Contentful Paint < 1.5초
- AI 생성 응답: 스트리밍으로 실시간 표시 (TTFB < 2초)
- 이미지 생성: 10초 이내 (로딩 인디케이터 표시)
- 동영상 합성: 백그라운드 작업 + 진행률 표시

### 9.2 보안

- API 키: Supabase Vault 암호화 저장
- OAuth 토큰: 서버 사이드 관리, 자동 갱신
- RLS (Row Level Security): 모든 테이블에 사용자별 접근 제어
- HTTPS 전용

### 9.3 확장성

- Vercel Serverless 기반 오토스케일링
- 대용량 미디어: Supabase Storage CDN
- 작업 큐: BullMQ로 비동기 처리 (영상 합성, 대량 업로드)

---

## 부록: 네이버 블로그 SEO 최적화 기준 상세

ContentFlow의 블로그 SEO 점수 산출에 적용되는 네이버 알고리즘 기준:

**C-Rank (블로그 신뢰도)**
- 주제 전문성 (40%): 해당 카테고리 내 일관된 포스팅
- 활동 지속성 (30%): 3개월 이상 꾸준한 활동
- 사용자 반응 (20%): 댓글, 공감, 체류시간
- 콘텐츠 품질 (10%): 원본성, 깊이

**D.I.A.+ (개별 문서 품질)**
- 검색 의도 매칭: 사용자가 찾는 정보와 콘텐츠의 일치도
- 콘텐츠 구조: 소제목, 이미지, 리스트 등 구조적 완성도
- 독창성: AI 탐지 우회가 아닌 실질적 독창적 관점 포함
- 체류 유도: 충분한 정보량 + 가독성

**투트랙 전략 (2026 권장)**
- 검색형: 키워드 최적화된 정보 제공형 포스트
- 홈피드형: 트렌디하고 참여를 유도하는 포스트
- ContentFlow는 두 유형을 모두 지원하며, 주제 생성 시 "검색 최적화" / "피드 최적화" 모드를 선택할 수 있다.
