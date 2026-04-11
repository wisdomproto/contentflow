import { NextRequest, NextResponse } from 'next/server';
import * as mammoth from 'mammoth';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
    }

    const name = file.name.toLowerCase();
    const arrayBuf = await file.arrayBuffer();

    // PDF
    if (name.endsWith('.pdf')) {
      const { extractText } = await import('unpdf');
      const result = await extractText(Buffer.from(arrayBuf));
      const text = Array.isArray(result.text) ? result.text.join('\n') : result.text;
      return NextResponse.json({ text: text || '' });
    }

    // DOCX / DOC
    if (name.endsWith('.docx') || name.endsWith('.doc')) {
      const result = await mammoth.extractRawText({ buffer: Buffer.from(arrayBuf) });
      return NextResponse.json({ text: result.value || '' });
    }

    // Plain text
    const textExts = ['.txt', '.md', '.markdown', '.csv', '.json', '.xml', '.html'];
    if (textExts.some(ext => name.endsWith(ext))) {
      const text = new TextDecoder().decode(arrayBuf);
      return NextResponse.json({ text });
    }

    return NextResponse.json({ text: '', unsupported: true });
  } catch (err) {
    console.error('[extract-text]', err);
    const msg = err instanceof Error ? err.message : '텍스트 추출 오류';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
