import { NextRequest, NextResponse } from 'next/server';

const DATALAB_URL = 'https://openapi.naver.com/v1/datalab/search';

export async function POST(req: NextRequest) {
  try {
    const { keywords, startDate, endDate } = (await req.json()) as {
      keywords: string[];
      startDate: string;
      endDate: string;
    };

    if (!keywords?.length) {
      return NextResponse.json({ error: '키워드를 입력해 주세요.' }, { status: 400 });
    }

    const clientId = process.env.NAVER_DATALAB_CLIENT_ID || '';
    const clientSecret = process.env.NAVER_DATALAB_CLIENT_SECRET || '';

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: '네이버 DataLab API 키가 설정되지 않았습니다.' }, { status: 400 });
    }

    // DataLab allows max 5 keyword groups per request
    const groups = keywords.slice(0, 5).map((kw) => ({
      groupName: kw,
      keywords: [kw],
    }));

    const response = await fetch(DATALAB_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
      body: JSON.stringify({
        startDate: startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        endDate: endDate || new Date().toISOString().slice(0, 10),
        timeUnit: 'month',
        keywordGroups: groups,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `DataLab API 오류 (${response.status}): ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    const trends = (data.results || []).map((result: { title: string; data: { period: string; ratio: number }[] }) => ({
      keyword: result.title,
      monthly: result.data.map((d: { period: string; ratio: number }) => ({
        period: d.period,
        ratio: d.ratio,
      })),
    }));

    return NextResponse.json({ trends });
  } catch (err) {
    return NextResponse.json(
      { error: `서버 오류: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
