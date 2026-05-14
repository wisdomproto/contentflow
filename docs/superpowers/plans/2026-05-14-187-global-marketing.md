# 187 성장클리닉 글로벌 마케팅 실행 Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.
>
> **Hybrid plan**: 비즈니스 액션 + 코드 작업 혼합. 비즈니스 액션은 outcome 체크리스트, 코드 작업은 sub-spec으로 분리 가능하게 specify.

**Goal:** spec ([2026-05-14-187-global-marketing-design.md](../specs/2026-05-14-187-global-marketing-design.md))에 정의된 4축 글로벌 마케팅 전략을 24개월에 걸쳐 단계적으로 실행 — TH → VN → EN

**Architecture:** 한국 본사 운영 (마케팅·상담·콘텐츠) + 현지 에이전시 핸드오프 (클로징·진료). ContentFlow 다국어 인프라 + dflo_0.1 환자 데이터 자동 파이프. Phase별 진화 (유료 60% → 50/50 → 오가닉 65%).

**Tech Stack:** ContentFlow (Next.js 16, Supabase, Cloudflare R2, Gemini), dflo_0.1 (백엔드 + DFlo 앱), 외부 도구 (Meta/Google/Line/Zalo Ads, 통합 inbox)

**Scope note (multi-subsystem)**: 본 plan은 5+개 독립 subsystem을 포함 — 마스터 실행 plan으로 작성. 각 subsystem별 detail 작업이 필요하면 별도 sub-spec/plan으로 분리:
- [ ] sub-spec 1: 도메인 + 사이트 페이지 구조 (코드)
- [ ] sub-spec 2: dflo_0.1 → ContentFlow 콘텐츠 파이프 (코드)
- [ ] sub-spec 3: DFlo 앱 다국어화 (코드, dflo_0.1 프로젝트)
- 비즈니스 subsystem (에이전시 협약·인력·의료법)은 plan 내부에서 직접 추적

---

## Chunk 0: Phase 0 — 사전 준비 (M-1 ~ M0)

**목표**: 태국 Phase 1A 킥오프 가능한 모든 사전 조건 완료.
**선후 조건**: 0.1·0.2 병렬 가능. 0.3·0.4·0.5는 0.1 완료 후 또는 동시. 0.6 의료법은 0.3 에이전시 협약과 동시에.

---

### 0.1 도메인 + 사이트 구조 (코드)

**Files (예상)**:
- 187 사이트 메인: TBD (dflo_0.1 사이트 또는 별도 187 마케팅 사이트인지 확정 필요)
- `next.config.js` 또는 i18n 라우팅 설정
- `app/[lang]/about/chae-yong-hyun/page.tsx`
- `app/[lang]/clinic/page.tsx`
- `app/[lang]/cases/page.tsx`
- `app/[lang]/reviews/page.tsx`
- `app/[lang]/media/page.tsx`
- `components/Schema/MedicalOrganization.tsx`

**Sub-spec 분리 권고**: 이 subsystem만으로도 ~2주 작업. 별도 sub-spec 작성 후 sub-plan으로 분리.

- [ ] **0.1.1 현 사이트 상태 점검**: 187 마케팅용 메인 사이트 = (a) dflo_0.1 내부 / (b) 별도 도메인 / (c) ContentFlow project의 외부 블로그 API + 정적 사이트 — 확정
- [ ] **0.1.2 도메인 결정**: 글로벌 마케팅용 메인 도메인 1개 (예: `187growth.com`, `chaeyonghyun.clinic`) 또는 기존 도메인 활용
- [ ] **0.1.3 다국어 서브디렉토리 라우팅 셋업** (한국어부터): `/ko/, /en/, /th/, /vi/`
- [ ] **0.1.4 hreflang 자동 생성** (Next.js metadata API)
- [ ] **0.1.5 채용현 원장 저자 페이지 (한국어)** — 자격, 책, 강연, 미디어, 쌍둥이 아빠 의사 브랜딩. 외부 backlink 받을 수 있는 quality
- [ ] **0.1.6 강남 압구정 클리닉 페이지** — 면허·등록번호·사진·진료시간·지도
- [ ] **0.1.7 사례 페이지 셸** — dflo_0.1 cases 데이터 source 연결 (구조만, 콘텐츠는 0.2 파이프)
- [ ] **0.1.8 환자 후기 페이지 셸** — 의료광고법 익명화 + 면책조항
- [ ] **0.1.9 Schema markup** — MedicalOrganization, Physician, MedicalWebPage
- [ ] **0.1.10 검증**: 한국어 페이지 Google Rich Results Test 통과 / Lighthouse SEO ≥ 90 / hreflang 검사 (Ahrefs, Screaming Frog)

---

### 0.2 dflo_0.1 → ContentFlow 콘텐츠 파이프 (코드)

**Files (예상)**:
- `dflo_0.1/ai-server/`: cases export API
- `contentflow/src/lib/dflo-cases-import.ts`: dflo cases fetch + 익명화
- `contentflow/src/app/api/dflo/import/route.ts`: import 엔드포인트
- `contentflow/src/components/dflo-cases-panel.tsx`: 케이스 선택·발행 UI
- Supabase 신규 테이블 `dflo_cases` (또는 `contents` 확장)

**Sub-spec 분리 권고**: 별도 sub-spec 작성. dflo 백엔드 데이터 구조 파악 후 details.

- [ ] **0.2.1 dflo_0.1 환자/사례 데이터 구조 파악** — DB 스키마, API endpoint, 익명화 정책 (이미 익명화? 또는 후처리?)
- [ ] **0.2.2 케이스 export API 설계** (dflo_0.1 → ContentFlow): `/api/cases/exportable` 형식
- [ ] **0.2.3 익명화 검증 로직** — 이름·생년월일·주소 등 PII 자동 마스킹
- [ ] **0.2.4 ContentFlow import 엔드포인트** — case → blog content 변환 template
- [ ] **0.2.5 사례 카드 템플릿** — 수치(키 변화) + 짧은 코멘트 + 동의받은 사진/그래픽
- [ ] **0.2.6 다국어 자동 번역 hook** — ContentFlow 기존 `lib/channel-translator.ts` 활용
- [ ] **0.2.7 의료광고법 disclaimer 자동 삽입**
- [ ] **0.2.8 schema.org/MedicalCase 마크업 자동**
- [ ] **0.2.9 검증**: 케이스 1건 dflo → ContentFlow → 한국어 페이지 → 4개국 번역 → R2 저장까지 end-to-end 동작

---

### 0.3 태국 현지 에이전시 협약 (비즈니스, **사전 조건**)

**Outcome**: 태국 Phase 1A 킥오프 전 협약 체결. 광고 시작 사전 조건.

- [ ] **0.3.1 협약 모델 정의** — 수수료 구조 (진료 매출 %, fixed fee, 또는 hybrid), 책임 범위, 진료 프로토콜, 환자 데이터 권한
- [ ] **0.3.2 후보 발굴** — 방콕 현지 의료 디지털 헬스 에이전시 / 클리닉 파트너 3-5곳 리스트업
- [ ] **0.3.3 1차 미팅** (온라인 + 가능 시 방콕 출장) — 비전·모델·법적 구조 협의
- [ ] **0.3.4 듀딜리전스** — 의료 면허·실적·평판·재무 검토
- [ ] **0.3.5 협약 초안 (영문 + 태국어)** — 법무 검토 (한국 + 태국)
- [ ] **0.3.6 협약 체결**
- [ ] **0.3.7 진료 프로토콜 표준화 문서** — 한국 본사 가이드라인 → 현지 적용 사항
- [ ] **0.3.8 환자 핸드오프 SOP** — 한국 상담 완료 → 현지 에이전시 인계 절차 (CRM 데이터 전달, 첫 대면 시점, 후속 follow-up 등)

---

### 0.4 한국 본사 다국어 상담 인력 확보 (비즈니스)

**Outcome**: 태국어 응대 가능 1-2명 + 챗봇 1차 응대 시스템.

- [ ] **0.4.1 인력 모델 결정** — (a) 한국 거주 태국인 직고용 / (b) 한국어 가능 태국 출신 프리랜서 / (c) 외주 CS 에이전시 (한국 또는 태국 거주) / (d) 혼합
- [ ] **0.4.2 채용/계약** — 1차 1명 (정규 또는 파트타임)
- [ ] **0.4.3 상담 매뉴얼·스크립트 작성** (한국어 + 태국어) — 187 브랜드 톤·의료 면책·예약 절차
- [ ] **0.4.4 챗봇 시스템 셋업** — 통합 inbox 도구 + 1차 자동 응답 (FAQ 50개 태국어)
- [ ] **0.4.5 응답 SLA 정의** — 평일 5분 / 야간 30분 + 모니터링 alert
- [ ] **0.4.6 CRM 연동** — Supabase `leads` 테이블 + 출처 태깅 (광고·키워드·채널)
- [ ] **0.4.7 검증**: 더미 상담 5건 시뮬레이션 → SLA 달성 + 한국어/태국어 모두 잘 응대

---

### 0.5 통합 inbox 도구 선택·셋업 (비즈니스 + 가벼운 코드)

**Outcome**: Line OA + FB Messenger 통합 관리 + Supabase 연동.

- [ ] **0.5.1 도구 비교** — Respond.io / Sleekflow / Meta Business Inbox + Line OA Manager 병행 / 직접 빌드
- [ ] **0.5.2 도구 선택 + 계약**
- [ ] **0.5.3 Line OA 셋업** — 태국 비즈니스 계정 + 인증
- [ ] **0.5.4 FB Messenger 셋업** — Meta Business 페이지 + 메시지 권한
- [ ] **0.5.5 통합 inbox 연동** — 두 채널 → 한 inbox
- [ ] **0.5.6 Supabase leads 연동** — webhook으로 새 대화 → DB 기록
- [ ] **0.5.7 검증**: Line + Messenger에서 더미 메시지 → inbox에 통합 → Supabase에 기록

---

### 0.6 의료광고법 컴플라이언스 검토 (법무)

**Outcome**: 한국·태국 의료광고법 통과 가능한 콘텐츠·광고 가이드라인 문서.

- [ ] **0.6.1 한국 의료광고법 검토** — 의료법 §56, 효과 보증·과장 금지, 비교 광고 금지, 환자 후기 규제
- [ ] **0.6.2 태국 의료법 검토** — Medical Council of Thailand 규제, 광고 사전 심의 여부
- [ ] **0.6.3 환자 후기 활용 가이드라인** — 익명화·동의서·면책조항 표준
- [ ] **0.6.4 광고 카피 가이드라인** — 허용/금지 표현, 의무 disclaimer
- [ ] **0.6.5 콘텐츠 가이드라인** — 사례 콘텐츠 작성 시 의료광고법 자동 컴플라이언스 체크리스트
- [ ] **0.6.6 베트남·미국 사전 조사** (Phase 2/3 대비 outline)

---

### Phase 0 완료 체크 (Phase 1A 진입 게이트)

- [ ] **G0.1**: 한국어 사이트 5개 페이지 (about/clinic/cases/reviews/media) live + Lighthouse 90+
- [ ] **G0.2**: dflo→ContentFlow 파이프로 케이스 1건 end-to-end 동작
- [ ] **G0.3**: 태국 현지 에이전시 협약 체결
- [ ] **G0.4**: 한국 본사 태국어 상담 인력 1명+ 확보 + 챗봇 1차 시스템 동작
- [ ] **G0.5**: 통합 inbox 동작 (Line + Messenger → Supabase)
- [ ] **G0.6**: 의료광고법 가이드라인 문서 + 광고 카피 컴플라이언스 체크 통과

**모든 G0.x 통과 시 Phase 1A 킥오프 승인** ✅

---

## Chunk 1: Phase 1A — 태국 킥오프 (M0-2)

**목표**: 광고 60% + 콘텐츠 20% + KOL 20%로 빠른 검증, 데이터 수집.
**선후 조건**: Phase 0 게이트 G0.1~G0.6 모두 통과.

---

### 1.1 사이트 태국어 셋업

- [ ] **1.1.1 한국어 사이트 5개 페이지 → 태국어 자동 번역 → 현지 검토 → publish**
- [ ] **1.1.2 채용현 원장 저자 페이지 태국어 — 의학 용어 정확성 검토**
- [ ] **1.1.3 사례 9-20건 태국어 publish** (dflo 파이프로)
- [ ] **1.1.4 태국어 hreflang 검사 + Google Search Console 등록**

### 1.2 광고 캠페인 (M0-2)

- [ ] **1.2.1 Meta Ads 셋업** — FB/IG/TikTok 픽셀 + 광고 계정 (태국 비즈니스)
- [ ] **1.2.2 Google Ads 셋업** — 태국 타겟 검색·디스플레이 캠페인
- [ ] **1.2.3 광고 카피 초안 (태국어, 의료광고법 검토 완료)** — 키 성장 + 채용현 원장 + 무료 상담 CTA
- [ ] **1.2.4 랜딩 페이지** (한국어 사이트 태국어 버전 + 상담 SNS CTA)
- [ ] **1.2.5 광고 시작** — 일 예산 TBD (예산 확정 후)
- [ ] **1.2.6 CPL·CTR 모니터링 (주 단위)**

### 1.3 KOL 협업 (M0-2)

- [ ] **1.3.1 KOL 후보 발굴 (3-5명)** — 한류 친화 육아·건강 KOL (인스타·틱톡·페북)
- [ ] **1.3.2 컨택·제안서** — 협업 모델 (포스트 X편, 영상 Y편, 단가)
- [ ] **1.3.3 콘텐츠 가이드라인 전달** — 187 브랜드, 의료광고법 면책, 메시지 톤
- [ ] **1.3.4 1차 콘텐츠 발행 + 트래픽 측정**

### 1.4 상담 응대 운영 (M0-2)

- [ ] **1.4.1 상담 인입 모니터링 (일 단위)** — Line + Messenger 신규 대화 수
- [ ] **1.4.2 챗봇 → 사람 전환 SLA 측정**
- [ ] **1.4.3 유료 상담 conversion 측정**
- [ ] **1.4.4 현지 에이전시 핸드오프 SOP 실행 + 측정**

### Phase 1A 완료 체크 (M2 게이트)

- [ ] **G1A.1**: 광고 CPL 안정 범위 진입 (TBD, M1-2 평균)
- [ ] **G1A.2**: 월 상담 SNS 클릭 30+ 건 (M2)
- [ ] **G1A.3**: 유료 상담 5+ 건 (M2)
- [ ] **G1A.4**: 현지 핸드오프 SOP 동작 검증
- [ ] **G1A.5**: 콘텐츠 자산 누적 10편 + 사례 20건+

---

## Chunk 2: Phase 1B/1C — 태국 균형/오가닉 (M3-9)

### 2.1 Phase 1B (M3-5) — 50/50 균형

- [ ] **2.1.1 광고 비중 ↓ 40%** — winning audience·keyword 집중
- [ ] **2.1.2 콘텐츠 추가 발행 누적 20편**
- [ ] **2.1.3 환자 후기 카드 다국어화 (5건+)**
- [ ] **2.1.4 SEO 태국어 키워드 ranking 누적 모니터링**
- [ ] **2.1.5 KOL 3-5명 캠페인 안정화**
- [ ] **2.1.6 그룹 A nurture marketing 시작** (DFlo 앱 콘텐츠 + 리타게팅)

### 2.2 Phase 1C (M6-9) — 오가닉 65% + VN trigger

- [ ] **2.2.1 광고 결정적 키워드에만 집중 (20%)**
- [ ] **2.2.2 콘텐츠 누적 30편, evergreen 자산 형성**
- [ ] **2.2.3 KPI 정량 목표 vs 실측 비교** (TH→VN trigger 결정)
- [ ] **2.2.4 트리거 통과 시 → Chunk 3 (베트남) 진입**
- [ ] **2.2.5 미달 시 → Phase 1C 유지, 원인 분석**
- [ ] **2.2.6 태국 모델 표준화 문서 작성** — 베트남 복제용

### Phase 1 완료 체크 (M9 trigger)

- [ ] **G1.1**: 월 상담 SNS 클릭 100-200건
- [ ] **G1.2**: CPL 30,000-60,000 KRW
- [ ] **G1.3**: 유료 상담 전환율 15-25%
- [ ] **G1.4**: 그룹 A → B 전환율 측정 시작 (TBD baseline)
- [ ] **G1.5**: 현지 핸드오프 conversion 측정 시작
- [ ] **G1.6**: SEO 태국어 Top10 키워드 5-10개
- [ ] **G1.7**: 도메인 권위 (DR) +10 향상

---

## Chunk 3: Phase 2 — 베트남 (M6-18)

**모델**: TH 모델 복제. M6부터 시장 진단, M9 킥오프, M12-18 Phase B/C.

### 3.1 베트남 시장 진단 (M6-9)

- [ ] **3.1.1 베트남 시장 분석 (DataForSEO)** — 키워드, 경쟁자, 트렌드
- [ ] **3.1.2 베트남 의료법 검토** (Phase 0.6.6 outline → detail)
- [ ] **3.1.3 호치민·하노이 현지 에이전시 발굴**
- [ ] **3.1.4 베트남어 검토 인력 확보 계획**

### 3.2 베트남 사전 준비 (M9-12)

- [ ] **3.2.1 도메인 `/vi/` 서브디렉토리 추가**
- [ ] **3.2.2 사이트 5개 페이지 베트남어 publish**
- [ ] **3.2.3 Zalo OA + FB Messenger 셋업**
- [ ] **3.2.4 베트남어 상담 인력 1명 확보**
- [ ] **3.2.5 현지 에이전시 협약 체결**

### 3.3 베트남 Phase A/B/C (M12-18)

- [ ] **3.3.1 Phase A (M12-14)**: 광고 60% + 콘텐츠 20% + KOL 20%
- [ ] **3.3.2 Phase B (M15-17)**: 50/50
- [ ] **3.3.3 Phase C (M18+)**: 오가닉 65%

---

## Chunk 4: Phase 3 — 영어 4시장 (M12-24)

**모델**: 영어 1세트 = US + IN + PH + MY 동시 도달. TH/VN 검증 후 본격 진입.

### 4.1 영어 시장 진단 (M12)

- [ ] **4.1.1 US/IN/PH/MY 각 시장 분석** — 키워드, 경쟁자(NuBest 등), 트렌드
- [ ] **4.1.2 미국·인도 의료법 검토**
- [ ] **4.1.3 현지 에이전시 발굴** (각국 최소 1곳)
- [ ] **4.1.4 영어 콘텐츠 인력 확보 계획**

### 4.2 영어 사전 준비 (M12-15)

- [ ] **4.2.1 도메인 `/en/` 서브디렉토리 추가**
- [ ] **4.2.2 사이트 페이지 영어 publish**
- [ ] **4.2.3 WhatsApp + Messenger 셋업** (인도·필리핀·말레이는 WhatsApp 압도적)
- [ ] **4.2.4 영어 상담 인력 1-2명 확보**
- [ ] **4.2.5 4개국 현지 에이전시 협약** (또는 통합 1개 글로벌 에이전시)

### 4.3 영어 4시장 Phase A/B/C (M15-24)

- [ ] **4.3.1 Phase A (M15-17)**: 광고 60% + 콘텐츠 20% + KOL 20% (4시장 동시)
- [ ] **4.3.2 Phase B (M18-20)**: 50/50
- [ ] **4.3.3 Phase C (M21+)**: 오가닉 65%

---

## Cross-Cutting (모든 Phase 공통)

### 한국 본진 (KR) — 지속 강화

- [ ] **K.1**: 네이버 SEO·블로그·카페·지식인 콘텐츠 지속 발행
- [ ] **K.2**: 다국어 동기화 (글로벌 발행 콘텐츠를 한국어 버전 자동 동기화)
- [ ] **K.3**: 한국 광고 운영 (카카오·네이버·페이스북)

### DFlo 앱 운영

- [ ] **D.1 (Phase 0)**: 앱 다국어화 일정 결정 (Phase 1A까지 한국어만 OK?)
- [ ] **D.2 (Phase 1)**: 태국어 앱 출시 (M3-6, Phase 1B 동안)
- [ ] **D.3 (Phase 2)**: 베트남어 앱 출시
- [ ] **D.4 (Phase 3)**: 영어 앱 출시
- [ ] **D.5 (전 Phase)**: 그룹 A nurture 콘텐츠 운영 (앱 내 콘텐츠 + 푸시 알림)

### 측정·반복

- [ ] **M.1 (Weekly)**: KPI 대시보드 점검 — CPL, 상담 클릭, 유료 상담, 그룹 A→B 전환
- [ ] **M.2 (Monthly)**: Phase 진화 결정 (다음 Phase 진입 vs 현 Phase 유지)
- [ ] **M.3 (Quarterly)**: 전략 retrospective + spec 업데이트

---

## Open Questions (Plan 진행 중 결정 필요)

- ⏳ **시작 시점 M0** — 언제?
- ⏳ **태국 Phase 1 월간 예산** — 광고비 + KOL + 검토 + 상담 응대
- ⏳ **KPI 정량 목표 확정** (G1.x 수치)
- ⏳ **187 마케팅용 메인 사이트** — dflo_0.1 내부 / 별도 도메인 / ContentFlow 외부 블로그 API + 정적 사이트 중 선택
- ⏳ **DFlo 앱 다국어화 우선순위** (Phase 1B vs 1C)
- ⏳ **현지 에이전시 수익 모델** (Phase 0.3.1)

---

## 참고

- [spec 문서](../specs/2026-05-14-187-global-marketing-design.md)
- [HTML 시각화](../../../contentflow/public/strategy-templates/187-global-strategy.html)
- [10개국 시장 분석](../../../contentflow/public/strategy-templates/187-global-market.html)
- ContentFlow 플랫폼: `../../../contentflow/CLAUDE.md`
- dflo_0.1 백엔드: `C:/projects/dflo_0.1/`

---

**End of Plan.**
