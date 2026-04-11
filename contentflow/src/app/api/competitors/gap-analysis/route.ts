import { GoogleGenAI } from '@google/genai'

export async function POST(req: Request) {
  const { projectUrl, competitorUrls, keywords, industry } = await req.json()
  if (!projectUrl || !competitorUrls?.length) return Response.json({ error: 'URLs required' }, { status: 400 })

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
  const prompt = `Analyze content gaps between our site and competitors.

Our site: ${projectUrl}
Competitors: ${competitorUrls.join(', ')}
${keywords?.length ? `Keywords: ${keywords.join(', ')}` : ''}
${industry ? `Industry: ${industry}` : ''}

Return ONLY valid JSON with this structure:
{
  "gaps": [
    { "topic": "topic name", "monthlySearch": 1200, "competitors": ["A", "B"], "difficulty": "medium", "priority": "high" }
  ],
  "strengths": [
    { "topic": "our unique topic", "monthlySearch": 800, "note": "Only we cover this" }
  ]
}`

  try {
    const response = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt })
    const text = response.text || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    return Response.json(jsonMatch ? JSON.parse(jsonMatch[0]) : { gaps: [], strengths: [] })
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
