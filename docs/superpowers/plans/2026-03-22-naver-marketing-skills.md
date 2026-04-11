# 네이버 마케팅 스킬 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 네이버 광고 생태계를 커버하는 12개의 Claude Code 마케팅 스킬 .md 파일을 작성하여 `~/.claude/commands/`에 설치한다.

**Architecture:** 각 스킬은 독립적인 .md 파일이며 YAML frontmatter + 5개 섹션(What it does / How it works / Practical example / What you get back / When to use it) 구조를 따른다. 기존 Google/Meta 스킬(01~44)의 패턴을 그대로 준수하되 한국어로 작성한다.

**Tech Stack:** Markdown (.md), YAML frontmatter, Claude Code slash commands

**Spec:** `docs/superpowers/specs/2026-03-22-naver-marketing-skills-design.md`

**Reference files (기존 스킬 패턴):**
- `marketing-skills/Skills for Claude/01-google-and-meta-cpa-diagnostics.md` — 01~30번 구조 (What it does / How it works / Practical example / What you get back / When to use it)
- `marketing-skills/Skills for Claude/37-google-ads-audit.md` — 31~44번 구조 (Process / Checklist / Output Format / Example)

**우리 스킬은 01~30번 구조를 따른다.**

**설치 경로:** `~/.claude/commands/`에 직접 생성 (Windows: `C:/Users/101024/.claude/commands/`)

---

## File Map

| 파일 | 역할 |
|------|------|
| `~/.claude/commands/N01-naver-keyword-research.md` | 키워드 검색량/경쟁률/CPC 분석 (API 연동) |
| `~/.claude/commands/N02-naver-keyword-group-planner.md` | 키워드 그룹핑 및 예산 배분 |
| `~/.claude/commands/N03-naver-powerlink-setup.md` | 파워링크 캠페인 세팅 가이드 |
| `~/.claude/commands/N04-naver-powerlink-analysis.md` | 파워링크 성과 데이터 분석 |
| `~/.claude/commands/N05-naver-gfa-strategy.md` | GFA 배너광고 전략 |
| `~/.claude/commands/N06-naver-shopping-ads.md` | 쇼핑검색 광고 최적화 |
| `~/.claude/commands/N07-naver-brand-search.md` | 브랜드검색 광고 기획 |
| `~/.claude/commands/N08-naver-brand-blog.md` | 브랜드 블로그 콘텐츠 전략 |
| `~/.claude/commands/N09-naver-blog-campaign.md` | 블로그 체험단/기자단 관리 |
| `~/.claude/commands/N10-naver-kin-marketing.md` | 지식인 마케팅 |
| `~/.claude/commands/N11-naver-cafe-marketing.md` | 카페 마케팅 |
| `~/.claude/commands/N12-naver-related-keywords.md` | 연관검색어/자동완성 분석 |

---

## 공통 템플릿

모든 스킬 파일은 아래 구조를 따른다. 각 태스크에서 이 템플릿을 기반으로 내용을 채운다.

```markdown
---
name: {kebab-case-name}
description: {스펙의 description 테이블에서 복사}
metadata:
  platform: Naver
  category: {keyword-research | paid-ads | viral-content}
---

# {N번호} / {한국어 스킬 제목}

## What it does (무엇을 하는가)
{기능 설명 — 1인 사업자 눈높이, 전문용어 시 괄호 설명}

## How it works (어떻게 작동하는가)
{프로세스 단계별 설명 + 기준값 테이블 포함}

## Practical example (실전 예시)
{업종 예시로 구체적인 시나리오}

## What you get back (출력 형식)
{공통 출력 템플릿 기반 + 스킬별 커스텀}

## When to use it (언제 사용하는가)
{사용 시나리오 + 연계 스킬 안내}
```

### 전 스킬 필수 포함 항목 (리뷰 반영)

모든 스킬 파일에 반드시 아래 3가지를 포함할 것:

1. **데이터 면책 문구** — "What you get back" 섹션 하단에: `⚠️ 이 수치는 참고용이며, 실제 성과는 다를 수 있습니다.`
2. **네이버 이용약관 준수** — 바이럴/콘텐츠 스킬(N08~N12)의 "How it works" 섹션에: `⚠️ 네이버 이용약관을 준수하세요. 어뷰징, 자동화 봇 사용은 계정 제재의 원인이 됩니다.`
3. **공정위 표시광고법** — 경제적 대가가 있는 스킬(N09, N10)에: `⚠️ 공정위 표시광고법에 따라 경제적 대가를 받은 콘텐츠는 반드시 "소정의 원고료/제품을 제공받아 작성" 문구를 포함해야 합니다.`

---

## Task 1: N01 — 네이버 키워드 리서치

**Files:**
- Create: `C:/Users/101024/.claude/commands/N01-naver-keyword-research.md`

- [ ] **Step 1: 파일 작성**

N01은 가장 복잡한 스킬 (API 연동 포함). 아래 내용을 그대로 작성:

```markdown
---
name: naver-keyword-research
description: 네이버 검색광고 API를 활용한 키워드 분석. 검색량, 경쟁률, 파워링크 CPC를 조회하고 업종별 추천 키워드를 제공. 네이버 광고 시작 전 키워드 조사, 신규 캠페인 기획, 기존 키워드 확장 시 사용.
metadata:
  platform: Naver
  category: keyword-research
---

# N01 / 네이버 키워드 리서치

## What it does (무엇을 하는가)

네이버 검색광고 API를 통해 키워드별 월간 검색량(PC/모바일), 경쟁률, 파워링크 평균 CPC(클릭당 비용)를 조회하고 분석합니다. API 키가 없어도 수동으로 데이터를 입력하면 동일한 분석을 받을 수 있습니다.

## How it works (어떻게 작동하는가)

**1단계: API 키 확인**
환경변수를 확인합니다:
- `NAVER_AD_CUSTOMER_ID`
- `NAVER_AD_API_KEY`
- `NAVER_AD_SECRET_KEY`

API 키가 없으면 발급 가이드를 제공합니다:
> 네이버 검색광고 센터(searchad.naver.com) 로그인 → 도구 → API 사용 관리 → API 키 발급

**2단계: 업종/시드 키워드 입력**
사용자에게 업종과 5~10개의 시드 키워드를 입력받습니다.

**3단계: API 호출 (키 있는 경우)**
아래 Python 스크립트를 Bash로 실행합니다:

\```python
import hashlib, hmac, time, requests, json, sys, os

BASE_URL = "https://api.searchad.naver.com"
API_KEY = os.environ.get("NAVER_AD_API_KEY", "")
SECRET_KEY = os.environ.get("NAVER_AD_SECRET_KEY", "")
CUSTOMER_ID = os.environ.get("NAVER_AD_CUSTOMER_ID", "")

def get_header(method, uri):
    timestamp = str(int(time.time() * 1000))
    message = f"{timestamp}.{method}.{uri}"
    signature = hmac.new(
        SECRET_KEY.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    return {
        "Content-Type": "application/json",
        "X-Timestamp": timestamp,
        "X-API-KEY": API_KEY,
        "X-Customer": CUSTOMER_ID,
        "X-Signature": signature,
    }

def get_keywords(keywords):
    uri = "/keywordstool"
    headers = get_header("GET", uri)
    params = {
        "hintKeywords": ",".join(keywords),
        "showDetail": "1",
    }
    r = requests.get(BASE_URL + uri, headers=headers, params=params)
    if r.status_code == 200:
        return r.json().get("keywordList", [])
    else:
        print(f"Error {r.status_code}: {r.text}", file=sys.stderr)
        return []

keywords = sys.argv[1:]
results = get_keywords(keywords)
for kw in results:
    print(json.dumps(kw, ensure_ascii=False))
\```

**에러 처리:**
- 401/403 → "API 키가 올바르지 않습니다. 네이버 검색광고 > API 관리에서 확인하세요"
- 429 → "일일 호출 한도 초과. 내일 다시 시도하거나 수동으로 데이터를 입력하세요"
- 부분 데이터 → 해당 키워드 "-" 처리, 나머지 정상 출력

**수동 입력 모드 (API 키 없는 경우):**
네이버 키워드 도구(https://manage.searchad.naver.com) 웹사이트에서 직접 조회 후 데이터를 복사-붙여넣기하면 동일한 분석을 제공합니다.

**4단계: 분석 및 추천**
- 검색량 기준 정렬
- 경쟁률 대비 가성비 키워드 추천
- 시즌성 키워드 알림 (월별 검색량 추이가 있는 경우)

**기준값:**
| 지표 | 좋음 🟢 | 주의 🟡 | 위험 🔴 |
|------|---------|---------|---------|
| 월간 검색량 | 1,000회 이상 | 100~999회 | 100회 미만 |
| 경쟁률 | 낮음 | 중간 | 높음 |
| CPC(클릭당 비용) | 업종 평균 이하 | 평균 수준 | 평균 1.5배 이상 |

**업종별 CPC 참고값:**
| 업종 | 평균 CPC | CTR 벤치마크 |
|------|----------|-------------|
| 음식/카페 | 200~500원 | 2~4% |
| 병원/의료 | 1,000~5,000원 | 1~2% |
| 교육/학원 | 500~2,000원 | 1.5~3% |
| 쇼핑몰/패션 | 300~1,000원 | 2~3.5% |
| 법률/세무 | 2,000~10,000원 | 0.8~1.5% |
| IT/소프트웨어 | 500~3,000원 | 1~2.5% |

## Practical example (실전 예시)

강남의 피부과가 "여드름 치료"를 시드 키워드로 입력. API가 연관 키워드 30개를 반환하고 분석 결과:
- "여드름 치료 비용" — 월간 12,000회, 경쟁 높음, CPC 3,200원 → 비용 대비 검색량 높아 핵심 키워드로 추천
- "여드름 흉터 레이저" — 월간 4,500회, 경쟁 중간, CPC 1,800원 → 가성비 키워드 🟢
- "여드름 압출" — 월간 8,000회, 경쟁 낮음, CPC 400원 → 정보성 키워드, 블로그 콘텐츠에 활용 추천
- "여드름 피부과 추천 강남" — 월간 900회, 경쟁 중간, CPC 2,500원 → 지역+의도 키워드, 전환율 높음

## What you get back (출력 형식)

```
## 네이버 키워드 리서치 결과

**분석 일자**: [날짜]
**업종**: [업종]
**시드 키워드**: [입력한 키워드]
**데이터 소스**: [API 조회 / 수동 입력]

### 키워드 분석 테이블
| 키워드 | 월간 검색량(PC) | 월간 검색량(모바일) | 경쟁률 | 평균 CPC | 판정 |
|--------|----------------|-------------------|--------|----------|------|
| | | | | | 🟢/🟡/🔴 |

### 🟢 가성비 추천 키워드 (검색량 대비 경쟁 낮음)
1. [키워드] — 월간 [X]회, CPC [X]원

### 🔴 주의 키워드 (비용 대비 효율 낮음)
1. [키워드] — 사유: [설명]

### 시즌성 알림
- [해당 월에 검색량이 급증하는 키워드 정보]

### 우선순위 액션 플랜
| 순위 | 키워드 | 추천 용도 | CPC | 비고 |
|------|--------|-----------|-----|------|
| 1 | | 파워링크 | | |
| 2 | | 블로그 콘텐츠 | | |
```

⚠️ 이 수치는 참고용이며, 실제 성과는 다를 수 있습니다.

## When to use it (언제 사용하는가)

- 네이버 검색광고를 처음 시작할 때 — 어떤 키워드에 돈을 쓸지 결정
- 새로운 캠페인을 기획할 때 — 키워드 후보 리스트 확보
- 기존 키워드를 확장하고 싶을 때 — 놓치고 있는 키워드 발굴
- 시즌 프로모션 전 — 시즌별 검색 트렌드 파악
- 경쟁사 키워드를 분석하고 싶을 때

💡 이 분석 결과를 `/naver-keyword-group-planner`에 전달하면 키워드 그룹핑과 예산 배분까지 설계할 수 있습니다.
💡 파워링크 캠페인 세팅까지 한번에 하려면 `/naver-powerlink-setup`을 사용하세요.
💡 블로그 콘텐츠 키워드로 활용하려면 `/naver-brand-blog`와 함께 사용하세요.
```

- [ ] **Step 2: 파일 구조 검증**

파일이 정상적으로 생성되었는지 확인:
```bash
head -5 "C:/Users/101024/.claude/commands/N01-naver-keyword-research.md"
```
Expected: YAML frontmatter(`---`, `name: naver-keyword-research`, ...)

- [ ] **Step 3: 커밋**
```bash
git add "C:/Users/101024/.claude/commands/N01-naver-keyword-research.md"
git commit -m "feat: add N01 naver keyword research skill"
```

---

## Task 2: N02 — 네이버 키워드 그룹 플래너

**Files:**
- Create: `C:/Users/101024/.claude/commands/N02-naver-keyword-group-planner.md`

- [ ] **Step 1: 파일 작성**

스펙 참고:
- **name**: `naver-keyword-group-planner`
- **description**: 시드 키워드에서 연관 키워드를 확장하고 검색 의도별로 그룹핑. 예산 내 최적 키워드 조합을 추천. 파워링크 캠페인 구조 설계 전 키워드 정리 시 사용.
- **category**: `keyword-research`

**핵심 내용:**
- What it does: 키워드를 검색 의도별로 그룹핑(정보탐색/비교검토/구매의도)하고 월 예산에 맞는 최적 조합 추천
- How it works:
  1. N01 데이터 또는 수동 입력 키워드 리스트 받기
  2. 검색 의도별 분류 기준 제시:
     - **정보탐색**: "~란", "~방법", "~차이", "~추천" 등
     - **비교검토**: "~vs", "~비교", "~후기", "~단점" 등
     - **구매의도**: "~가격", "~할인", "~구매", "~신청", "~예약" 등
  3. 그룹별 예상 비용 산출 (검색량 × CPC × 예상 CTR)
  4. 예산 내 최적 키워드 조합 추천 (구매의도 > 비교검토 > 정보탐색 우선)
- Practical example: 월 50만원 예산의 요가학원이 15개 키워드를 3그룹으로 나누고 예산 배분
- What you get back: 그룹별 키워드 테이블, 예산 시뮬레이션 (50%/30%/20% 배분), 우선순위
- When to use it: 캠페인 구조 설계 전, N01 후속 작업, 예산 제한 있을 때. 연계: `/naver-keyword-research`, `/naver-powerlink-setup`

- [ ] **Step 2: 검증**
```bash
head -5 "C:/Users/101024/.claude/commands/N02-naver-keyword-group-planner.md"
```

- [ ] **Step 3: 커밋**
```bash
git add "C:/Users/101024/.claude/commands/N02-naver-keyword-group-planner.md"
git commit -m "feat: add N02 naver keyword group planner skill"
```

---

## Task 3: N03 — 파워링크 세팅 가이드

**Files:**
- Create: `C:/Users/101024/.claude/commands/N03-naver-powerlink-setup.md`

- [ ] **Step 1: 파일 작성**

스펙 참고:
- **name**: `naver-powerlink-setup`
- **description**: 파워링크 캠페인 신규 세팅을 위한 단계별 가이드. 캠페인 구조, 입찰가, 소재 작성, 확장소재까지. 네이버 검색광고를 처음 시작하는 사업자에게 적합.
- **category**: `paid-ads`

**핵심 내용:**
- What it does: 파워링크(네이버 검색광고)를 처음 세팅하는 사업자를 위한 완전 가이드
- How it works:
  1. 업종/상품 정보 입력
  2. 캠페인 구조 설계: 캠페인(브랜드/비브랜드 분리) → 광고그룹(주제별) → 키워드+소재
  3. 키워드 매치 타입: 정확 매치(처음엔 이것 추천) / 구문 매치 / 확장 매치
  4. 입찰가 전략: 업종별 권장 시작가 테이블, 수동 입찰 vs 자동 입찰 비교
  5. 소재 작성 규격:
     - 제목: 15자 이내, 핵심 키워드 + USP
     - 설명: 45자 이내, CTA(행동 유도) 포함
  6. 확장소재: 부가정보(전화번호, 위치), 추가제목, 홍보문구
  7. 일 예산: 월 예산 ÷ 30, 최소 시작 권장 일 예산
- Practical example: "강남 네일샵"이 처음 파워링크 세팅하는 전체 과정
- What you get back: 세팅 체크리스트, 소재 예시 3~5개, 입찰가 추천, 캠페인 구조도
- When to use it: 네이버 광고 처음, 새 상품 캠페인, 기존 구조 재정비. 연계: `/naver-keyword-research`, `/naver-powerlink-analysis`

- [ ] **Step 2: 검증**
- [ ] **Step 3: 커밋**
```bash
git add "C:/Users/101024/.claude/commands/N03-naver-powerlink-setup.md"
git commit -m "feat: add N03 naver powerlink setup guide skill"
```

---

## Task 4: N04 — 파워링크 성과 분석

**Files:**
- Create: `C:/Users/101024/.claude/commands/N04-naver-powerlink-analysis.md`

- [ ] **Step 1: 파일 작성**

스펙 참고:
- **name**: `naver-powerlink-analysis`
- **description**: 네이버 광고관리자 내보내기 데이터를 분석하여 낭비 키워드, CTR/전환율 문제, 최적화 기회를 발굴. 파워링크 성과 리뷰, 월간 보고 시 사용.
- **category**: `paid-ads`

**핵심 내용:**
- What it does: 네이버 광고관리자 데이터를 분석하여 낭비 지출, CTR/전환율 문제, 최적화 기회 발굴
- How it works:
  1. 데이터 입력: CSV 붙여넣기 또는 텍스트로 주요 지표 입력 안내
  2. 핵심 지표 분석 기준값 (업종별 차이 명시):
     | 지표 | 양호 🟢 | 개선필요 🟡 | 긴급 🔴 |
     |------|---------|-----------|---------|
     | CTR | >2% | 1~2% | <1% |
     | 전환율 | >5% | 2~5% | <2% |
     | CPC | 업종 평균 이하 | 평균 1~1.5배 | 평균 1.5배 초과 |
     | 품질지수 | 7~10 | 4~6 | 1~3 |
  3. 낭비 키워드 발굴: 클릭 20회 이상 + 전환 0 → 일시정지/제외 권장
  4. 소재별 CTR 비교
  5. 시간대/요일별 성과 패턴
  6. 우선순위별 액션 플랜
  - 업종별 벤치마크 테이블 (스펙의 N04 기준값 보충 섹션 전체 포함)
- Practical example: 월 200만원 쓰는 학원이 데이터 넣으면 → 40만원 낭비 발견, 3개 액션으로 CPA 30% 절감 가능
- What you get back: 공통 출력 템플릿 + 낭비 키워드 리스트 + 시간대 히트맵
- When to use it: 주간/월간 성과 리뷰, 예산 초과 시, CPA 급등 시. 연계: `/naver-keyword-research`, `/naver-powerlink-setup`

- [ ] **Step 2: 검증**
- [ ] **Step 3: 커밋**
```bash
git add "C:/Users/101024/.claude/commands/N04-naver-powerlink-analysis.md"
git commit -m "feat: add N04 naver powerlink analysis skill"
```

---

## Task 5: N05 — GFA 배너광고 전략

**Files:**
- Create: `C:/Users/101024/.claude/commands/N05-naver-gfa-strategy.md`

- [ ] **Step 1: 파일 작성**

스펙 참고:
- **name**: `naver-gfa-strategy`
- **description**: 네이버 GFA(성과형 디스플레이) 배너 광고 전략. 타겟팅 설계, 소재 규격, 입찰 전략을 안내. DA 광고 시작 또는 최적화 시 사용.
- **category**: `paid-ads`

**핵심 내용:**
- 파일 상단에 반드시 포함: "⚠️ 네이버 GFA 소재 규격은 수시로 변경됩니다. 최신 규격은 네이버 GFA 가이드(https://gfa.naver.com)에서 확인하세요."
- How it works: 캠페인 목표 선택 → 타겟팅 설계(인구통계/관심사/리타겟팅/맞춤타겟) → 소재 규격 → 입찰 전략(CPC/CPM/oCPC) → 예산 배분
- 소재 규격 테이블 (스펙 그대로)
- Practical example: 온라인 쇼핑몰이 첫 GFA 캠페인 세팅
- 연계: `/naver-powerlink-analysis`, `/naver-shopping-ads`

- [ ] **Step 2: 검증**
- [ ] **Step 3: 커밋**
```bash
git add "C:/Users/101024/.claude/commands/N05-naver-gfa-strategy.md"
git commit -m "feat: add N05 naver GFA banner ad strategy skill"
```

---

## Task 6: N06 — 쇼핑검색 광고 최적화

**Files:**
- Create: `C:/Users/101024/.claude/commands/N06-naver-shopping-ads.md`

- [ ] **Step 1: 파일 작성**

스펙 참고:
- **name**: `naver-shopping-ads`
- **description**: 스마트스토어 쇼핑검색 광고 최적화. 상품 피드, 입찰가, ROAS 분석. 쇼핑몰 광고 운영 및 상품명 최적화 시 사용.
- **category**: `paid-ads`

**핵심 내용:**
- 상품 피드 품질 체크 (상품명 규칙: 브랜드 + 핵심키워드 + 상품특성 + 옵션, 50자 이내)
- ROAS 분석 기준값 테이블
- 제외 키워드 관리
- Practical example: 스마트스토어 패션 브랜드의 상품명 최적화 전후 비교
- 연계: `/naver-keyword-research`, `/naver-powerlink-analysis`

- [ ] **Step 2: 검증**
- [ ] **Step 3: 커밋**
```bash
git add "C:/Users/101024/.claude/commands/N06-naver-shopping-ads.md"
git commit -m "feat: add N06 naver shopping ads optimization skill"
```

---

## Task 7: N07 — 브랜드검색 광고 기획

**Files:**
- Create: `C:/Users/101024/.claude/commands/N07-naver-brand-search.md`

- [ ] **Step 1: 파일 작성**

스펙 참고:
- **name**: `naver-brand-search`
- **description**: 브랜드검색 광고 소재 기획. 서브링크 구성, 경쟁사 방어 전략, 시즌별 소재 교체. 브랜드 인지도 캠페인 기획 시 사용.
- **category**: `paid-ads`

**핵심 내용:**
- 메인 소재 구성 (썸네일/제목/설명/서브링크)
- 서브링크 전략 (최대 4개: 이벤트/상품/리뷰/매장)
- 경쟁사 방어 전략
- 시즌별 소재 교체 캘린더
- Practical example: 뷰티 브랜드의 브랜드검색 소재 기획서
- 연계: `/naver-keyword-research`, `/naver-related-keywords`

- [ ] **Step 2: 검증**
- [ ] **Step 3: 커밋**
```bash
git add "C:/Users/101024/.claude/commands/N07-naver-brand-search.md"
git commit -m "feat: add N07 naver brand search ad planning skill"
```

---

## Task 8: N08 — 브랜드 블로그 콘텐츠 전략

**Files:**
- Create: `C:/Users/101024/.claude/commands/N08-naver-brand-blog.md`

- [ ] **Step 1: 파일 작성**

스펙 참고:
- **name**: `naver-brand-blog`
- **description**: 자체 네이버 블로그 운영 전략. C-Rank/D.I.A 최적화, 포스팅 캘린더, SEO 글 구조. 블로그 마케팅 시작 또는 노출 개선 시 사용.
- **category**: `viral-content`

**핵심 내용:**
- C-Rank(창작 지수), D.I.A(문서 품질 알고리즘) 설명
- D.I.A 최적화 체크리스트 (스펙 그대로: 1500자+, 이미지 3장+, 동영상, 소제목, 내부링크)
- 월간 포스팅 캘린더 생성 프로세스
- 포스팅 템플릿 예시 (정보성/후기/비교 가이드 3가지)
- Practical example: 인테리어 업체의 월간 블로그 전략
- 연계: `/naver-keyword-research`, `/naver-related-keywords`

- [ ] **Step 2: 검증**
- [ ] **Step 3: 커밋**
```bash
git add "C:/Users/101024/.claude/commands/N08-naver-brand-blog.md"
git commit -m "feat: add N08 naver brand blog content strategy skill"
```

---

## Task 9: N09 — 블로그 체험단/기자단 관리

**Files:**
- Create: `C:/Users/101024/.claude/commands/N09-naver-blog-campaign.md`

- [ ] **Step 1: 파일 작성**

스펙 참고:
- **name**: `naver-blog-campaign`
- **description**: 블로그 체험단/기자단 캠페인 관리. 모집 공고, 가이드라인, 원고 검수, 성과 측정. 체험단 운영 또는 기자단 캠페인 기획 시 사용.
- **category**: `viral-content`

**핵심 내용:**
- ⚠️ **공정위 표시광고법 준수 필수**: "소정의 원고료/제품을 제공받아 작성" 문구 반드시 포함
- 모집 공고 템플릿
- 블로거 선정 기준 (일 방문자 수, 블로그 지수, 카테고리 적합성)
- 가이드라인 문서 (필수 키워드, 사진 가이드, 금지사항)
- 원고 검수 체크리스트
- 성과 측정 지표
- Practical example: 카페 체험단 10명 운영 전체 과정
- 연계: `/naver-brand-blog`, `/naver-keyword-research`

- [ ] **Step 2: 검증**
- [ ] **Step 3: 커밋**
```bash
git add "C:/Users/101024/.claude/commands/N09-naver-blog-campaign.md"
git commit -m "feat: add N09 naver blog campaign management skill"
```

---

## Task 10: N10 — 지식인 마케팅

**Files:**
- Create: `C:/Users/101024/.claude/commands/N10-naver-kin-marketing.md`

- [ ] **Step 1: 파일 작성**

스펙 참고:
- **name**: `naver-kin-marketing`
- **description**: 네이버 지식인을 활용한 마케팅 전략. 자연스러운 답변 작성, 질문 발굴, 어뷰징 방지. 지식인 마케팅 시작 또는 전략 점검 시 사용.
- **category**: `viral-content`

**핵심 내용:**
- ⚠️ **어뷰징 방지 경고**: 동일 IP 다중 계정 금지, 자문자답 패턴 회피, 과도한 링크 삽입 금지, 광고성 답변 패널티
- ⚠️ **공정위 표시광고법**: 경제적 대가가 있는 경우 반드시 표시
- 품질 기준값:
  | 지표 | 우수 🟢 | 보통 🟡 | 미달 🔴 |
  |------|---------|---------|---------|
  | 답변 길이 | 300자+ | 100~300자 | <100자 |
  | 참고 링크 | 1~2개 (자연스러운) | 0개 | 3개+ (스팸 의심) |
  | 채택률 목표 | >30% | 10~30% | <10% |
- 자연스러운 답변 작성 가이드 (정보 제공 → 자연스러운 추천)
- 업종별 자주 묻는 질문 리스트 생성
- Practical example: 치과가 "임플란트 비용" 관련 지식인 전략
- 연계: `/naver-keyword-research`, `/naver-related-keywords`

- [ ] **Step 2: 검증**
- [ ] **Step 3: 커밋**
```bash
git add "C:/Users/101024/.claude/commands/N10-naver-kin-marketing.md"
git commit -m "feat: add N10 naver kin marketing skill"
```

---

## Task 11: N11 — 카페 마케팅

**Files:**
- Create: `C:/Users/101024/.claude/commands/N11-naver-cafe-marketing.md`

- [ ] **Step 1: 파일 작성**

스펙 참고:
- **name**: `naver-cafe-marketing`
- **description**: 네이버 카페 마케팅 전략. 타겟 카페 선정, 게시글 작성, 자체 카페 운영. 카페 홍보 또는 커뮤니티 마케팅 기획 시 사용.
- **category**: `viral-content`

**핵심 내용:**
- 타겟 카페 선정 기준:
  | 지표 | 우수 🟢 | 보통 🟡 | 비추천 🔴 |
  |------|---------|---------|-----------|
  | 회원 수 | 10만+ | 1만~10만 | <1만 |
  | 일 게시글 | 50+ | 10~50 | <10 |
  | 업종 연관성 | 직접 관련 | 간접 관련 | 무관 |
- 게시글 유형별 작성 가이드 (정보형/후기형/질문형)
- 자체 카페 운영 전략 (회원 모집, 등급제, 콘텐츠 운영)
- 카페 내 이벤트 기획
- Practical example: 반려동물 쇼핑몰의 카페 마케팅 전략
- 연계: `/naver-brand-blog`, `/naver-keyword-research`

- [ ] **Step 2: 검증**
- [ ] **Step 3: 커밋**
```bash
git add "C:/Users/101024/.claude/commands/N11-naver-cafe-marketing.md"
git commit -m "feat: add N11 naver cafe marketing skill"
```

---

## Task 12: N12 — 연관검색어/자동완성 분석

**Files:**
- Create: `C:/Users/101024/.claude/commands/N12-naver-related-keywords.md`

- [ ] **Step 1: 파일 작성**

스펙 참고:
- **name**: `naver-related-keywords`
- **description**: 네이버 연관검색어/자동완성 분석 및 콘텐츠 전략 연계. 긍정/부정 키워드 분류, 트렌드 모니터링. 브랜드 평판 관리 또는 콘텐츠 기획 시 사용.
- **category**: `viral-content`

**핵심 내용:**
- 데이터 수집: 네이버 검색창에서 수동 수집 → 텍스트로 붙여넣기 → Claude 분석
- 긍정/부정/중립 연관검색어 분류
- 경쟁사 연관검색어 비교
- 대응 전략: 부정 키워드 → 방어 콘텐츠, 긍정 키워드 → 강화 콘텐츠
- 주기적 모니터링 권장 (주 1회)
- Practical example: 브랜드명 검색 시 "OO 부작용"이 연관검색어로 등장 → 대응 전략
- 연계: `/naver-brand-blog`, `/naver-kin-marketing`

- [ ] **Step 2: 검증**
- [ ] **Step 3: 커밋**
```bash
git add "C:/Users/101024/.claude/commands/N12-naver-related-keywords.md"
git commit -m "feat: add N12 naver related keywords analysis skill"
```

---

## Task 13: 최종 검증 및 정리 커밋

- [ ] **Step 1: 전체 파일 목록 확인**
```bash
ls -la "C:/Users/101024/.claude/commands/N*.md"
```
Expected: 12개 파일 (N01 ~ N12)

- [ ] **Step 2: 각 파일의 frontmatter 확인**
```bash
for f in C:/Users/101024/.claude/commands/N*.md; do echo "=== $f ==="; head -4 "$f"; echo; done
```
Expected: 모든 파일이 `---` + `name:` + `description:` 시작

- [ ] **Step 3: 최종 확인 커밋**
```bash
git add -A
git commit -m "feat: complete all 12 naver marketing skills (N01-N12)"
```
