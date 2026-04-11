import { GoogleGenAI } from '@google/genai'

export async function POST(req: Request) {
  const { content, schemaType, businessInfo } = await req.json()
  if (!content) return Response.json({ error: 'content required' }, { status: 400 })

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
  const prompt = `Generate valid JSON-LD Schema.org markup of type "${schemaType || 'Article'}".
${businessInfo ? `Business: ${businessInfo}` : ''}
Output ONLY valid JSON-LD, no explanation. For medical content use MedicalEntity. For Q&A use FAQPage.

Content:
${content.substring(0, 3000)}`

  const response = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt })
  const text = response.text || ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  return Response.json({ schema: jsonMatch ? jsonMatch[0] : text })
}
