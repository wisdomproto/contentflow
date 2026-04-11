import { NextRequest } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { buildStrategyPrompt } from '@/lib/strategy-prompt-builder';
import type { StrategyInput, KeywordItem, CrawlResult, StrategyTab } from '@/types/strategy';
import { DEFAULT_STRATEGY_MODEL } from '@/lib/ai-models';

const TABS_ORDER: StrategyTab[] = ['overview', 'keywords', 'channelStrategy', 'contentStrategy', 'kpiAction'];

export async function POST(req: NextRequest) {
  const { input, keywordData, crawlData, model } = (await req.json()) as {
    input: StrategyInput;
    keywordData?: KeywordItem[];
    crawlData?: CrawlResult[];
    model?: string;
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' }), { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      for (const tab of TABS_ORDER) {
        send({ type: 'tab_start', tab });

        try {
          const prompt = buildStrategyPrompt(tab, {
            input,
            keywordData,
            crawlResults: crawlData,
          });

          const response = await ai.models.generateContent({
            model: model || DEFAULT_STRATEGY_MODEL,
            contents: prompt,
          });

          const text = response.text || '';

          // Send text as chunk
          send({ type: 'chunk', tab, content: text });

          // Parse JSON from response
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const data = JSON.parse(jsonMatch[0]);
              send({ type: 'tab_complete', tab, data });
            } catch {
              send({ type: 'tab_error', tab, error: 'JSON 파싱 실패' });
            }
          } else {
            send({ type: 'tab_error', tab, error: '응답에서 JSON을 찾을 수 없습니다' });
          }
        } catch (err) {
          send({ type: 'tab_error', tab, error: (err as Error).message });
        }
      }

      send({ type: 'complete' });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
