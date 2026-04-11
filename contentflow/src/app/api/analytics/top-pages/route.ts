import { NextRequest, NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const propertyId = body.propertyId || process.env.GA4_PROPERTY_ID || '';
    const clientEmail = body.clientEmail || process.env.GA4_CLIENT_EMAIL || '';
    const privateKey = body.privateKey || process.env.GA4_PRIVATE_KEY || '';
    const period = body.period || '30d';

    if (!propertyId || !clientEmail || !privateKey) {
      return NextResponse.json({ error: 'GA4 설정이 필요합니다' }, { status: 400 });
    }

    const client = new BetaAnalyticsDataClient({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
    });

    const startDate = period === '7d' ? '7daysAgo' : '30daysAgo';

    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate: 'today' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'activeUsers' },
      ],
      dimensions: [
        { name: 'pagePath' },
        { name: 'pageTitle' },
      ],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 15,
    });

    const pages = (response.rows ?? []).map(r => ({
      path: r.dimensionValues?.[0]?.value ?? '',
      title: r.dimensionValues?.[1]?.value ?? '',
      views: parseInt(r.metricValues?.[0]?.value ?? '0', 10),
      users: parseInt(r.metricValues?.[1]?.value ?? '0', 10),
    }));

    return NextResponse.json({ pages });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'GA4 API 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
