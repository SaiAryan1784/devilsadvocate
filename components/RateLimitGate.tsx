'use client'

import { useState, useEffect } from 'react'

export default function RateLimitGate() {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    function updateCountdown() {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
      tomorrow.setUTCHours(0, 0, 0, 0)

      const diff = tomorrow.getTime() - now.getTime()

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      )
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="rate-limit-gate">
      <div className="rate-limit-message">
        <p>you&apos;ve used both sessions for today.</p>
        <p style={{ marginTop: '8px' }}>the devil will be back tomorrow.</p>
      </div>
      <div className="rate-limit-countdown">
        {timeLeft} until reset
      </div>
    </div>
  )
}
