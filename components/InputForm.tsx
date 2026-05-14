'use client'

import { useRef, useEffect, useCallback } from 'react'

interface InputFormProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isFirstTurn: boolean
  disabled: boolean
  placeholder?: string
}

export default function InputForm({
  value,
  onChange,
  onSubmit,
  isFirstTurn,
  disabled,
  placeholder,
}: InputFormProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const autoResize = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [])

  useEffect(() => {
    autoResize()
  }, [value, autoResize])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey && !disabled) {
      e.preventDefault()
      onSubmit()
    }
  }

  const showCharWarning = value.length > 600

  return (
    <div>
      <div className="mb-3">
        <span className="section-label">
          {isFirstTurn ? 'YOUR POSITION' : 'YOUR DEFENSE'}
        </span>
      </div>
      <textarea
        ref={textareaRef}
        className="debate-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={3}
      />
      {showCharWarning && (
        <div className="char-warning">
          {value.length} / 600 characters — getting long
        </div>
      )}
      <div className="flex justify-end mt-3">
        <button
          className="submit-btn"
          onClick={onSubmit}
          disabled={disabled || value.trim().length === 0}
        >
          {isFirstTurn ? 'Begin' : 'Push back'}
          <span className="submit-arrow">→</span>
        </button>
      </div>
    </div>
  )
}
