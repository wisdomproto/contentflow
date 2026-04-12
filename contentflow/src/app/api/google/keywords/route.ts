import { NextRequest, NextResponse } from 'next/server';

const DATAFORSEO_URL = 'https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live';

export async function POST(req: NextRequest) {
  try {
    const { keywords, languageCode, locationCode } = await req.json() as {
      keywords: string[];
      languageCode?: string;
      locationCode?: number;
    };

    if (!keywords?.length) {
      return NextResponse.json({ error: '키워드를 입력해 주세요.' }, { status: 400 });
    }

    const login = process.env.DATAFORSEO_LOGIN || '';
    const password = process.env.DATAFORSEO_PASSWORD || '';
    if (!login || !password) {
      return NextResponse.json({ error: 'DataForSEO API 키가 설정되지 않았습니다.' }, { status: 400 });
    }

    const creds = Buffer.from(`${login}:${password}`).toString('base64');

    // DataForSEO allows up to 700 keywords per request
    const response = await fetch(DATAFORSEO_URL, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Authorization': `Basic ${creds}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{
        keywords: keywords.slice(0, 700),
        language_code: languageCode || 'ko',
        location_code: locationCode || 2410, // South Korea
      }]),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `DataForSEO API 오류 (${response.status}): ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const results = data.tasks?.[0]?.result || [];

    const formatted = results.map((item: any) => ({
      keyword: item.keyword,
      searchVolume: item.search_volume || 0,
      competition: item.competition || null,
      competitionIndex: item.competition_index || null,
      cpc: item.cpc || 0,
      monthlySearches: item.monthly_searches || [],
    }));

    return NextResponse.json({ keywords: formatted });
  } catch (err) {
    return NextResponse.json(
      { error: `서버 오류: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
