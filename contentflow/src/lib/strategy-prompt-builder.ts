import type { StrategyInput, KeywordItem, CrawlResult, StrategyTab } from '@/types/strategy';

interface PromptContext {
  input: StrategyInput;
  keywordData?: KeywordItem[];
  crawlResults?: CrawlResult[];
  existingTabs?: Record<string, unknown>;
}

function buildContextBlock(ctx: PromptContext): string {
  const parts: string[] = [];

  parts.push(`## 비즈니스 정보
- 업종: ${ctx.input.businessInfo.industry}
- 서비스: ${ctx.input.businessInfo.services}
- 타겟 고객: ${ctx.input.businessInfo.targetCustomer}
- 차별화: ${ctx.input.businessInfo.usp}
- 보유 채널: ${ctx.input.businessInfo.channels.join(', ')}`);

  if (ctx.input.budget) {
    parts.push(`- 월 예산: ${ctx.input.budget.monthlyRange}
- 인원: ${ctx.input.budget.teamSize}명`);
  }

  if (ctx.input.competitors.length > 0) {
    parts.push(`\n## 경쟁사\n${ctx.input.competitors.map((c) => `- ${c.name}${c.url ? ` (${c.url})` : ''}`).join('\n')}`);
  }

  if (ctx.crawlResults?.length) {
    const successful = ctx.crawlResults.filter((r) => r.success);
    if (successful.length > 0) {
      parts.push(`\n## 웹사이트 분석 결과`);
      successful.forEach((r) => {
        parts.push(`### ${r.url}
- 제목: ${r.title || '없음'}
- 설명: ${r.description || '없음'}
- 주요 헤딩: ${r.headings?.join(' | ') || '없음'}
- 본문 요약: ${r.bodyText?.slice(0, 500) || '없음'}`);
      });
    }
  }

  if (ctx.keywordData?.length) {
    const top20 = [...ctx.keywordData].sort((a, b) => b.totalSearch - a.totalSearch).slice(0, 20);
    parts.push(`\n## 키워드 데이터 (상위 20개)
| 키워드 | 월 검색량 | 모바일% | 경쟁 |
|--------|----------|---------|------|
${top20.map((k) => `| ${k.keyword} | ${k.totalSearch.toLocaleString()} | ${k.mobileRatio}% | ${k.competition} |`).join('\n')}`);
  }

  return parts.join('\n');
}

export function buildStrategyPrompt(tab: StrategyTab, ctx: PromptContext, instruction?: string): string {
  const context = buildContextBlock(ctx);

  const tabPrompts: Record<StrategyTab, string> = {
    overview: `당신은 SNS 마케팅 전문 컨설턴트입니다.

아래 비즈니스 정보와 데이터를 분석하여 "개요·경쟁사" 전략을 JSON으로 생성해주세요.

${context}

${instruction ? `\n사용자 추가 지시: ${instruction}\n` : ''}

반드시 아래 JSON 구조로 응답하세요 (다른 텍스트 없이 JSON만):
{
  "summary": "비즈니스 핵심 요약 (2~3문장)",
  "differentiators": [
    { "label": "라벨", "title": "제목", "description": "설명", "color": "teal|amber|coral|purple" }
  ],
  "issues": [
    { "severity": "critical|warning|opportunity", "title": "제목", "description": "설명" }
  ],
  "heroStats": [
    { "value": "숫자", "label": "라벨" }
  ],
  "competitors": [
    { "name": "경쟁사명", "type": "유형", "strengths": "강점", "weaknesses": "약점", "strategy": "전략" }
  ],
  "positioning": "차별화 포지셔닝 요약"
}`,

    keywords: `당신은 네이버 SEO 및 키워드 분석 전문가입니다.

아래 키워드 데이터를 분석하여 키워드 전략을 JSON으로 생성해주세요.

${context}

${instruction ? `\n사용자 추가 지시: ${instruction}\n` : ''}

반드시 아래 JSON 구조로 응답하세요:
{
  "goldenKeywords": [
    { "keyword": "키워드", "totalSearch": 0, "competition": "낮음|중간", "strategy": "공략법", "priority": 1 }
  ],
  "insights": [
    { "title": "인사이트 제목", "description": "설명", "color": "teal|amber|coral|purple" }
  ],
  "categories": ["카테고리1", "카테고리2"],
  "categoryMap": { "키워드": "카테고리" }
}

참고: items, trends 데이터는 네이버 API에서 직접 가져오므로 생성하지 마세요. goldenKeywords, insights, categories, categoryMap만 생성하세요.`,

    channelStrategy: `당신은 멀티채널 SNS 마케팅 전략가입니다.

아래 데이터를 기반으로 채널·퍼널 전략을 JSON으로 생성해주세요.

${context}

${instruction ? `\n사용자 추가 지시: ${instruction}\n` : ''}

반드시 아래 JSON 구조로 응답하세요:
{
  "funnel": [
    { "icon": "이모지", "title": "단계명", "description": "설명" }
  ],
  "funnelActions": "퍼널별 핵심 액션 설명",
  "homepageOptimization": "홈페이지 전환 최적화 제안",
  "channels": [
    { "channel": "채널명", "icon": "이모지", "frequency": "주 N회", "bestTime": "시간대", "strategy": "전략 설명", "keywords": ["키워드"], "adBudget": "예산" }
  ],
  "schedule": [
    { "channel": "채널명", "days": {"월":"콘텐츠","화":"—"}, "weeklyCount": "N회", "time": "시간" }
  ],
  "roles": [
    { "role": "A 담당", "title": "역할명", "tasks": "담당 업무" }
  ]
}`,

    contentStrategy: `당신은 콘텐츠 마케팅 전문가입니다.

아래 데이터를 기반으로 콘텐츠 전략과 주제 목록을 JSON으로 생성해주세요.
주제는 50~100개를 생성하세요.

${context}

${instruction ? `\n사용자 추가 지시: ${instruction}\n` : ''}

반드시 아래 JSON 구조로 응답하세요:
{
  "categories": [
    { "code": "A", "name": "카테고리명", "description": "설명", "topicCount": 0 }
  ],
  "cycleInfo": "사이클 설명 (예: 5주 1사이클 = 연 10회)",
  "categoryRatios": "카테고리별 비율 설명",
  "topics": [
    { "id": "A-01", "category": "A", "title": "주제 제목", "angle": "콘텐츠 각도", "keywords": ["키워드"], "targetChannels": ["블로그","유튜브"], "source": "출처" }
  ]
}`,

    kpiAction: `당신은 마케팅 성과 측정 및 전략 실행 전문가입니다.

아래 데이터를 기반으로 KPI 체계와 액션플랜을 JSON으로 생성해주세요.

${context}

${instruction ? `\n사용자 추가 지시: ${instruction}\n` : ''}

반드시 아래 JSON 구조로 응답하세요:
{
  "channelKpis": [
    { "channel": "채널명", "icon": "이모지", "metrics": ["지표1","지표2"], "target": "목표치" }
  ],
  "integratedKpi": {
    "metrics": ["통합 지표1", "통합 지표2"],
    "warning": "주의사항"
  },
  "actions": [
    { "priority": "now|soon|mid", "action": "액션명", "description": "설명", "timeline": "기간", "cost": "비용", "assignee": "담당" }
  ],
  "budgetSummary": "예산 배분 요약"
}`,
  };

  return tabPrompts[tab];
}
