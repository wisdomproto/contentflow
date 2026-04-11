import type { Project, Content, BaseArticle, BlogCard, YoutubeContent, YoutubeCard } from '@/types/database';

export interface PromptContext {
  project: Project;
  content: Content;
  baseArticle?: BaseArticle;
  referenceTexts?: string[];
  topicHint?: string;
  seoTitle?: string;
  keywords?: { primary?: string; secondary?: string[] };
}

function buildBrandContext(project: Project): string[] {
  const sections: string[] = [];

  const brandParts: string[] = [];
  if (project.brand_name) brandParts.push(`브랜드명: ${project.brand_name}`);
  if (project.brand_description) brandParts.push(`브랜드 설명: ${project.brand_description}`);
  if (project.industry) brandParts.push(`산업: ${project.industry}`);
  if (project.usp) brandParts.push(`USP: ${project.usp}`);
  if (project.brand_tone) brandParts.push(`브랜드 톤: ${project.brand_tone}`);
  if (project.banned_keywords?.length) brandParts.push(`금지 키워드: ${project.banned_keywords.join(', ')}`);
  if (brandParts.length > 0) sections.push(`\n## 브랜드 정보\n${brandParts.join('\n')}`);

  if (project.target_audience) {
    sections.push(`\n## 타겟 고객\n${JSON.stringify(project.target_audience, null, 2)}`);
  }

  const marketerParts: string[] = [];
  if (project.marketer_name) marketerParts.push(`마케터: ${project.marketer_name}`);
  if (project.marketer_expertise) marketerParts.push(`전문 분야: ${project.marketer_expertise}`);
  if (project.marketer_style) marketerParts.push(`글쓰기 스타일: ${project.marketer_style}`);
  if (project.marketer_phrases?.length) marketerParts.push(`자주 쓰는 표현: ${project.marketer_phrases.join(', ')}`);
  if (marketerParts.length > 0) sections.push(`\n## 마케터 정보\n${marketerParts.join('\n')}`);

  if (project.writing_guide_global) {
    sections.push(`\n## 글쓰기 가이드 (전체)\n${project.writing_guide_global}`);
  }
  if (project.sns_goal) sections.push(`\n## SNS 목표\n${project.sns_goal}`);

  return sections;
}

export function buildTopicSuggestionPrompt(ctx: PromptContext): string {
  const { project, content } = ctx;
  const sections: string[] = [];

  sections.push('당신은 전문 마케팅 콘텐츠 기획자입니다. 아래 정보를 바탕으로 SNS 마케팅에 적합한 글 주제를 5개 제안해 주세요.');
  sections.push('각 주제에는 제목과 간략한 아웃라인(소제목 3~5개)을 포함하세요.');
  sections.push('반드시 아래 JSON 형식으로만 출력하세요. 다른 텍스트는 포함하지 마세요:');
  sections.push('```json\n[{ "title": "제목", "outline": "1. 소제목1\\n2. 소제목2\\n3. 소제목3" }]\n```');

  // 사용자 요청 주제 방향
  if (ctx.topicHint) {
    sections.push(`\n## 사용자 요청 주제 방향\n${ctx.topicHint}`);
    sections.push('위 방향을 반영하여 주제를 제안해 주세요.');
  }

  sections.push(...buildBrandContext(project));

  if (content.category) sections.push(`\n카테고리: ${content.category}`);
  if (content.tags?.length) sections.push(`태그: ${content.tags.join(', ')}`);
  if (content.memo) sections.push(`메모: ${content.memo}`);

  // 참고 자료 텍스트 (있으면)
  if (ctx.referenceTexts?.length) {
    sections.push(`\n## 참고 자료\n${ctx.referenceTexts.join('\n---\n')}`);
  }

  // 프로젝트 참고 자료 파일 목록
  if (project.reference_files?.length) {
    const fileNames = project.reference_files.map((f) => f.name).join(', ');
    sections.push(`\n## 프로젝트 참고 자료 파일\n${fileNames}`);
  }

  return sections.join('\n');
}

export function buildBaseArticlePrompt(ctx: PromptContext): string {
  const { project, content } = ctx;
  const sections: string[] = [];

  // 역할 지시
  sections.push('당신은 전문 마케팅 콘텐츠 작가입니다. 아래 정보를 바탕으로 기본 글을 작성해 주세요.');
  sections.push('출력은 HTML 형식으로 작성하세요 (h1, h2, h3, p, ul, ol, li, blockquote 태그 사용).');

  sections.push(...buildBrandContext(project));

  // 컨텐츠 정보
  sections.push(`\n## 작성할 컨텐츠\n제목: ${content.title}`);
  if (content.category) sections.push(`카테고리: ${content.category}`);
  if (content.tags?.length) sections.push(`태그: ${content.tags.join(', ')}`);
  if (content.memo) sections.push(`메모: ${content.memo}`);

  // 글쓰기 가이드 (채널별)
  if (project.writing_guide_blog) {
    sections.push(`\n## 블로그 글쓰기 가이드\n${project.writing_guide_blog}`);
  }
  if (project.writing_guide_instagram) {
    sections.push(`\n## 인스타그램 글쓰기 가이드\n${project.writing_guide_instagram}`);
  }

  // 선택된 주제/아웃라인
  if (content.topic) {
    sections.push(`\n## 선택된 주제 및 아웃라인\n${content.topic}`);
    sections.push('\n위 주제와 아웃라인 구조를 따라 글을 작성해 주세요.');
  }

  // 참고 자료 텍스트
  if (ctx.referenceTexts?.length) {
    sections.push(`\n## 참고 자료\n${ctx.referenceTexts.join('\n---\n')}`);
  }

  // 프로젝트 참고 자료: AI 분석 요약이 있으면 요약 사용, 없으면 원문 텍스트 사용
  if (project.reference_summary) {
    sections.push(`\n## 프로젝트 참고 자료 (AI 분석 요약)\n아래 참고 자료 분석 내용을 반영하여 글을 작성하세요.\n\n${project.reference_summary}`);
  } else if (project.reference_files?.length) {
    const filesWithText = project.reference_files.filter(f => f.extracted_text);
    const filesWithoutText = project.reference_files.filter(f => !f.extracted_text);

    if (filesWithText.length > 0) {
      // 요약 없이 원문 사용 시 길이 제한
      const refTexts = filesWithText.map(f => {
        const text = f.extracted_text!;
        return `### ${f.name}\n${text.length > 3000 ? text.slice(0, 3000) + '\n...(이하 생략)' : text}`;
      }).join('\n\n---\n\n');
      sections.push(`\n## 프로젝트 참고 자료 (내용)\n아래 참고 자료의 내용을 반영하여 글을 작성하세요.\n\n${refTexts}`);
    }
    if (filesWithoutText.length > 0) {
      sections.push(`\n## 추가 참고 자료 파일\n${filesWithoutText.map(f => f.name).join(', ')}`);
    }
  }

  sections.push('\n위 정보를 기반으로 SEO에 최적화된, 독자에게 가치를 전달하는 기본 글을 작성해 주세요. 글쓰기 가이드와 참고 자료를 반드시 참고하세요.');

  return sections.join('\n');
}

export function buildPartialRegenerationPrompt(
  ctx: PromptContext,
  selectedText: string,
  fullText: string,
): string {
  const sections: string[] = [];

  sections.push('당신은 전문 마케팅 콘텐츠 편집자입니다.');
  sections.push('출력은 HTML 형식으로 작성하세요.');

  if (ctx.project.brand_tone) {
    sections.push(`브랜드 톤: ${ctx.project.brand_tone}`);
  }
  if (ctx.project.marketer_style) {
    sections.push(`글쓰기 스타일: ${ctx.project.marketer_style}`);
  }
  if (ctx.project.writing_guide_global) {
    sections.push(`글쓰기 가이드: ${ctx.project.writing_guide_global}`);
  }

  sections.push(`\n## 전체 글 맥락 (참고용)\n${fullText.substring(0, 2000)}`);
  sections.push(`\n## 수정 대상 텍스트\n${selectedText}`);
  sections.push('\n위 텍스트를 같은 맥락과 톤을 유지하면서 더 나은 표현으로 다시 작성해 주세요. 수정된 부분만 출력하세요.');

  return sections.join('\n');
}

export function buildBlogPrompt(ctx: PromptContext): string {
  const { project, content, baseArticle, seoTitle, keywords } = ctx;
  const sections: string[] = [];

  sections.push('당신은 네이버 블로그 SEO 전문가이자 마케팅 콘텐츠 작가입니다.');
  sections.push('기본 글을 네이버 블로그 섹션 형식으로 변환해 주세요. SEO 100점 만점을 목표로 작성합니다.');
  sections.push('각 섹션은 이미지 1장 + 텍스트 본문으로 구성됩니다.');
  sections.push('반드시 아래 JSON 형식으로만 출력하세요. 다른 텍스트는 포함하지 마세요.');
  const primaryKw = keywords?.primary || '가장 핵심이 되는 키워드 1개';
  const secondaryKws = keywords?.secondary?.length
    ? keywords.secondary.map(k => `"${k}"`).join(', ')
    : '"보조 키워드1", "보조 키워드2", "보조 키워드3"';
  const seoTitleHint = seoTitle
    ? `"${seoTitle}" 을 참고하여 SEO 최적화 (15~25자, 핵심 키워드 앞쪽 배치)`
    : '네이버 SEO 최적화 제목 (15~25자, 핵심 키워드 앞쪽 배치)';

  sections.push(`\`\`\`json
{
  "seo_title": "${seoTitleHint}",
  "primary_keyword": "${primaryKw}",
  "secondary_keywords": [${secondaryKws}],
  "sections": [
    { "text": "<h2>섹션 제목</h2><p>본문 HTML 내용</p>", "alt": "이미지 설명 (키워드 포함)", "caption": "이미지 캡션", "image_prompt": "English image generation prompt: style, subject, composition, mood" },
    { "text": "<h3>소제목</h3><p>본문 내용...</p>", "alt": "이미지 설명", "caption": "캡션", "image_prompt": "English image generation prompt for this section" }
  ]
}
\`\`\``);

  sections.push('\n## 네이버 SEO 100점 필수 규칙 (2025-2026 최신 기준)');
  sections.push('');
  sections.push('### 제목 (15점 배점)');
  sections.push('- seo_title: 15~25자. 핵심 키워드를 제목 앞쪽 1/3에 배치하세요.');
  sections.push('- 보조 키워드도 자연스럽게 포함하면 만점.');
  sections.push('');
  sections.push('### 본문 길이 & 키워드 밀도 (25점 배점)');
  sections.push('- 전체 본문 2,000~3,000자 (공백 제외). 이 범위를 반드시 지키세요.');
  sections.push('- 주요 키워드: 본문에 5~6회 자연 반복 (밀도 1~2%). 억지로 넣지 말고 문맥에 녹이세요.');
  sections.push('- 보조 키워드: 각각 1~2회 포함.');
  sections.push('');
  sections.push('### 구조화 (15점 배점)');
  sections.push('- 소제목(H2/H3) 3개 이상 사용하세요. H2 → H3 계층 구조.');
  sections.push('- 각 단락(p 태그) 300~500자로 구성.');
  sections.push('- 리스트(ul/ol) 최소 1개 포함하세요.');
  sections.push('- 전체 6~8개 섹션으로 구성.');
  sections.push('');
  sections.push('### 이미지 (10점 배점)');
  sections.push('- 섹션마다 이미지 1장 = 6~8장. 모든 이미지에 alt 텍스트 필수 (키워드 포함 권장).');
  sections.push('- image_prompt: 각 섹션 내용에 맞는 이미지 생성 프롬프트를 영어로 작성. 스타일, 주제, 구도, 분위기 포함.');
  sections.push('- 사람이 등장하면 East Asian/Korean appearance. 텍스트가 있으면 한글(Korean).');
  sections.push('');
  sections.push('### 첫 문단 임팩트 — D.I.A.+ (10점 배점)');
  sections.push('- 첫 150자 안에 반드시: ① 핵심 키워드 ② 글의 요점/결론 포함.');
  sections.push('- 독자가 첫 문단만 읽어도 글의 가치를 파악할 수 있어야 합니다.');
  sections.push('');
  sections.push('### 검색 의도 매칭 (10점 배점)');
  sections.push('- 제목에 있는 단어가 본문 전체에 자연스럽게 등장해야 합니다.');
  sections.push('- 독자의 질문에 답변하는 구조로 작성 (Q&A 형식 1개 이상 포함 권장).');
  sections.push('- 마지막 섹션에 "결론" 또는 "요약" 또는 "정리" 제목을 포함하세요.');
  sections.push('');
  sections.push('### 모바일 가독성 (10점 배점)');
  sections.push('- 문장 하나당 60자 이내로 작성.');
  sections.push('- 단락 500자 이내.');
  sections.push('');
  sections.push('### 볼드 처리 규칙');
  sections.push('- 핵심 키워드, 중요 수치, 핵심 결론만 <strong> 태그. 섹션당 1~3개만.');
  sections.push('- 제목(h2, h3)에는 볼드 사용 금지. 본문 p 안에서만.');

  // SEO 타이틀 & 키워드 반영
  if (seoTitle || keywords?.primary) {
    sections.push('\n## 사용자 지정 SEO 설정');
    if (seoTitle) {
      sections.push(`- 블로그 제목 참고: "${seoTitle}" (15~25자로 최적화하세요)`);
    }
    if (keywords?.primary) {
      sections.push(`- 주요 키워드: "${keywords.primary}" — 본문에 5~6회, 제목 앞쪽에 배치.`);
    }
    if (keywords?.secondary?.length) {
      sections.push(`- 보조 키워드: ${keywords.secondary.map(k => `"${k}"`).join(', ')} — 각각 1~2회 포함.`);
    }
  }

  sections.push(...buildBrandContext(project));

  if (project.blog_tone_prompt) {
    sections.push(`\n## 블로그 톤 가이드\n${project.blog_tone_prompt}`);
  }
  if (project.writing_guide_blog) {
    sections.push(`\n## 블로그 글쓰기 가이드\n${project.writing_guide_blog}`);
  }

  sections.push(`\n## 컨텐츠 정보\n제목: ${content.title}`);
  if (content.category) sections.push(`카테고리: ${content.category}`);
  if (content.tags?.length) sections.push(`태그: ${content.tags.join(', ')}`);

  if (baseArticle?.body_plain_text) {
    sections.push(`\n## 기본 글 (원문)\n${baseArticle.body_plain_text}`);
  } else if (baseArticle?.body) {
    sections.push(`\n## 기본 글 (원문 HTML)\n${baseArticle.body}`);
  }

  sections.push('\n위 기본 글을 네이버 블로그에 최적화된 섹션 형식으로 변환하세요. SEO 제목과 키워드를 적극 활용하고, 가독성을 높여 주세요.');

  return sections.join('\n');
}

export function buildCardNewsPrompt(ctx: PromptContext): string {
  const { project, content, baseArticle } = ctx;
  const sections: string[] = [];

  sections.push('당신은 인스타그램 카드뉴스 전문 디자이너입니다.');
  sections.push('기본 글을 인스타그램 캐러셀(카드뉴스) 슬라이드로 변환해 주세요.');
  sections.push('반드시 아래 JSON 형식으로만 출력하세요. 다른 텍스트는 포함하지 마세요.');
  sections.push(`\`\`\`json
[
  {
    "text_content": "슬라이드 텍스트 (줄바꿈은 \\n)",
    "background_color": "#hex색상코드",
    "text_style": { "fontSize": 24, "fontWeight": "bold", "textAlign": "center", "color": "#ffffff" }
  }
]
\`\`\``);

  sections.push('\n슬라이드 구성 가이드:');
  sections.push('- 총 5~10장 슬라이드로 구성하세요.');
  sections.push('- 첫 슬라이드: 제목 (임팩트 있게, 큰 폰트)');
  sections.push('- 중간 슬라이드: 핵심 내용 (한 슬라이드에 50자 내외, 간결하게)');
  sections.push('- 마지막 슬라이드: CTA (팔로우/저장/공유 유도)');
  sections.push('- background_color: 브랜드에 맞는 어두운 톤의 hex 색상. 슬라이드마다 다르게.');
  sections.push('- text_style.fontSize: 20~32 사이');
  sections.push('- text_style.fontWeight: "bold" 또는 "normal"');
  sections.push('- text_style.textAlign: "center" 또는 "left"');
  sections.push('- text_style.color: 배경과 대비되는 밝은 색상');

  sections.push(...buildBrandContext(project));

  if (project.instagram_tone_prompt) {
    sections.push(`\n## 인스타그램 톤 가이드\n${project.instagram_tone_prompt}`);
  }
  if (project.writing_guide_instagram) {
    sections.push(`\n## 인스타그램 글쓰기 가이드\n${project.writing_guide_instagram}`);
  }

  sections.push(`\n## 컨텐츠 정보\n제목: ${content.title}`);
  if (content.category) sections.push(`카테고리: ${content.category}`);
  if (content.tags?.length) sections.push(`태그: ${content.tags.join(', ')}`);

  if (baseArticle?.body_plain_text) {
    sections.push(`\n## 기본 글 (원문)\n${baseArticle.body_plain_text}`);
  } else if (baseArticle?.body) {
    sections.push(`\n## 기본 글 (원문 HTML)\n${baseArticle.body}`);
  }

  sections.push('\n위 기본 글을 인스타그램 캐러셀 슬라이드로 변환하세요. 시각적 임팩트와 가독성을 최우선으로.');

  return sections.join('\n');
}

export function buildCardNewsImagePromptsPrompt(ctx: PromptContext): string {
  const { project, content, baseArticle } = ctx;
  const sections: string[] = [];

  sections.push('당신은 인스타그램 카드뉴스 콘텐츠 기획자입니다.');
  sections.push('기본 글을 분석하여 인스타그램 캐러셀 슬라이드별 이미지 생성 프롬프트를 만들어 주세요.');
  sections.push('반드시 아래 JSON 형식으로만 출력하세요. 다른 텍스트는 포함하지 마세요.');
  sections.push(`\`\`\`json
{
  "caption": "인스타그램 캡션: 글 전체 내용을 요약하여 작성 (한국어, 이모지 포함)",
  "hashtags": ["태그1", "태그2", "태그3"],
  "slides": [
    {
      "header": "카테고리/라벨 (5~10자)",
      "title": "메인 제목 (10~15자)",
      "body": "본문 설명 (30~50자)",
      "footer": "CTA 또는 출처 (10~20자)",
      "image_prompt": "English image generation prompt"
    }
  ]
}
\`\`\``);

  sections.push('\n캡션 작성 가이드:');
  sections.push('- 글의 핵심 내용을 빠짐없이 요약하세요. 읽는 사람이 캡션만으로 전체 내용을 파악할 수 있어야 합니다.');
  sections.push('- "궁금하다면 넘겨보세요", "지금 바로 확인하세요" 같은 유도 문구는 쓰지 마세요.');
  sections.push('- 핵심 정보, 수치, 팩트를 구체적으로 나열하세요.');
  sections.push('- 이모지는 구분자 용도로 적절히 사용.');
  sections.push('\n슬라이드 텍스트 규칙 (4-zone 구조):');
  sections.push('- header: 상단 라벨/카테고리. 5~10자. 예: "건강 상식", "STEP 1", "알고 계셨나요?"');
  sections.push('- title: 메인 제목. 15~25자. 해당 슬라이드의 핵심 메시지를 완전한 문장으로.');
  sections.push('- body: 본문 설명. 50~100자. 이미지 없이 텍스트만 읽어도 내용이 완전히 이해되도록 구체적으로 작성. 수치, 이유, 방법 등 핵심 정보를 빠짐없이 포함. 너무 축약하지 말 것.');
  sections.push('- footer: 하단 텍스트. 10~20자. CTA, 출처, 페이지 번호 등.');
  sections.push('- ⚠️ 중요: 전체 슬라이드의 텍스트(title+body)만 순서대로 읽었을 때, 원문의 핵심 내용을 모두 파악할 수 있어야 합니다. 키워드 나열이 아닌 설명형 문장으로 작성하세요.');
  sections.push('- 첫 슬라이드: header=카테고리, title=주목 타이틀, body=글 전체를 요약하는 부제목, footer=브랜드/날짜');
  sections.push('- 마지막 슬라이드: header 생략, title=핵심 요약, body=실천 방법 또는 정리, footer=CTA(팔로우/저장)');
  sections.push('\n슬라이드 이미지 가이드:');
  sections.push('- 총 5~10장 슬라이드로 구성하세요.');
  sections.push('- image_prompt는 반드시 영어로 작성하세요 (이미지 모델 최적화)');
  sections.push('- image_prompt에 포함할 내용: 스타일(illustration, photo, flat design 등), 색상 팔레트, 구도, 분위기, 주요 객체');
  sections.push('- 모든 슬라이드의 이미지 스타일은 일관되게 유지하세요 (같은 색상 팔레트, 같은 일러스트 스타일)');
  sections.push('- Korean context: any text in the image must be in Korean (한글). People should be East Asian / Korean appearance.');

  sections.push(...buildBrandContext(project));

  if (project.instagram_tone_prompt) {
    sections.push(`\n## 인스타그램 톤 가이드\n${project.instagram_tone_prompt}`);
  }
  if (project.instagram_image_style_prompt) {
    sections.push(`\n## 인스타그램 이미지 스타일 가이드\n${project.instagram_image_style_prompt}`);
  }
  if (project.writing_guide_instagram) {
    sections.push(`\n## 인스타그램 글쓰기 가이드\n${project.writing_guide_instagram}`);
  }

  sections.push(`\n## 컨텐츠 정보\n제목: ${content.title}`);
  if (content.category) sections.push(`카테고리: ${content.category}`);
  if (content.tags?.length) sections.push(`태그: ${content.tags.join(', ')}`);

  if (baseArticle?.body_plain_text) {
    sections.push(`\n## 기본 글 (원문)\n${baseArticle.body_plain_text}`);
  } else if (baseArticle?.body) {
    sections.push(`\n## 기본 글 (원문 HTML)\n${baseArticle.body}`);
  }

  sections.push('\n위 기본 글을 분석하여 각 슬라이드별 이미지 생성 프롬프트를 만들어 주세요. 브랜드 아이덴티티와 일관성을 유지하세요.');

  return sections.join('\n');
}

export function buildThreadsPrompt(ctx: PromptContext): string {
  const { project, content, baseArticle } = ctx;
  const sections: string[] = [];

  sections.push('당신은 Threads(스레드) SNS 전문 콘텐츠 작가입니다.');
  sections.push('기본 글을 Threads 스레드 포스트 형식으로 변환해 주세요.');
  sections.push('반드시 아래 JSON 형식으로만 출력하세요. 다른 텍스트는 포함하지 마세요.');
  sections.push(`\`\`\`json
{
  "posts": [
    { "text": "첫 번째 포스트 (훅/도입)", "order": 0 },
    { "text": "두 번째 포스트 (핵심 내용)", "order": 1 },
    { "text": "마지막 포스트 (CTA/마무리)", "order": 2 }
  ]
}
\`\`\``);

  sections.push('\n## 스레드 작성 가이드');
  sections.push('- 전체 3~8개 포스트로 구성하세요.');
  sections.push('- 각 포스트는 500자 이내로 작성하세요.');
  sections.push('- 첫 포스트는 훅(hook): 궁금증을 유발하거나, 강렬한 주장으로 시작하세요.');
  sections.push('- 중간 포스트들은 핵심 내용을 전달하세요. 각각 독립적으로도 읽을 수 있게 작성하세요.');
  sections.push('- 마지막 포스트는 핵심 요약 + CTA(행동 유도)로 마무리하세요.');
  sections.push('- 줄바꿈은 \\n으로 표현하세요.');
  sections.push('- 이모지를 적절히 활용하여 가독성을 높이세요.');
  sections.push('- 해시태그는 마지막 포스트에만 3~5개 포함하세요.');
  sections.push('- 대화하듯 친근한 톤으로 작성하세요.');
  sections.push('- 각 포스트가 다음 포스트로 자연스럽게 이어지도록 구성하세요.');

  sections.push(...buildBrandContext(project));

  if (project.threads_tone_prompt) {
    sections.push(`\n## 스레드 톤 가이드\n${project.threads_tone_prompt}`);
  }
  if (project.writing_guide_threads) {
    sections.push(`\n## 스레드 글쓰기 가이드\n${project.writing_guide_threads}`);
  }

  sections.push(`\n## 컨텐츠 정보\n제목: ${content.title}`);
  if (content.category) sections.push(`카테고리: ${content.category}`);
  if (content.tags?.length) sections.push(`태그: ${content.tags.join(', ')}`);

  if (baseArticle?.body_plain_text) {
    sections.push(`\n## 기본 글 (원문)\n${baseArticle.body_plain_text}`);
  } else if (baseArticle?.body) {
    sections.push(`\n## 기본 글 (원문 HTML)\n${baseArticle.body}`);
  }

  sections.push('\n위 기본 글을 Threads 스레드 형식으로 변환하세요. 핵심 메시지를 임팩트 있게 전달하세요.');

  return sections.join('\n');
}

export function buildBlogImagePromptForCard(
  project: Project,
  cards: BlogCard[],
  cardIndex: number,
  imageStyle: string
): string {
  const currentCard = cards[cardIndex];
  const alt = (currentCard?.content as { alt?: string })?.alt ?? '';
  const style = imageStyle || 'Professional photography, clean and modern';

  const parts: string[] = [];
  parts.push(`${style}.`);

  if (alt) {
    parts.push(alt);
  }

  if (project.blog_image_style_prompt) {
    parts.push(project.blog_image_style_prompt);
  }

  parts.push('High quality, suitable for a professional blog post. No text in the image.');
  parts.push('Korean context: any text shown must be in Korean (한글). People should be East Asian / Korean appearance.');

  return parts.join('\n');
}

export function buildYoutubePrompt(ctx: PromptContext & { youtubeContent?: YoutubeContent }): string {
  const { project, content, baseArticle, youtubeContent } = ctx;
  const sections: string[] = [];

  sections.push('당신은 유튜브 교육/정보 콘텐츠 전문 대본 작가입니다.');
  sections.push('기본 글을 유튜브 영상 대본(스크립트)으로 변환해 주세요.');
  sections.push('반드시 아래 JSON 형식으로만 출력하세요. 다른 텍스트는 포함하지 마세요.');
  sections.push(`\`\`\`json
{
  "video_title": "유튜브 영상 제목 (60자 이내, 호기심 유발)",
  "video_description": "영상 설명 (500자 이내, 핵심 내용 요약 + CTA)",
  "video_tags": ["태그1", "태그2", "태그3"],
  "sections": [
    {
      "section_type": "hook",
      "narration_text": "나레이션 대본 (TTS/나레이터가 읽을 텍스트)",
      "screen_direction": "화면 디렉션 (영상 편집자가 참고할 시각적 지시)",
      "subtitle_text": "자막 텍스트 (짧게, 핵심만)"
    }
  ]
}
\`\`\``);

  sections.push('\n## 섹션 타입 가이드');
  sections.push('- **hook**: 첫 5초, 시청자 이탈 방지용 강렬한 도입');
  sections.push('- **intro**: 영상 소개, 채널 소개 (10~15초)');
  sections.push('- **main**: 핵심 내용 전달 (여러 개 가능)');
  sections.push('- **example**: 구체적 사례, 시연, 비유');
  sections.push('- **summary**: 핵심 요약 정리');
  sections.push('- **cta**: 구독/좋아요/알림 유도 + 다음 영상 예고');

  // 영상 길이별 가이드
  const duration = youtubeContent?.target_duration ?? 'mid';
  sections.push('\n## 영상 길이 가이드');
  if (duration === 'short') {
    sections.push('- 타겟: 1~3분 (숏폼/숏츠 스타일)');
    sections.push('- 섹션 3~5개, 각 나레이션 50~100자');
    sections.push('- hook + main 1~2개 + cta로 압축');
  } else if (duration === 'mid') {
    sections.push('- 타겟: 5~10분 (표준 유튜브)');
    sections.push('- 섹션 5~8개, 각 나레이션 100~300자');
    sections.push('- hook → intro → main 3~5개 → summary → cta');
  } else {
    sections.push('- 타겟: 15~30분 (딥다이브/강의형)');
    sections.push('- 섹션 8~15개, 각 나레이션 200~500자');
    sections.push('- hook → intro → main + example 반복 → summary → cta');
  }

  sections.push('\n## 대본 작성 규칙');
  sections.push('- narration_text: 실제 말하듯 자연스럽게. 구어체 사용.');
  sections.push('- screen_direction: 화면에 보여줄 것을 구체적으로 (B-roll, 텍스트 오버레이, 그래프, 이미지 등)');
  sections.push('- subtitle_text: 나레이션의 핵심만 추출한 짧은 자막');
  sections.push('- 각 섹션이 자연스럽게 이어지도록 연결어 활용');
  sections.push('- 시청자에게 질문하는 형식으로 몰입도 높이기');

  sections.push(...buildBrandContext(project));

  if (project.youtube_tone_prompt) {
    sections.push(`\n## 유튜브 톤 가이드\n${project.youtube_tone_prompt}`);
  }
  if (project.writing_guide_youtube) {
    sections.push(`\n## 유튜브 글쓰기 가이드\n${project.writing_guide_youtube}`);
  }

  // 기존 영상 정보 반영
  if (youtubeContent?.video_title) {
    sections.push(`\n## 영상 제목 (참고)\n${youtubeContent.video_title}`);
  }

  sections.push(`\n## 컨텐츠 정보\n제목: ${content.title}`);
  if (content.category) sections.push(`카테고리: ${content.category}`);
  if (content.tags?.length) sections.push(`태그: ${content.tags.join(', ')}`);

  if (baseArticle?.body_plain_text) {
    sections.push(`\n## 기본 글 (원문)\n${baseArticle.body_plain_text}`);
  } else if (baseArticle?.body) {
    sections.push(`\n## 기본 글 (원문 HTML)\n${baseArticle.body}`);
  }

  sections.push('\n위 기본 글을 유튜브 영상 대본으로 변환하세요. 시청자의 주의를 끌고, 끝까지 시청하게 만드는 구조로 작성하세요.');

  return sections.join('\n');
}

/**
 * 유튜브 씬별 **이미지** 생성 프롬프트.
 * screen_direction(영상 편집 지시)이 아닌, 정지 이미지에 적합한 시각적 묘사를 생성.
 */
export function buildYoutubeImagePrompt(
  project: Project,
  card: YoutubeCard,
  imageStyle: string
): string {
  const parts: string[] = [];
  const style = imageStyle || 'Cinematic photography, professional lighting, high quality';

  parts.push(`${style}.`);

  // subtitle_text가 씬의 핵심 주제를 가장 간결하게 담고 있음
  if (card.subtitle_text) {
    parts.push(`Subject: ${card.subtitle_text}`);
  }

  // section_type에 따른 이미지 분위기 힌트
  const moodMap: Record<string, string> = {
    hook: 'Eye-catching, dramatic, attention-grabbing composition',
    intro: 'Clean, welcoming, professional establishing shot',
    main: 'Detailed, informative, clear visual explanation',
    example: 'Real-world scenario, demonstration, practical illustration',
    summary: 'Overview, key takeaway, clean summary visual',
    cta: 'Warm, inviting, call-to-action mood, engaging',
  };
  if (card.section_type && moodMap[card.section_type]) {
    parts.push(moodMap[card.section_type]);
  }

  if (project.youtube_image_style_prompt) {
    parts.push(project.youtube_image_style_prompt);
  }

  parts.push('Wide angle, 16:9 composition, suitable for YouTube video scene.');
  parts.push('IMPORTANT: Do NOT include any text, titles, subtitles, captions, watermarks, or letters in the image. The image must be purely visual with no written content whatsoever.');
  parts.push('Korean context: people should be East Asian / Korean appearance.');

  return parts.join('\n');
}

/**
 * 유튜브 씬별 **영상** 생성 프롬프트.
 * screen_direction(화면 디렉션)을 기반으로 모션/동작이 포함된 영상 지시를 생성.
 */
export function buildYoutubeVideoPrompt(
  project: Project,
  card: YoutubeCard,
  imageStyle: string
): string {
  const parts: string[] = [];
  const style = imageStyle || 'Cinematic, professional video production';

  parts.push(`${style}.`);

  if (card.screen_direction) {
    parts.push(`Scene direction: ${card.screen_direction}`);
  }

  if (card.narration_text) {
    const summary = card.narration_text.slice(0, 150);
    parts.push(`Narration context: ${summary}`);
  }

  if (card.subtitle_text) {
    parts.push(`Scene context: ${card.subtitle_text}`);
  }

  // section_type에 따른 영상 모션 힌트
  const motionMap: Record<string, string> = {
    hook: 'Fast-paced, dynamic camera movement, quick cuts',
    intro: 'Slow zoom in, smooth establishing shot, steady camera',
    main: 'Medium paced, mix of close-ups and wide shots, b-roll transitions',
    example: 'Screen recording style, step-by-step demonstration, highlight animations',
    summary: 'Gentle zoom out, recap montage, clean transitions',
    cta: 'Upbeat, animated elements, subscribe button animation, bright ending',
  };
  if (card.section_type && motionMap[card.section_type]) {
    parts.push(`Motion: ${motionMap[card.section_type]}`);
  }

  if (project.youtube_image_style_prompt) {
    parts.push(project.youtube_image_style_prompt);
  }

  parts.push('16:9 video composition. Smooth camera movement, professional production quality.');
  parts.push('IMPORTANT: Do NOT include any text, titles, subtitles, captions, watermarks, or letters in the video. The video must be purely visual.');
  parts.push('Korean context: people should be East Asian / Korean appearance.');

  return parts.join('\n');
}
