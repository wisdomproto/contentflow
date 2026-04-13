import fs from 'fs';
import * as cheerio from 'cheerio';

const filePath = process.argv[2];
if (!filePath) { console.log('Usage: node scripts/extract-html-text.mjs <file.html>'); process.exit(1); }

const html = fs.readFileSync(filePath, 'utf-8');
const $ = cheerio.load(html);

$('img, script, style, svg, noscript').remove();

let output = '';

function extractText(el) {
  $(el).children().each(function() {
    const tag = this.tagName?.toLowerCase();
    const $el = $(this);
    const directText = $el.clone().children().remove().end().text().trim();

    if (['h1','h2','h3','h4','h5','h6'].includes(tag)) {
      const t = $el.text().trim();
      if (t) output += '\n\n' + '#'.repeat(parseInt(tag[1])) + ' ' + t + '\n';
    } else if (tag === 'table') {
      output += '\n\n[표]\n';
      $el.find('tr').each(function() {
        const cells = [];
        $(this).find('td, th').each(function() {
          cells.push($(this).text().trim().replace(/\s+/g, ' '));
        });
        if (cells.some(c => c)) output += cells.join(' | ') + '\n';
      });
    } else if (tag === 'ul' || tag === 'ol') {
      $el.children('li').each(function() {
        const t = $(this).text().trim();
        if (t) output += '\n- ' + t;
      });
      output += '\n';
    } else if (tag === 'p') {
      const t = $el.text().trim();
      if (t && t.length > 2) output += '\n' + t + '\n';
    } else {
      if (directText && directText.length > 2) output += '\n' + directText;
      extractText(this);
    }
  });
}

extractText($('body')[0] || $('html')[0]);
output = output.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();

const outPath = filePath.replace(/\.html?$/i, '.txt');
fs.writeFileSync(outPath, output, 'utf-8');
console.log('Done:', output.length, 'chars →', outPath);
console.log('\n--- First 3000 chars ---\n');
console.log(output.substring(0, 3000));
