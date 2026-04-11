import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const { keywords, country, period } = await req.json()
  // For now, return a structured placeholder that the frontend can use
  // Actual YouTube/Instagram API integration comes with API keys

  return Response.json({
    youtube: [],  // Will be populated via YouTube Data API
    instagram: [], // Will be populated via Meta API
    googleTrends: keywords?.map((kw: string) => ({ keyword: kw, trend: 'rising', change: '+' + Math.floor(Math.random() * 100) + '%' })) || [],
    naverTrends: keywords?.map((kw: string) => ({ keyword: kw, trend: 'rising', change: '+' + Math.floor(Math.random() * 80) + '%' })) || [],
  })
}
