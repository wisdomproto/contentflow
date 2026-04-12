import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = 'https://hpjvtphijdaketuqtpep.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwanZ0cGhpamRha2V0dXF0cGVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA3MTQwMSwiZXhwIjoyMDkwNjQ3NDAxfQ.De4vH6MOSceauQ2v49L6IkxaB07i1zNt8en6576fpd4';
const GEMINI_KEY = 'AIzaSyDZc3rwia0qorTKYSmhV2dH3DZYdhi8LME';
const MODEL = 'gemini-2.5-flash';
const PROJECT_ID = '6cc3c9c6-1718-4097-b7a0-0f95ae74d913';

const s = createClient(SUPABASE_URL, SUPABASE_KEY);

const CATEGORY_CONTEXT = {
  'A. 성장과학': '성장 의학/과학 지식을 쉽게 풀어 설명하는 정보형 콘텐츠입니다. 의학적 근거를 바탕으로 부모님이 이해하기 쉽게 작성합니다.',
  'B. 부모공감': '부모님의 걱정과 고민에 공감하면서 전문의 시각으로 답변하는 콘텐츠입니다. Q&A 형식이나 고민 해결형으로 작성합니다.',
  'D. 생활습관': '키 성장에 도움이 되는 실질적인 생활 습관 가이드입니다. 수면, 식단, 운동, 자세 등 실천 가능한 팁 위주로 작성합니다.',
  'E. 기타/트렌드': '시즌별 이슈, 통계, 트렌드 등 시의성 있는 콘텐츠입니다. 최신 데이터와 흥미로운 관점으로 작성합니다.',
};

async function generateArticle(content) {
  const catContext = CATEGORY_CONTEXT[content.category] || '';
  const angle = content.memo || ''; // memo stores the content angle
  const keywords = content.tags?.join(', ') || '';

  const prompt = `당신은 소아 성장 전문 클리닉(187성장클리닉)의 블로그 에디터입니다. 원장님의 책 내용을 바탕으로 네이버 블로그용 글을 작성하세요.

## 콘텐츠 정보
- 제목: ${content.title}
- 카테고리: ${content.category}
- 콘텐츠 성격: ${catContext}
- 글쓰기 앵글: ${angle}
- 핵심 키워드: ${keywords}
- 토픽 ID: ${content.topic}

## 187성장클리닉 소개
- 소아 성장/성조숙증 전문 클리닉
- 뼈나이 분석, 성장호르몬 치료, 생활습관 코칭
- 국내외 환자 진료 (의료관광 포함)
- 원장: 소아성장 전문의

## 작성 규칙
1. 순수 텍스트만 출력 (HTML 태그 절대 금지, 마크다운 절대 금지, 코드블록 금지)
2. 첫 줄에 매력적인 제목 (검색에 잘 걸리도록)
3. 소제목은 ■ 기호 사용 (예: ■ 성장호르몬이란?)
4. 단락 구분은 빈 줄로
5. 1500~2500자
6. 부모님 눈높이에 맞는 쉬운 설명
7. 의학적 근거 + 실제 임상 경험 기반
8. 과장 금지, 의료 광고법 준수
9. 마지막에 "※ 본 글은 의학적 정보 제공을 목적으로 하며, 개인마다 차이가 있을 수 있습니다."
10. 네이버 SEO를 위해 핵심 키워드를 자연스럽게 3~5회 반복

순수 텍스트만 출력하세요.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 5000 },
      }),
    }
  );
  const result = await res.json();
  if (result.error) throw new Error(result.error.message);
  let text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  text = text.replace(/```[a-z]*\n?/g, '').replace(/```\n?/g, '').trim();
  return text;
}

async function main() {
  // Get contents without base articles
  const { data: allContents } = await s.from('contents')
    .select('id, title, topic, category, memo, tags')
    .eq('project_id', PROJECT_ID)
    .order('sort_order');

  const { data: existingArticles } = await s.from('base_articles').select('content_id, word_count');
  const hasArticle = new Set(
    existingArticles?.filter(a => a.word_count > 100).map(a => a.content_id) || []
  );

  const needsGen = allContents?.filter(c => !hasArticle.has(c.id)) || [];
  console.log(`\n📝 기본글 생성 시작: ${needsGen.length}개 / 전체 ${allContents?.length}개\n`);

  let success = 0, fail = 0;
  for (let i = 0; i < needsGen.length; i++) {
    const content = needsGen[i];
    const progress = `[${i + 1}/${needsGen.length}]`;
    process.stdout.write(`${progress} ${content.topic} ${content.title.substring(0, 40)}...`);

    try {
      const article = await generateArticle(content);
      if (!article || article.length < 100) {
        console.log(` ⚠️ 너무 짧음 (${article.length}자)`);
        fail++;
        continue;
      }

      // Upsert base_article
      const existing = await s.from('base_articles').select('id').eq('content_id', content.id).limit(1);
      if (existing.data?.length) {
        await s.from('base_articles').update({
          body: article, body_plain_text: article, word_count: article.length,
          updated_at: new Date().toISOString(),
        }).eq('content_id', content.id);
      } else {
        await s.from('base_articles').insert({
          id: crypto.randomUUID(), content_id: content.id,
          body: article, body_plain_text: article, word_count: article.length,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        });
      }

      console.log(` ✅ ${article.length}자`);
      success++;
    } catch (err) {
      console.log(` ❌ ${err.message}`);
      fail++;
    }

    // Rate limit: 3s between calls
    if (i < needsGen.length - 1) await new Promise(r => setTimeout(r, 3000));
  }

  console.log(`\n🏁 완료! 성공: ${success} / 실패: ${fail} / 전체: ${needsGen.length}`);
}

main().catch(e => console.error(e));
