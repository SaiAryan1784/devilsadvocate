export type Role = 'user' | 'devil'

export interface Turn {
  id: string
  role: Role
  content: string
  timestamp: number
  round: number
}

export interface DebateState {
  topic: string
  turns: Turn[]
  round: number
  status: 'idle' | 'thinking' | 'active' | 'ended'
}
