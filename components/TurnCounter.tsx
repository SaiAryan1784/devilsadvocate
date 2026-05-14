'use client'

interface TurnCounterProps {
  round: number
  maxRounds: number
}

export default function TurnCounter({ round, maxRounds }: TurnCounterProps) {
  if (round === 0) return null

  return (
    <span className="round-indicator">
      round {round} of {maxRounds}
    </span>
  )
}
