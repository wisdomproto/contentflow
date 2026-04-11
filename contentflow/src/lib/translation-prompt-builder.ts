import type { Project } from '@/types/database'

interface TranslationContext {
  sourceLanguage: string
  targetLanguage: string
  channelType: string
  project?: Project
  isNaver?: boolean
}

const LANG_NAMES: Record<string, string> = {
  ko: 'Korean', en: 'English', th: 'Thai', vi: 'Vietnamese', ja: 'Japanese', zh: 'Chinese'
}

export function buildTranslationPrompt(context: TranslationContext): string {
  const { sourceLanguage, targetLanguage, channelType, project, isNaver } = context
  const sourceName = LANG_NAMES[sourceLanguage] || sourceLanguage
  const targetName = LANG_NAMES[targetLanguage] || targetLanguage

  let prompt = `You are a professional translator specializing in ${channelType} content.
Translate the following ${sourceName} content to ${targetName}.

Rules:
- Maintain the original tone and style
- Preserve all formatting (headings, lists, bold, etc.)
- Keep technical terms accurate
- Adapt cultural references for the target audience
- Do NOT translate brand names, product names, or proper nouns
- Return ONLY the translated content, no explanations`

  if (project?.brand_name) {
    prompt += `\n- Brand name: "${project.brand_name}" (keep as-is)`
  }
  if (project?.industry) {
    prompt += `\n- Industry: ${project.industry} (use appropriate terminology)`
  }

  if (isNaver) {
    prompt += `\n\nSpecial Naver Blog formatting:
- Use shorter paragraphs (2-3 sentences max)
- Add more line breaks for readability
- Include relevant emojis sparingly
- Format for mobile reading
- Adjust keyword density for Naver SEO`
  }

  if (channelType === 'youtube') {
    prompt += `\n- Translate narration scripts naturally for spoken delivery`
  }
  if (channelType === 'instagram' || channelType === 'threads') {
    prompt += `\n- Keep text concise for social media\n- Translate hashtags to target language equivalents`
  }

  return prompt
}
