import crypto from 'crypto';

function generateSignature(timestamp: string, method: string, uri: string, secretKey: string): string {
  const message = `${timestamp}.${method}.${uri}`;
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(message);
  return hmac.digest('base64');
}

function getAuthHeaders(method: string, uri: string) {
  const apiKey = process.env.NAVER_AD_API_KEY;
  const secretKey = process.env.NAVER_AD_SECRET_KEY;
  const customerId = process.env.NAVER_AD_CUSTOMER_ID;

  if (!apiKey || !secretKey || !customerId) {
    throw new Error('Naver Search Ad API credentials are not set');
  }

  const timestamp = Date.now().toString();
  const signature = generateSignature(timestamp, method, uri, secretKey);

  return {
    'X-Timestamp': timestamp,
    'X-API-KEY': apiKey,
    'X-Customer': customerId,
    'X-Signature': signature,
  };
}

export interface KeywordStat {
  relKeyword: string;
  monthlyPcQcCnt: number;
  monthlyMobileQcCnt: number;
  monthlyAvePcClkCnt: number;
  monthlyAveMobileClkCnt: number;
  monthlyAvePcCtr: number;
  monthlyAveMobileCtr: number;
  compIdx: string;
  plAvgDepth: number;
}

export async function getKeywordStats(keywords: string[]): Promise<KeywordStat[]> {
  // Clean keywords: remove #, trim, filter empty/duplicates
  const cleaned = Array.from(new Set(
    keywords
      .map((kw) => kw.replace(/^#/, '').trim())
      .filter((kw) => kw.length > 0),
  ));

  if (cleaned.length === 0) {
    throw new Error('유효한 키워드가 없습니다');
  }

  const uri = '/keywordstool';
  const baseUrl = 'https://api.searchad.naver.com';
  const headers = getAuthHeaders('GET', uri);

  // Naver API expects hintKeywords as comma-separated values
  const hintKeywords = encodeURIComponent(cleaned.join(','));
  const url = `${baseUrl}${uri}?hintKeywords=${hintKeywords}&showDetail=1`;

  const response = await fetch(url, {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Naver API error (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.keywordList || [];
}
