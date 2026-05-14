const BLOCKED_PATTERNS = [
  /ignore (previous|above|all) instructions/i,
  /you are now/i,
  /pretend (you are|to be)/i,
  /jailbreak/i,
  /DAN/,
]

const MIN_TOPIC_LENGTH = 20
const MAX_TOPIC_LENGTH = 600
const MAX_TURN_LENGTH = 800
const MAX_ROUNDS = 8

export function validateInput(topic: string, turns: { content?: string }[]) {
  if (!topic || topic.length < MIN_TOPIC_LENGTH) {
    return { ok: false as const, reason: 'Topic too short. Be specific.' }
  }
  if (topic.length > MAX_TOPIC_LENGTH) {
    return { ok: false as const, reason: 'Topic too long. Tighten it.' }
  }
  if (turns.length > MAX_ROUNDS * 2) {
    return { ok: false as const, reason: 'max_rounds_reached' }
  }
  const lastTurn = turns[turns.length - 1]
  if (lastTurn?.content && lastTurn.content.length > MAX_TURN_LENGTH) {
    return { ok: false as const, reason: 'Response too long. Make your point shorter.' }
  }
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(topic) || pattern.test(lastTurn?.content || '')) {
      return { ok: false as const, reason: 'prompt_injection_detected' }
    }
  }
  return { ok: true as const, reason: null }
}
