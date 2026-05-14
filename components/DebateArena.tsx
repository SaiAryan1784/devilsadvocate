'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Turn, DebateState } from '@/types/debate'
import MessageBubble from './MessageBubble'
import InputForm from './InputForm'
import TurnCounter from './TurnCounter'
import RateLimitGate from './RateLimitGate'

const MAX_ROUNDS = 8

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

function getClientRateLimit(): { count: number; date: string } {
  if (typeof window === 'undefined') return { count: 0, date: '' }
  try {
    const stored = localStorage.getItem('devil_uses')
    if (stored) {
      const parsed = JSON.parse(stored)
      const today = new Date().toISOString().split('T')[0]
      if (parsed.date === today) {
        return parsed
      }
    }
  } catch {
    // ignore
  }
  return { count: 0, date: new Date().toISOString().split('T')[0] }
}

function incrementClientRateLimit() {
  const current = getClientRateLimit()
  const today = new Date().toISOString().split('T')[0]
  const updated = {
    count: current.date === today ? current.count + 1 : 1,
    date: today,
  }
  localStorage.setItem('devil_uses', JSON.stringify(updated))
  return updated
}

export default function DebateArena() {
  const [state, setState] = useState<DebateState>({
    topic: '',
    turns: [],
    round: 0,
    status: 'idle',
  })
  const [input, setInput] = useState('')
  const [streamingText, setStreamingText] = useState('')
  const [error, setError] = useState('')
  const [isRateLimited, setIsRateLimited] = useState(false)

  const debateEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Check client-side rate limit on mount
  useEffect(() => {
    const limit = getClientRateLimit()
    if (limit.count >= 2) {
      setIsRateLimited(true)
    }
  }, [])

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      debateEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!input.trim()) return
    if (state.status === 'thinking') return

    setError('')

    const isFirstTurn = state.round === 0
    const currentTopic = isFirstTurn ? input.trim() : state.topic
    const currentRound = isFirstTurn ? 1 : state.round

    // Create user turn
    const userTurn: Turn = {
      id: generateId(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
      round: currentRound,
    }

    const newTurns = [...state.turns, userTurn]

    setState((prev) => ({
      ...prev,
      topic: currentTopic,
      turns: newTurns,
      round: currentRound,
      status: 'thinking',
    }))
    setInput('')
    setStreamingText('')

    // Abort any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      const response = await fetch('/api/argue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: currentTopic,
          turns: newTurns,
          round: currentRound,
        }),
        signal: abortController.signal,
      })

      if (response.status === 429) {
        setIsRateLimited(true)
        incrementClientRateLimit()
        incrementClientRateLimit()
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || 'Something went wrong. Try again.')
        setState((prev) => ({ ...prev, status: 'active' }))
        return
      }

      // Increment client rate limit on first round
      if (isFirstTurn) {
        const updated = incrementClientRateLimit()
        if (updated.count >= 2) {
          // Don't block yet — let this session finish
        }
      }

      // Stream the response
      const reader = response.body?.getReader()
      if (!reader) {
        setError('Failed to read response stream.')
        setState((prev) => ({ ...prev, status: 'active' }))
        return
      }

      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        accumulated += text
        setStreamingText(accumulated)
        scrollToBottom()
      }

      // Create devil turn from accumulated text
      const devilTurn: Turn = {
        id: generateId(),
        role: 'devil',
        content: accumulated,
        timestamp: Date.now(),
        round: currentRound,
      }

      const nextRound = currentRound + 1
      const isEnded = nextRound > MAX_ROUNDS

      setState((prev) => ({
        ...prev,
        turns: [...prev.turns, devilTurn],
        round: nextRound,
        status: isEnded ? 'ended' : 'active',
      }))
      setStreamingText('')
      scrollToBottom()
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError('Connection failed. Try again.')
      setState((prev) => ({ ...prev, status: 'active' }))
    }
  }, [input, state, scrollToBottom])

  if (isRateLimited) {
    return <RateLimitGate />
  }

  return (
    <div
      className="w-full mx-auto px-6 py-12"
      style={{ maxWidth: '680px' }}
    >
      {/* Header */}
      <div className="flex items-baseline justify-between mb-10">
        <span className="page-label">devil&apos;s advocate</span>
        {state.round > 0 && (
          <TurnCounter round={Math.min(state.round, MAX_ROUNDS)} maxRounds={MAX_ROUNDS} />
        )}
      </div>

      {/* Topic header — shown after first submission */}
      {state.topic && state.turns.length > 0 && (
        <>
          <div
            className="user-text mb-2"
            style={{
              color: 'var(--text-secondary)',
              fontSize: '13px',
            }}
          >
            debating:
          </div>
          <div
            className="devil-text mb-6"
            style={{ fontSize: '16px', color: 'var(--text-secondary)' }}
          >
            &ldquo;{state.topic}&rdquo;
          </div>
          <hr className="debate-separator" />
        </>
      )}

      {/* Rendered turns */}
      {state.turns.map((turn, index) => (
        <div key={turn.id}>
          <MessageBubble turn={turn} />
          {/* Add separator after each devil turn (completes a round pair) */}
          {turn.role === 'devil' && index < state.turns.length - 1 && (
            <hr className="debate-separator" />
          )}
        </div>
      ))}

      {/* Streaming devil response */}
      {state.status === 'thinking' && (
        <>
          {state.turns.length > 0 && state.turns[state.turns.length - 1]?.role === 'user' && (
            <hr className="debate-separator" />
          )}
          <div className="mb-8">
            <div className="flex items-baseline justify-between mb-3">
              <span className="section-label section-label--devil fade-in">DEVIL</span>
              <span className="round-indicator">round {state.round}</span>
            </div>
            <div className="devil-text">
              {streamingText || ''}
              <span className="blinking-cursor">_</span>
            </div>
          </div>
        </>
      )}

      {/* Error */}
      {error && <div className="error-message">{error}</div>}

      {/* End state */}
      {state.status === 'ended' && (
        <>
          <hr className="debate-separator" />
          <div className="end-message">
            You&apos;ve either convinced yourself or you haven&apos;t.
          </div>
        </>
      )}

      {/* Input form — show when not ended and not thinking */}
      {state.status !== 'ended' && state.status !== 'thinking' && (
        <>
          {state.turns.length > 0 && state.turns[state.turns.length - 1]?.role === 'devil' && (
            <hr className="debate-separator" />
          )}
          <InputForm
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            isFirstTurn={state.round === 0}
            disabled={false}
            placeholder={
              state.round === 0
                ? "We're building on Postgres for our core data layer."
                : 'Defend your position...'
            }
          />
        </>
      )}

      <div ref={debateEndRef} />

      {/* Developer credit */}
      <div
        className="page-label"
        style={{
          textAlign: 'center',
          marginTop: '48px',
          paddingBottom: '24px',
          fontSize: '10px',
        }}
      >
        built by{' '}
        <a
          href="https://saiaryan.in"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}
        >
          saiaryan.in
        </a>
      </div>
    </div>
  )
}
