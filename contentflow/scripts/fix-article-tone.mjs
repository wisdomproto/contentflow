import { createClient } from '@supabase/supabase-js';

const s = createClient(
  'https://hpjvtphijdaketuqtpep.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwanZ0cGhpamRha2V0dXF0cGVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA3MTQwMSwiZXhwIjoyMDkwNjQ3NDAxfQ.De4vH6MOSceauQ2v49L6IkxaB07i1zNt8en6576fpd4'
);
import { readFileSync } from 'fs';
const envFile = readFileSync('.env.local', 'utf-8');
const GEMINI_KEY = envFile.match(/GEMINI_API_KEY=(.+)/)?.[1]?.trim();
const PROJECT_ID = '6cc3c9c6-1718-4097-b7a0-0f95ae74d913';

const BAD_PATTERNS = [
  /187성장클리닉/g,
  /원장(님)?의?\s*책/g,
  /책\s*내용을?\s*바탕/g,
  /원장(님)?의?\s*(임상|설명|경험)/g,
  /원장(님)?이?\s*직접/g,
  /원장(님)?께서/g,
  /소아\s*성장\s*전문의의\s*입장/g,
  /알려드리겠습니다/g,
  /설명해\s*드리고자/g,
  /말씀드리겠습니다/g,
  /저희\s*(클리닉|병원)/g,
  /우리\s*클리닉/g,
  /클리닉\s*현장/g,
];

function hasBadPatterns(text) {
  return BAD_PATTERNS.some(p => new RegExp(p.source).test(text));
}

async function fixArticle(body) {
  const prompt = `당신은 소아 성장 전문가(의사)입니다. 아래 블로그 글에서 톤을 수정하세요.

## 수정 규칙 (반드시 지킬 것)
1. "187성장클리닉", "원장님", "원장", "저희 클리닉", "우리 클리닉" 등 특정 병원/의사를 지칭하는 표현을 모두 제거
2. "원장님의 책 내용을 바탕으로" → 삭제하거나 "임상 경험을 바탕으로" 등으로 대체
3. "~알려드리겠습니다", "~설명해 드리고자 합니다" → "~알아보겠습니다", "~살펴보겠습니다" 등 전문가가 직접 설명하는 톤으로
4. "187성장클리닉에서는 ~ 강조합니다" → "성장 전문가들은 ~ 강조합니다" 또는 해당 문장 자체를 자연스럽게 재작성
5. 전체적으로 '성장 전문 의사가 직접 쓴 전문 블로그' 톤 유지
6. 내용, 구조, HTML 태그는 절대 변경하지 말 것. 톤만 수정.
7. 글자 수를 줄이지 말 것. 비슷한 분량 유지.

## 원본 글
${body}

## 출력
수정된 글만 출력하세요. 설명이나 주석 없이 글 본문만.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 8000 },
      }),
    }
  );
  const result = await res.json();
  if (result.error) throw new Error(result.error.message);
  let text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  text = text.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
  return text;
}

async function main() {
  const { data: contents } = await s.from('contents')
    .select('id, topic, category')
    .eq('project_id', PROJECT_ID)
    .order('topic');

  const { data: articles } = await s.from('base_articles').select('id, content_id, body');
  const topicMap = new Map(contents?.map(c => [c.id, c.topic]) || []);
  const artMap = new Map(articles?.map(a => [a.content_id, a]) || []);

  // Find articles that need fixing (skip C. 치료사례 — intentionally promotes clinic)
  const needsFix = [];
  for (const c of contents || []) {
    if (c.category === 'C. 치료사례') continue; // C cases keep clinic branding
    const art = artMap.get(c.id);
    if (!art?.body) continue;
    if (hasBadPatterns(art.body)) {
      needsFix.push({ topic: c.topic, contentId: c.id, artId: art.id, body: art.body });
    }
  }

  console.log(`\n🔧 톤 수정 시작: ${needsFix.length}개 / 전체 ${contents?.length}개\n`);

  let success = 0, fail = 0;
  for (let i = 0; i < needsFix.length; i++) {
    const item = needsFix[i];
    process.stdout.write(`[${i + 1}/${needsFix.length}] ${item.topic}...`);

    try {
      const fixed = await fixArticle(item.body);
      if (!fixed || fixed.length < item.body.length * 0.5) {
        console.log(` ⚠️ 너무 짧음 (${fixed.length} vs ${item.body.length})`);
        fail++;
        continue;
      }

      // Check if bad patterns are gone
      const stillBad = hasBadPatterns(fixed);
      const plain = fixed.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

      await s.from('base_articles').update({
        body: fixed,
        body_plain_text: plain,
        word_count: plain.length,
        updated_at: new Date().toISOString(),
      }).eq('id', item.artId);

      console.log(` ✅ ${plain.length}자${stillBad ? ' ⚠️ 일부 패턴 잔존' : ''}`);
      success++;
    } catch (err) {
      console.log(` ❌ ${err.message}`);
      fail++;
    }

    if (i < needsFix.length - 1) await new Promise(r => setTimeout(r, 5000));
  }

  // Final check
  console.log(`\n🏁 완료! 성공: ${success} / 실패: ${fail}`);

  // Verify
  const { data: updated } = await s.from('base_articles').select('content_id, body');
  let remaining = 0;
  for (const a of updated || []) {
    if (topicMap.has(a.content_id) && hasBadPatterns(a.body || '')) remaining++;
  }
  console.log(`남은 문제 기사: ${remaining}개`);
}

main().catch(e => console.error(e));
