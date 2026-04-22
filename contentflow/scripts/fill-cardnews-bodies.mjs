import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const rawLine of env.split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith('#')) continue;
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
}

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const IG_CONTENT_ID = 'ef37901a-0ceb-4dc0-ac00-e765859d57f9'; // 187 성장클리닉 / A-01 / 카드뉴스 1

// Bodies by sort_order (0-indexed)
const BODIES = [
  /* 0 */ '"유전 80%"는 부모 키가 아이 키의 80%를 정한다는 뜻이 아닙니다. 통계적 "유전율" 개념일 뿐, 실제 의미는 완전히 다릅니다.',
  /* 1 */ '부모에게 받은 건 "최종 키"가 아니라 "도달 가능한 상한선". 이 잠재력까지 닿느냐는 완전히 다른 문제입니다.',
  /* 2 */ '같은 잠재력이라도 생활 습관·건강 관리에 따라 최종 키가 5~10cm 이상 벌어집니다. 환경이 진짜 변수입니다.',
  /* 3 */ '✓균형 영양  ✓8~10시간 수면  ✓줄넘기·스트레칭  ✓스트레스 관리 — 이 4가지가 잠재력을 현실로 바꿉니다.',
  /* 4 */ '부모가 작아도 성장 환경을 최적화하면 예상키를 넘기는 사례가 임상에서 드물지 않습니다. 유전은 출발선일 뿐입니다.',
  /* 5 */ '뼈나이·성장호르몬 검사로 남은 잠재력과 부족한 요소를 정확히 파악. 감이 아닌 데이터로 관리합니다.',
  /* 6 */ '유전은 방향을 정하지만, 환경은 결과를 바꿉니다. 오늘의 관심과 전문가 도움으로 아이의 키는 더 커질 수 있습니다.',
];

const { data: cards, error } = await supa
  .from('instagram_cards')
  .select('*')
  .eq('instagram_content_id', IG_CONTENT_ID)
  .order('sort_order', { ascending: true });

if (error) { console.error(error); process.exit(1); }
if (!cards?.length) { console.log('no cards'); process.exit(0); }

console.log(`Updating ${cards.length} cards...`);
for (const card of cards) {
  const i = card.sort_order;
  const body = BODIES[i];
  if (!body) { console.log(`  [${i}] skip (no body defined)`); continue; }

  const style = card.text_style ?? {};
  if (!Array.isArray(style.textBlocks)) {
    console.log(`  [${i}] skip (no textBlocks)`);
    continue;
  }

  // Update body block only, preserve everything else
  const newBlocks = style.textBlocks.map(b =>
    b.id === 'body' ? { ...b, text: body, hidden: false } : b
  );
  const newStyle = { ...style, textBlocks: newBlocks };

  // Rebuild text_content from all visible blocks
  const newTextContent = newBlocks
    .filter(b => !b.hidden && b.text)
    .map(b => b.text)
    .join('\n') || null;

  const { error: upErr } = await supa
    .from('instagram_cards')
    .update({
      text_style: newStyle,
      text_content: newTextContent,
      updated_at: new Date().toISOString(),
    })
    .eq('id', card.id);

  if (upErr) console.error(`  [${i}] FAIL:`, upErr.message);
  else console.log(`  [${i}] OK — body: ${body.substring(0, 40)}... (${body.length} chars)`);
}

console.log('\nDone.');
