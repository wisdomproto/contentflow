'use client'

import { useState, useCallback } from 'react'

interface TranslateOptions {
  text: string
  sourceLanguage?: string
  targetLanguage: string
  channelType?: string
  model?: string
  isNaver?: boolean
}

export function useTranslation() {
  const [translating, setTranslating] = useState(false)
  const [translatedText, setTranslatedText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const translate = useCallback(async (options: TranslateOptions) => {
    setTranslating(true)
    setTranslatedText('')
    setError(null)

    try {
      const response = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      })

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader')

      const decoder = new TextDecoder()
      let result = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))

        for (const line of lines) {
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            if (parsed.text) {
              result += parsed.text
              setTranslatedText(result)
            }
            if (parsed.error) throw new Error(parsed.error)
          } catch {}
        }
      }

      setTranslating(false)
      return result
    } catch (err) {
      setError(String(err))
      setTranslating(false)
      return null
    }
  }, [])

  return { translate, translating, translatedText, error }
}
