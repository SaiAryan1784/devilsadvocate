import { NextRequest, NextResponse } from 'next/server'
import { groq } from '@/lib/groq'
import { buildSystemPrompt } from '@/lib/systemPrompt'
import { validateInput } from '@/lib/guardrails'
import { ratelimit } from '@/lib/ratelimit'
import { Turn } from '@/types/debate'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  const { topic, turns, round } = await req.json()

  // Guardrails
  const validation = validateInput(topic, turns)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason }, { status: 400 })
  }

  // Rate limit on first round only
  if (round === 1 && ratelimit) {
    const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
    const { success, remaining } = await ratelimit.limit(ip)
    if (!success) {
      return NextResponse.json(
        { error: 'rate_limit', remaining: 0 },
        { status: 429 }
      )
    }
  }

  // Build message history for Groq
  const messages = turns.map((t: Turn) => ({
    role: t.role === 'devil' ? ('assistant' as const) : ('user' as const),
    content: t.content,
  }))

  try {
    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: buildSystemPrompt(topic, round) },
        ...messages,
      ],
      max_tokens: 180,
      temperature: 0.85,
      stream: true,
    })

    // Stream response back to client
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || ''
            if (text) {
              controller.enqueue(encoder.encode(text))
            }
          }
          controller.close()
        } catch (streamError) {
          controller.close()
        }
      },
    })

    return new NextResponse(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (err: unknown) {
    // Rate limit fallback — try smaller model
    const error = err as { status?: number }
    if (error?.status === 429) {
      try {
        const fallbackStream = await groq.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: buildSystemPrompt(topic, round) },
            ...messages,
          ],
          max_tokens: 180,
          temperature: 0.85,
          stream: true,
        })

        const encoder = new TextEncoder()
        const readable = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of fallbackStream) {
                const text = chunk.choices[0]?.delta?.content || ''
                if (text) {
                  controller.enqueue(encoder.encode(text))
                }
              }
              controller.close()
            } catch {
              controller.close()
            }
          },
        })

        return new NextResponse(readable, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
      } catch {
        return NextResponse.json({ error: 'rate_limit' }, { status: 429 })
      }
    }
    return NextResponse.json({ error: 'inference_failed' }, { status: 500 })
  }
}
