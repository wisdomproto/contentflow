import * as cheerio from 'cheerio';
import type { ImportedKeyword, ImportedCategory, ImportedTopic } from '@/types/analytics';
import { generateId } from './utils';

interface ParseResult {
  keywords: ImportedKeyword[];
  categories: ImportedCategory[];
}

/**
 * 마케팅 전략 HTML에서 키워드, 카테고리, 주제를 추출합니다.
 *
 * 데이터 소스 우선순위:
 * 1. <script> 내 JS 배열 (kwData, topics) — 동적 렌더링 HTML용
 * 2. <table> 내 정적 HTML 행 — 서버 렌더링 HTML용
 */
export function parseStrategyHtml(html: string): ParseResult {
  const $ = cheerio.load(html);

  // 지원하는 HTML 형식인지 검증
  const hasKwTable = $('table.kw-table').length > 0;
  const hasTopicTable = $('table.topic-table').length > 0;
  const hasCycleItems = $('.cycle-item').length > 0;
  const hasScriptData = html.includes('const kwData=') || html.includes('const topics=');

  if (!hasKwTable && !hasTopicTable && !hasCycleItems && !hasScriptData) {
    throw new Error('지원하지 않는 HTML 형식입니다. 마케팅 전략 HTML 파일이 필요합니다.');
  }

  let keywords: ImportedKeyword[] = [];
  const topicsByCategory: Record<string, ImportedTopic[]> = {};

  // === 1단계: <script> 내 JS 배열에서 추출 시도 ===
  keywords = parseKeywordsFromScript(html);
  const scriptTopics = parseTopicsFromScript(html);
  for (const [catCode, topics] of Object.entries(scriptTopics)) {
    topicsByCategory[catCode] = topics;
  }

  // === 2단계: JS 배열이 없으면 정적 HTML 테이블에서 추출 ===
  if (keywords.length === 0) {
    keywords = parseKeywordsFromTable($);
  }
  if (Object.keys(topicsByCategory).length === 0) {
    const tableTopics = parseTopicsFromTable($);
    for (const [catCode, topics] of Object.entries(tableTopics)) {
      topicsByCategory[catCode] = topics;
    }
  }

  // === 3단계: 카테고리 순환 (.cycle-item) 파싱 ===
  const categories: ImportedCategory[] = [];

  $('.cycle-item').each((_, el) => {
    const code = $(el).find('.cycle-letter').text().trim();
    const name = $(el).find('.cycle-name').text().trim();
    const description = $(el).find('.cycle-desc').text().trim();
    if (!code || !name) return;

    categories.push({
      code,
      name,
      description,
      topics: topicsByCategory[code] ?? [],
    });
  });

  // 카테고리 없이 주제만 있는 경우 fallback
  if (categories.length === 0 && Object.keys(topicsByCategory).length > 0) {
    for (const [code, topics] of Object.entries(topicsByCategory)) {
      categories.push({
        code,
        name: code,
        description: '',
        topics,
      });
    }
  }

  return { keywords, categories };
}

// ---- JS 배열 파싱 ----

function parseKeywordsFromScript(html: string): ImportedKeyword[] {
  // const kwData=[[...],[...],...]; 패턴에서 배열 추출
  const match = html.match(/const\s+kwData\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) return [];

  try {
    const data = JSON.parse(match[1]) as unknown[][];
    return data.map(row => {
      // [키워드, PC검색, 모바일검색, 총검색, 경쟁도, 분류태그]
      const keyword = String(row[0] ?? '');
      const totalSearch = Number(row[3]) || 0;
      const compStr = String(row[4] ?? '');
      const tags = String(row[5] ?? '');

      let competition: 'high' | 'medium' | 'low' = 'medium';
      if (compStr === '높음') competition = 'high';
      else if (compStr === '낮음') competition = 'low';

      const isGolden = tags.includes('gold');
      const category = tags || undefined;

      return { keyword, totalSearch, competition, isGolden, category };
    }).filter(k => k.keyword);
  } catch {
    return [];
  }
}

function parseTopicsFromScript(html: string): Record<string, ImportedTopic[]> {
  // const topics=[[...],[...],...]; 패턴에서 배열 추출
  const match = html.match(/const\s+topics\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) return {};

  const result: Record<string, ImportedTopic[]> = {};

  try {
    const data = JSON.parse(match[1]) as string[][];
    for (const row of data) {
      // [ID, 카테고리코드, 제목, 앵글, 키워드문자열, 출처]
      const id = String(row[0] ?? '');
      const catCode = String(row[1] ?? '');
      const title = String(row[2] ?? '');
      const angle = String(row[3] ?? '');
      const kwString = String(row[4] ?? '');
      if (!title || !catCode) continue;

      const keywords = kwString.split(',').map(s => s.trim()).filter(Boolean);

      if (!result[catCode]) result[catCode] = [];
      result[catCode].push({
        id: id || generateId('topic'),
        title,
        angle,
        keywords,
        channels: [],
        status: 'new',
      });
    }

    // ytRows에서 상태 업데이트
    const ytMatch = html.match(/const\s+ytRows\s*=\s*(\[[\s\S]*?\]);/);
    if (ytMatch) {
      try {
        const ytData = JSON.parse(ytMatch[1]) as string[][];
        for (const row of ytData) {
          const topicId = String(row[0] ?? '');
          const status = String(row[1] ?? 'new');
          const catCode = topicId.charAt(0);

          if (result[catCode]) {
            const topic = result[catCode].find(t => t.id === topicId);
            if (topic) {
              topic.status = status as 'new' | 'done' | 'similar';
            }
          }
        }
      } catch { /* ignore */ }
    }
  } catch {
    return {};
  }

  return result;
}

// ---- 정적 HTML 테이블 파싱 (fallback) ----

function parseKeywordsFromTable($: cheerio.CheerioAPI): ImportedKeyword[] {
  const keywords: ImportedKeyword[] = [];

  $('table.kw-table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 4) return;

    const keyword = $(cells[0]).text().trim();
    if (!keyword) return;

    const searchText = $(cells[1]).text().replace(/,/g, '').trim();
    const totalSearch = parseInt(searchText, 10) || 0;

    const compEl = $(cells[3]).find('.comp-badge');
    let competition: 'high' | 'medium' | 'low' = 'medium';
    if (compEl.hasClass('comp-high')) competition = 'high';
    else if (compEl.hasClass('comp-low')) competition = 'low';

    const isGolden = $(row).find('.s-gold').length > 0 ||
      $(row).attr('data-cat') === 'gold';

    const categoryBadge = $(row).find('.sbadge').first().text().trim();

    keywords.push({
      keyword,
      totalSearch,
      competition,
      isGolden,
      category: categoryBadge || undefined,
    });
  });

  return keywords;
}

function parseTopicsFromTable($: cheerio.CheerioAPI): Record<string, ImportedTopic[]> {
  const result: Record<string, ImportedTopic[]> = {};

  $('table.topic-table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 3) return;

    const catPill = $(cells[1]).find('.cat-pill').first();
    const catCode = catPill.text().trim().charAt(0);
    const title = $(cells[2]).text().trim();
    if (!title) return;

    const kwTags: string[] = [];
    $(cells[3]).find('.kw-tag').each((_, el) => {
      kwTags.push($(el).text().trim());
    });

    let status: 'new' | 'done' | 'similar' = 'new';
    if ($(row).find('.s-done').length > 0) status = 'done';
    else if ($(row).find('.s-similar').length > 0) status = 'similar';

    if (!result[catCode]) result[catCode] = [];
    result[catCode].push({
      id: generateId('topic'),
      title,
      keywords: kwTags,
      channels: [],
      status,
    });
  });

  return result;
}
