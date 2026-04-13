import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const NAVER_API_BASE = 'https://api.searchad.naver.com';

function generateNaverSignature(timestamp: string, method: string, uri: string, secretKey: string): string {
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(`${timestamp}.${method}.${uri}`);
  return hmac.digest('base64');
}

export async function POST(req: NextRequest) {
  try {
    const { title, baseArticle, industry, language } = await req.json() as {
      title: string;
      baseArticle?: string;
      industry?: string;
      language?: string;
    };

    if (!title) {
      return NextResponse.json({ error: '제목을 입력해 주세요.' }, { status: 400 });
    }

    const lang = language || 'ko';
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: 'Gemini API 키가 설정되지 않았습니다.' }, { status: 400 });
    }

    // 1. AI generates candidate keywords
    const prompt = `You are an SEO keyword strategist. Generate 15-20 search keywords for this content.

Content title: ${title}
Industry: ${industry || 'not specified'}
Language: ${lang === 'ko' ? 'Korean' : lang === 'ja' ? 'Japanese' : lang === 'zh' ? 'Chinese' : 'English'}
${baseArticle ? `Content summary: ${baseArticle.substring(0, 500)}` : ''}

Requirements:
- Keywords must be in ${lang === 'ko' ? 'Korean' : lang === 'ja' ? 'Japanese' : lang === 'zh' ? 'Chinese' : 'English'}
- Mix of short-tail (1-2 words) and long-tail (3-5 words) keywords
- Include informational, commercial, and navigational intent
- No spaces within individual keywords if Korean (e.g. "성장클리닉" not "성장 클리닉")

Return ONLY a JSON array: ["keyword1","keyword2",...]`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 2000 },
        }),
      }
    );
    const geminiData = await geminiRes.json();
    const parts = geminiData.candidates?.[0]?.content?.parts || [];
    // Gemini 2.5 Flash "thinking" model: concatenate all text parts
    let aiText = '';
    for (const p of parts) {
      if (p.text) aiText += p.text;
    }
    // Strip markdown code blocks and parse JSON array
    aiText = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    let candidates: string[] = [];
    try {
      candidates = JSON.parse(aiText);
    } catch {
      const match = aiText.match(/\[[\s\S]*\]/);
      if (match) {
        try { candidates = JSON.parse(match[0]); } catch {}
      }
    }
    if (!Array.isArray(candidates)) candidates = [];

    if (candidates.length === 0) {
      return NextResponse.json({ keywords: [] });
    }

    // 2. Fetch real search volume
    const results: Array<{
      keyword: string;
      naverVolume?: number;
      naverComp?: string;
      googleVolume?: number;
      googleComp?: string;
      googleCpc?: number;
    }> = [];

    // 2a. Naver (Korean only)
    if (lang === 'ko') {
      const licenseKey = process.env.NAVER_API_LICENSE_KEY || '';
      const secret = process.env.NAVER_API_SECRET_KEY || '';
      const customer = process.env.NAVER_API_CUSTOMER_ID || '';

      if (licenseKey && secret && customer) {
        // Clean keywords (remove spaces for Naver)
        const cleanKws = candidates.map(k => k.replace(/\s+/g, ''));
        // Batch in groups of 5
        for (let i = 0; i < cleanKws.length; i += 5) {
          const batch = cleanKws.slice(i, i + 5);
          const timestamp = String(Date.now());
          const uri = '/keywordstool';
          const signature = generateNaverSignature(timestamp, 'GET', uri, secret);
          const params = new URLSearchParams({ hintKeywords: batch.join(','), showDetail: '1' });

          try {
            const res = await fetch(`${NAVER_API_BASE}${uri}?${params}`, {
              cache: 'no-store',
              headers: { 'X-Timestamp': timestamp, 'X-API-KEY': licenseKey, 'X-Customer': customer, 'X-Signature': signature },
            });
            if (res.ok) {
              const data = await res.json();
              for (const nk of (data.keywordList || [])) {
                const vol = (typeof nk.monthlyPcQcCnt === 'number' ? nk.monthlyPcQcCnt : 0)
                  + (typeof nk.monthlyMobileQcCnt === 'number' ? nk.monthlyMobileQcCnt : 0);
                if (vol > 0) {
                  const existing = results.find(r => r.keyword === nk.relKeyword);
                  if (!existing) {
                    results.push({ keyword: nk.relKeyword, naverVolume: vol, naverComp: nk.compIdx });
                  }
                }
              }
            }
          } catch {}
          if (i + 5 < cleanKws.length) await new Promise(r => setTimeout(r, 300));
        }
      }
    }

    // 2b. Google (DataForSEO, all languages)
    const dfLogin = process.env.DATAFORSEO_LOGIN;
    const dfPassword = process.env.DATAFORSEO_PASSWORD;
    if (dfLogin && dfPassword) {
      const creds = Buffer.from(`${dfLogin}:${dfPassword}`).toString('base64');
      const locCode = lang === 'ko' ? 2410 : lang === 'ja' ? 2392 : lang === 'zh' ? 2156 : lang === 'th' ? 2764 : 2840;
      const langCode = lang === 'ko' ? 'ko' : lang === 'ja' ? 'ja' : lang === 'zh' ? 'zh' : 'en';

      try {
        const res = await fetch('https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live', {
          method: 'POST',
          headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/json' },
          body: JSON.stringify([{ keywords: candidates, language_code: langCode, location_code: locCode }]),
        });
        if (res.ok) {
          const data = await res.json();
          for (const gk of (data.tasks?.[0]?.result || [])) {
            const existing = results.find(r => r.keyword === gk.keyword);
            if (existing) {
              existing.googleVolume = gk.search_volume || 0;
              existing.googleComp = gk.competition || null;
              existing.googleCpc = gk.cpc || 0;
            } else {
              results.push({
                keyword: gk.keyword,
                googleVolume: gk.search_volume || 0,
                googleComp: gk.competition || null,
                googleCpc: gk.cpc || 0,
              });
            }
          }
        }
      } catch {}
    }

    // 3. Sort: AI candidates first (by volume), then Naver-discovered (by volume)
    const candidateSet = new Set(candidates.map(c => c.replace(/\s+/g, '')));
    results.sort((a, b) => {
      const aIsCandidate = candidateSet.has(a.keyword.replace(/\s+/g, '')) ? 1 : 0;
      const bIsCandidate = candidateSet.has(b.keyword.replace(/\s+/g, '')) ? 1 : 0;
      if (aIsCandidate !== bIsCandidate) return bIsCandidate - aIsCandidate;
      const aVol = (a.naverVolume || 0) + (a.googleVolume || 0);
      const bVol = (b.naverVolume || 0) + (b.googleVolume || 0);
      return bVol - aVol;
    });

    return NextResponse.json({ keywords: results.slice(0, 30) });
  } catch (err) {
    return NextResponse.json({ error: `서버 오류: ${(err as Error).message}` }, { status: 500 });
  }
}
