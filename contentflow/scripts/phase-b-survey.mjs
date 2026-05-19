// One-shot read-only survey: what's in 187 project for Phase B planning.
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
const PROJECT_ID = '6cc3c9c6-1718-4097-b7a0-0f95ae74d913';

const { data: contents } = await supa
  .from('contents').select('id, title, category, sort_order').eq('project_id', PROJECT_ID);
const ids = contents.map(c => c.id);

const { data: bases } = await supa
  .from('base_articles').select('content_id, body_plain_text').in('content_id', ids);
const { data: trans } = await supa
  .from('translations').select('content_id, language, channel_type, status').in('content_id', ids);
const { data: blogs } = await supa
  .from('blog_contents').select('content_id, seo_title, url_slug, meta_description, primary_keyword, secondary_keywords').in('content_id', ids);

console.log(`Total contents: ${contents.length}`);
const cats = {};
for (const c of contents) cats[c.category] = (cats[c.category] || 0) + 1;
console.log('By category:', cats);

console.log(`\nBase articles (ko): ${bases.length}`);
const baseCharStats = bases.map(b => (b.body_plain_text || '').length);
const avg = (baseCharStats.reduce((a, b) => a + b, 0) / baseCharStats.length).toFixed(0);
console.log(`  avg chars: ${avg}`);

console.log(`\nTranslations: ${trans.length} total`);
const byLangChannel = {};
for (const t of trans) {
  const k = `${t.language}:${t.channel_type}:${t.status}`;
  byLangChannel[k] = (byLangChannel[k] || 0) + 1;
}
console.log(byLangChannel);

console.log(`\nBlog_contents (SEO meta): ${blogs.length}`);
const withSlug = blogs.filter(b => b.url_slug).length;
const withDesc = blogs.filter(b => b.meta_description).length;
const withKw = blogs.filter(b => b.primary_keyword).length;
console.log(`  with slug: ${withSlug} / with meta_desc: ${withDesc} / with primary_kw: ${withKw}`);

console.log(`\nSample first content blog_contents:`);
console.log(JSON.stringify(blogs[0], null, 2));
