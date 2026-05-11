import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

const TEMPLATE_DIR = path.join(process.cwd(), 'public', 'strategy-templates');

export async function GET() {
  try {
    const files = await fs.readdir(TEMPLATE_DIR);
    const html = files.filter((f) => f.endsWith('.html'));

    const items = await Promise.all(
      html.map(async (filename) => {
        const full = path.join(TEMPLATE_DIR, filename);
        const stat = await fs.stat(full);
        const head = (await fs.readFile(full, 'utf-8')).slice(0, 4000);
        const titleMatch = head.match(/<meta\s+name=["']title["']\s+content=["']([^"']+)["']/i)
          || head.match(/<title>([^<]+)<\/title>/i);
        const descMatch = head.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
        return {
          filename,
          title: titleMatch?.[1] ?? filename,
          description: descMatch?.[1] ?? '',
          size: stat.size,
          modifiedAt: stat.mtime.toISOString(),
          url: `/strategy-templates/${filename}`,
        };
      })
    );

    items.sort((a, b) => a.title.localeCompare(b.title));
    return NextResponse.json({ templates: items });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message, templates: [] },
      { status: 500 }
    );
  }
}
