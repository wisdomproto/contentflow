import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const NAVER_API_BASE = 'https://api.naver.com';

function generateSignature(timestamp: string, method: string, uri: string, secretKey: string): string {
  const message = `${timestamp}.${method}.${uri}`;
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(message);
  return hmac.digest('base64');
}

interface NaverKeywordResult {
  relKeyword: string;
  monthlyPcQcCnt: number | string;
  monthlyMobileQcCnt: number | string;
  monthlyAvePcClkCnt: number | string;
  monthlyAveMobileClkCnt: number | string;
  monthlyAvePcCtr: number | string;
  monthlyAveMobileCtr: number | string;
  compIdx: string;
  plAvgDepth: number | string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { keywords, apiKey, secretKey, customerId } = body as {
      keywords: string[];
      apiKey?: string;
      secretKey?: string;
      customerId?: string;
    };

    if (!keywords?.length) {
      return NextResponse.json({ error: '키워드를 입력해 주세요.' }, { status: 400 });
    }

    const licenseKey = apiKey || process.env.NAVER_API_LICENSE_KEY || '';
    const secret = secretKey || process.env.NAVER_API_SECRET_KEY || '';
    const customer = customerId || process.env.NAVER_API_CUSTOMER_ID || '';

    if (!licenseKey || !secret || !customer) {
      return NextResponse.json({ error: '네이버 API 키가 설정되지 않았습니다.' }, { status: 400 });
    }

    const timestamp = String(Date.now());
    const method = 'GET';
    const uri = '/keywordstool';
    const signature = generateSignature(timestamp, method, uri, secret);

    const params = new URLSearchParams({
      hintKeywords: keywords.join(','),
      showDetail: '1',
    });

    const response = await fetch(`${NAVER_API_BASE}${uri}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'X-Timestamp': timestamp,
        'X-API-KEY': licenseKey,
        'X-Customer': customer,
        'X-Signature': signature,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `네이버 API 오류 (${response.status}): ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const results: NaverKeywordResult[] = data.keywordList ?? [];

    const formatted = results.map((item) => {
      const pcSearch = typeof item.monthlyPcQcCnt === 'number' ? item.monthlyPcQcCnt : 0;
      const mobileSearch = typeof item.monthlyMobileQcCnt === 'number' ? item.monthlyMobileQcCnt : 0;
      return {
        keyword: item.relKeyword,
        pcSearchVolume: pcSearch,
        mobileSearchVolume: mobileSearch,
        totalSearchVolume: pcSearch + mobileSearch,
        competition: item.compIdx ?? 'LOW',
        pcClickCount: typeof item.monthlyAvePcClkCnt === 'number' ? item.monthlyAvePcClkCnt : 0,
        mobileClickCount: typeof item.monthlyAveMobileClkCnt === 'number' ? item.monthlyAveMobileClkCnt : 0,
        pcCtr: typeof item.monthlyAvePcCtr === 'number' ? item.monthlyAvePcCtr : 0,
        mobileCtr: typeof item.monthlyAveMobileCtr === 'number' ? item.monthlyAveMobileCtr : 0,
      };
    });

    return NextResponse.json({ keywords: formatted });
  } catch (err) {
    return NextResponse.json(
      { error: `서버 오류: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
