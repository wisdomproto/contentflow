import { GoogleGenAI } from '@google/genai'

export async function POST(req: Request) {
  const { topic, channelTypes, industry, targetAudience } = await req.json()
  if (!topic) return Response.json({ error: 'topic required' }, { status: 400 })

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

  const channels = channelTypes || ['blog', 'cardnews', 'youtube']
  const prompt = `You are a content marketing strategist. Generate content ideas for each channel based on the trending topic.

Topic: "${topic}"
${industry ? `Industry: ${industry}` : ''}
${targetAudience ? `Target audience: ${targetAudience}` : ''}

For each of these channels: ${channels.join(', ')}

Generate ONE idea per channel with this EXACT JSON format (return ONLY valid JSON array, no explanation):
[
  {
    "channel": "blog",
    "title": "title here",
    "structure": "Hook (opening) → Main content sections → CTA",
    "hook": "opening hook description",
    "outline": ["section 1", "section 2", "section 3"]
  }
]`

  try {
    const response = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt })
    const text = response.text || ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    const ideas = jsonMatch ? JSON.parse(jsonMatch[0]) : []
    return Response.json({ ideas, topic })
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
