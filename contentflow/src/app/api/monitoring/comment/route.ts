import { GoogleGenAI } from '@google/genai'

export async function POST(req: Request) {
  const { contentText, platform, tone, language, projectContext } = await req.json()
  if (!contentText) return Response.json({ error: 'contentText required' }, { status: 400 })

  const toneMap: Record<string, string> = {
    professional: 'Write as a knowledgeable professional. Provide value and insight.',
    friendly: 'Write in a warm, approachable tone. Use casual language and emojis sparingly.',
    short: 'Write very concisely in 1-2 sentences. Get to the point.',
  }

  const platformMap: Record<string, string> = {
    instagram: 'Instagram comment — keep it brief and engaging',
    youtube: 'YouTube comment — add value to the discussion',
    naver_jisikin: 'Naver 지식인 answer — provide helpful, detailed information',
    naver_blog: 'Blog comment — show genuine interest and engagement',
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
  const prompt = `Generate a natural, authentic comment/reply for this content.
Platform: ${platformMap[platform] || platform}
Tone: ${toneMap[tone] || tone}
Language: ${language || 'ko'}
${projectContext ? `Your context: ${projectContext}` : ''}

Rules:
- Sound like a real person, not a bot
- Add value (share insight, ask a question, or relate with experience)
- Do NOT be promotional or salesy
- Keep it natural for the platform
- Write in ${language === 'ko' ? 'Korean' : language === 'en' ? 'English' : language === 'th' ? 'Thai' : 'Vietnamese'}

Content to comment on:
${contentText.substring(0, 1000)}

Generate ONLY the comment text, no explanation.`

  try {
    const response = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt })
    return Response.json({ comment: response.text || '' })
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
