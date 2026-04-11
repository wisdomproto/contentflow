import { BetaAnalyticsDataClient } from '@google-analytics/data'

export async function POST(req: Request) {
  const { propertyId, clientEmail, privateKey, days } = await req.json()
  if (!propertyId || !clientEmail || !privateKey) {
    return Response.json({ error: 'GA4 credentials required' }, { status: 400 })
  }

  try {
    const client = new BetaAnalyticsDataClient({
      credentials: { client_email: clientEmail, private_key: privateKey.replace(/\\n/g, '\n') },
    })

    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: `${days || 30}daysAgo`, endDate: 'today' }],
      dimensions: [{ name: 'country' }],
      metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10,
    })

    const rows = response.rows?.map(row => ({
      country: row.dimensionValues?.[0]?.value || '',
      sessions: parseInt(row.metricValues?.[0]?.value || '0'),
      users: parseInt(row.metricValues?.[1]?.value || '0'),
    })) || []

    return Response.json(rows)
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
