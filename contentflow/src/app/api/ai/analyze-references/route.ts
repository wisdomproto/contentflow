import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import * as mammoth from 'mammoth';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DEFAULT_ANALYSIS_MODEL } from '@/lib/ai-models';

interface FileInfo {
  name: string;
  content?: string;
  url?: string;
  r2_key?: string;
}

const TEXT_EXTS = ['.txt', '.md', '.markdown', '.csv', '.json', '.xml', '.html'];

async function extractTextFromUrl(name: string, url: string): Promise<string | null> {
  const lowerName = name.toLowerCase();

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();

    // PDF
    if (lowerName.endsWith('.pdf')) {
      const { extractText } = await import('unpdf');
      const result = await extractText(Buffer.from(arrayBuf));
      const text = Array.isArray(result.text) ? result.text.join('\n') : result.text;
      return text || null;
    }

    // DOCX
    if (lowerName.endsWith('.docx') || lowerName.endsWith('.doc')) {
      const result = await mammoth.extractRawText({ buffer: Buffer.from(arrayBuf) });
      return result.value || null;
    }

    // Plain text
    if (TEXT_EXTS.some(ext => lowerName.endsWith(ext))) {
      return new TextDecoder().decode(arrayBuf);
    }

    return null;
  } catch (err) {
    console.error(`[analyze-references] Failed to extract text from ${name}:`, err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' }, { status: 500 });
  }

  try {
    const { files, brandName, industry, model } = await request.json() as {
      files: FileInfo[];
      brandName?: string;
      industry?: string;
      model?: string;
    };

    if (!files?.length) {
      return NextResponse.json({ error: '분석할 파일이 없습니다.' }, { status: 400 });
    }

    console.log('[analyze-references] Received', files.length, 'files');
    for (const f of files) {
      console.log(`  - ${f.name}: content=${f.content ? f.content.length + ' chars' : 'none'}, url=${f.url || 'none'}`);
    }

    // 텍스트 수집
    const texts: { name: string; content: string }[] = [];
    const errors: string[] = [];

    for (const f of files) {
      if (f.content) {
        texts.push({ name: f.name, content: f.content });
        continue;
      }

      // r2_key가 있으면 서버에서 직접 fresh presigned URL 생성
      let fetchUrl = f.url;
      if (f.r2_key) {
        try {
          const { getR2Client, getR2Bucket } = await import('@/lib/r2-client');
          const client = getR2Client();
          const bucket = getR2Bucket();
          const cmd = new GetObjectCommand({ Bucket: bucket, Key: f.r2_key });
          fetchUrl = await getSignedUrl(client, cmd, { expiresIn: 300 });
        } catch (err) {
          console.error(`[analyze-references] Failed to generate presigned URL for ${f.name}:`, err);
        }
      }

      if (fetchUrl) {
        const extracted = await extractTextFromUrl(f.name, fetchUrl);
        if (extracted && extracted.trim().length > 0) {
          texts.push({ name: f.name, content: extracted });
        } else {
          errors.push(f.name);
        }
      } else {
        errors.push(f.name);
      }
    }

    if (texts.length === 0) {
      return NextResponse.json({
        error: `텍스트를 추출할 수 없습니다.\n실패: ${errors.join(', ')}\n지원 형식: PDF, DOCX, TXT, MD`,
      }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const refContent = texts.map(t => `\n### 📄 ${t.name}\n${t.content}`).join('\n\n---\n\n');

    const prompt = `당신은 마케팅 콘텐츠 전략가입니다. 아래 참고 자료들을 분석하여 콘텐츠 제작에 활용할 수 있는 구조화된 요약을 작성하세요.

${brandName ? `브랜드: ${brandName}` : ''}
${industry ? `업종: ${industry}` : ''}

## 참고 자료 원문
${refContent}

## 요약 작성 가이드

아래 형식으로 요약하세요:

### 📚 자료 개요
- 자료별 한 줄 요약 (자료명: 핵심 내용)

### 🎯 핵심 메시지 (콘텐츠에 반복 활용)
- 전문성을 보여주는 핵심 주장/데이터 5~10개
- 각각 한 줄로, 구체적 수치나 팩트 포함

### 📂 주제별 핵심 내용
자료에서 추출한 주제별로 그룹핑하여 정리:
- 각 주제: 핵심 포인트 3~5개 (구체적 수치, 사례, 인용구 포함)
- 콘텐츠 제작 시 바로 활용할 수 있는 형태로

### 💡 콘텐츠 앵글 추천
- 자료 내용 기반으로 만들 수 있는 콘텐츠 앵글 5~10개
- 각각: 주제 + 왜 효과적인지 한 줄

### ⚠️ 주의사항
- 의료/법률 등 민감한 표현이 있다면 주의할 점

모든 내용은 한국어로 작성하세요. 원문의 핵심을 놓치지 마세요.`;

    const response = await ai.models.generateContent({
      model: model || DEFAULT_ANALYSIS_MODEL,
      contents: prompt,
      config: { maxOutputTokens: 65536 },
    });

    const summary = response.text ?? '';

    return NextResponse.json({
      summary,
      analyzedFiles: texts.length,
      skippedFiles: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '분석 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
