import { NextRequest, NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const propertyId = body.propertyId || process.env.GA4_PROPERTY_ID || '';
    const clientEmail = body.clientEmail || process.env.GA4_CLIENT_EMAIL || '';
    const privateKey = body.privateKey || process.env.GA4_PRIVATE_KEY || '';
    const period = body.period || '7d';

    if (!propertyId || !clientEmail || !privateKey) {
      return NextResponse.json({ error: 'GA4 설정이 필요합니다' }, { status: 400 });
    }

    const client = new BetaAnalyticsDataClient({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
    });

    const property = `properties/${propertyId}`;
    const startDate = period === '30d' ? '30daysAgo' : '7daysAgo';

    const [summaryResponse] = await client.runReport({
      property,
      dateRanges: [{ startDate, endDate: 'today' }],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
        { name: 'screenPageViews' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
      ],
    });

    const [dailyResponse] = await client.runReport({
      property,
      dateRanges: [{ startDate, endDate: 'today' }],
      metrics: [{ name: 'screenPageViews' }],
      dimensions: [{ name: 'date' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    });

    const row = summaryResponse.rows?.[0];
    const dailyPageviews = (dailyResponse.rows ?? []).map(r => ({
      date: r.dimensionValues?.[0]?.value ?? '',
      views: parseInt(r.metricValues?.[0]?.value ?? '0', 10),
    }));

    return NextResponse.json({
      period,
      totalSessions: parseInt(row?.metricValues?.[0]?.value ?? '0', 10),
      totalUsers: parseInt(row?.metricValues?.[1]?.value ?? '0', 10),
      totalPageviews: parseInt(row?.metricValues?.[2]?.value ?? '0', 10),
      bounceRate: parseFloat(row?.metricValues?.[3]?.value ?? '0'),
      avgSessionDuration: parseFloat(row?.metricValues?.[4]?.value ?? '0'),
      dailyPageviews,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'GA4 API 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
