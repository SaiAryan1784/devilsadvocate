'use client'

import { Turn } from '@/types/debate'

interface MessageBubbleProps {
  turn: Turn
  isStreaming?: boolean
  streamingText?: string
}

export default function MessageBubble({ turn, isStreaming, streamingText }: MessageBubbleProps) {
  const isDevil = turn.role === 'devil'
  const displayContent = isStreaming ? (streamingText || '') : turn.content

  if (isDevil) {
    return (
      <div className="mb-8">
        <div className="flex items-baseline justify-between mb-3">
          <span className="section-label section-label--devil fade-in">DEVIL</span>
          <span className="round-indicator">round {turn.round}</span>
        </div>
        <div className="devil-text">
          {displayContent}
          {isStreaming && <span className="blinking-cursor">_</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-8">
      <div className="mb-3">
        <span className="section-label">
          {turn.round === 1 ? 'YOUR POSITION' : 'YOUR DEFENSE'}
        </span>
      </div>
      <div
        className="user-text"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '2px',
          padding: '16px',
        }}
      >
        {turn.content}
      </div>
    </div>
  )
}
