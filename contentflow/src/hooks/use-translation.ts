'use client'

import { useState, useCallback } from 'react'
import { parseSSEStream } from '@/lib/sse-stream-parser'

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

      let streamError: string | null = null
      let result = ''

      await parseSSEStream(response, {
        onChunk: (chunk) => {
          if (chunk.error) {
            streamError = chunk.error
            return
          }
          if (chunk.text) {
            result += chunk.text
            setTranslatedText(result)
          }
        },
      })

      setTranslating(false)
      if (streamError) {
        setError(streamError)
        return null
      }
      return result
    } catch (err) {
      setError(String(err))
      setTranslating(false)
      return null
    }
  }, [])

  return { translate, translating, translatedText, error }
}
