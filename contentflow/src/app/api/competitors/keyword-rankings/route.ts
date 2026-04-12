import { GoogleGenAI } from '@google/genai'

export async function POST(req: Request) {
  const { projectUrl, competitorUrls, keywords } = await req.json()
  if (!keywords?.length) return Response.json({ error: 'keywords required' }, { status: 400 })

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
  const prompt = `Analyze approximate Google search keyword rankings for the following sites.

My site: ${projectUrl || '(not provided)'}
Competitors: ${(competitorUrls || []).join(', ') || '(not provided)'}
Keywords to analyze: ${keywords.join(', ')}

For each keyword, estimate the approximate Google search ranking position (integer 1-100) or null if not ranking in top 100.
Base your estimates on what you know about these domains and typical SEO for these terms.

Return ONLY valid JSON with exactly this structure:
{
  "rankings": [
    {
      "keyword": "keyword text",
      "myRank": 15,
      "competitors": [
        { "name": "competitor-domain.com", "rank": 3 },
        { "name": "other-domain.com", "rank": 7 }
      ]
    }
  ]
}`

  try {
    const response = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt })
    const text = response.text || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    return Response.json(jsonMatch ? JSON.parse(jsonMatch[0]) : { rankings: [] })
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
