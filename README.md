# Devil's Advocate

A structured adversarial thinking tool that stress-tests your technical decisions and startup ideas. You describe your idea. The AI argues against it. Hard, specifically, without mercy. You push back. It pushes harder. After 8 rounds, you've either abandoned the idea or forged it into something defensible.

This is not a chatbot. It's a thinking tool built for founders and engineers who need honest, adversarial feedback before committing to a decision.

**Live:** [devils-advocate.vercel.app](https://devils-advocate.vercel.app)

---

## How It Works

1. **Describe your decision.** A technical architecture choice, a startup idea, a product bet.
2. **The Devil responds.** Short, sharp, specific. No fluff, no encouragement. Just the flaw.
3. **Defend your position.** Push back with your reasoning.
4. **Repeat for up to 8 rounds.** The AI escalates, finding new angles of attack each round.
5. **Walk away sharper.** You've either found the cracks in your thinking or proven it holds up under pressure.

---

## Screenshots

| Initial State | Mid-Debate |
|:---:|:---:|
| Clean, focused input. One textarea. One purpose. | The Devil's response streams in word by word in serif typography. Your defense in monospace below. |

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Framework** | Next.js 15 (App Router, TypeScript) | Server-side streaming, API routes, edge runtime |
| **Styling** | Tailwind CSS v4 + Custom CSS | Design system with CSS variables, zero runtime overhead |
| **AI Inference** | Groq API (LLaMA 3.3 70B) | Sub-second inference latency, free tier for demos |
| **Rate Limiting** | Upstash Redis | Serverless Redis with sliding window rate limiting |
| **Deployment** | Vercel (Edge Runtime) | Native streaming support, zero cold starts |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Client (React)                                             │
│                                                             │
│  DebateArena ──> InputForm ──> MessageBubble                │
│       │              │              │                       │
│       │         TurnCounter    RateLimitGate                │
│       │                                                     │
│  State: topic, turns[], round, status, streamingText        │
│  localStorage: client-side rate limit (UX layer)            │
└──────────────────────┬──────────────────────────────────────┘
                       │ POST /api/argue
                       │ { topic, turns, round }
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  API Route (Edge Runtime)                                   │
│                                                             │
│  1. Input Validation (guardrails.ts)                        │
│     - Length limits, prompt injection detection              │
│     - Blocked pattern matching (regex)                      │
│                                                             │
│  2. Rate Limiting (Upstash Redis)                           │
│     - 2 sessions/IP/day, checked on round 1 only            │
│     - Sliding window algorithm                              │
│                                                             │
│  3. LLM Inference (Groq)                                    │
│     - Primary: llama-3.3-70b-versatile                      │
│     - Fallback: llama-3.1-8b-instant (on 429)               │
│     - Streaming via ReadableStream                          │
│                                                             │
│  4. System Prompt (round-aware escalation)                  │
│     - Round 1: Attack the core assumption                   │
│     - Round 2: Attack the defense                           │
│     - Round 3+: Target their highest confidence area        │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Technical Decisions

### Streaming Architecture
Responses stream token-by-token from Groq through the Edge Runtime directly to the client via `ReadableStream`. No SSE, no WebSockets, no polling. The client reads chunks with `response.body.getReader()` and appends them to the DOM in real time. This creates the tension the product depends on: watching the devil build its argument word by word.

### Two-Layer Rate Limiting
Rate limiting runs at two layers for different reasons:

- **Server (Upstash Redis):** Real enforcement. Sliding window of 2 debates per IP per 24 hours. Checked only on round 1 to avoid burning Redis commands mid-debate.
- **Client (localStorage):** Pure UX. Prevents the round-trip latency of hitting the server just to get a 429. If the client knows you're blocked, it shows the gate immediately.

### Prompt Engineering as Product
The system prompt is not an afterthought. It's the core product logic. Key design choices:

- **120-word max** forces the AI to be concise and pointed
- **No bullet points** rule prevents lazy enumeration
- **No rhetorical questions** rule prevents weak openings
- **Round-aware escalation** makes each response strategically different
- **Paragraph prose only** creates a more human, confrontational tone

### Security Guardrails
Input validation runs before any LLM call:

- Topic length: 20-600 characters
- Turn length: max 800 characters
- Max rounds: 8 (hard cap)
- Prompt injection detection via regex patterns (jailbreak, DAN, instruction override)

---

## Design Philosophy

**Court transcript meets terminal.** The interface is deliberately stark. No color except one red (`#C0392B`) for the devil's label. No dark mode. No decorative elements.

- **Devil's voice:** Instrument Serif at 20px. Weight and gravity.
- **User's voice:** Geist Mono at 15px. Precision and clarity.
- **Labels:** 11px monospace, uppercase, letter-spaced. Institutional.
- **Background:** Off-white (`#F7F5F0`). Warm but serious.

The design amplifies the tension of the interaction. Every aesthetic choice serves the adversarial dynamic.

---

## Project Structure

```
├── app/
│   ├── layout.tsx              # Root layout, fonts, metadata
│   ├── page.tsx                # Main page (renders DebateArena)
│   ├── globals.css             # Design system, CSS variables, animations
│   └── api/
│       └── argue/
│           └── route.ts        # Streaming API, rate limiting, Groq inference
├── components/
│   ├── DebateArena.tsx         # Core stateful component (all debate logic)
│   ├── MessageBubble.tsx       # Renders user/devil turns with proper typography
│   ├── InputForm.tsx           # Auto-resizing textarea with validation
│   ├── TurnCounter.tsx         # Round indicator (round X of 8)
│   └── RateLimitGate.tsx       # Blocked state with live countdown
├── lib/
│   ├── groq.ts                 # Groq client singleton
│   ├── ratelimit.ts            # Upstash rate limiter (conditional on env vars)
│   ├── systemPrompt.ts        # Round-aware system prompt builder
│   └── guardrails.ts           # Input validation + injection detection
└── types/
    └── debate.ts               # TypeScript types (Turn, DebateState, Role)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Groq API key](https://console.groq.com) (free tier)
- An [Upstash Redis database](https://console.upstash.com) (free tier, optional)

### Setup

```bash
# Clone the repo
git clone https://github.com/SaiAryan1784/devilsadvocate.git
cd devilsadvocate

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

Add your keys to `.env`:

```env
GROQ_API_KEY=your_groq_api_key
UPSTASH_REDIS_REST_URL=your_upstash_url        # optional
UPSTASH_REDIS_REST_TOKEN=your_upstash_token     # optional
```

### Run

```bash
npm run dev        # Start dev server at localhost:3000
npm run build      # Production build
npm run lint       # ESLint check
```

---

## Deployment

Deployed on Vercel with Edge Runtime for native streaming support.

```bash
vercel deploy
```

Add `GROQ_API_KEY`, `UPSTASH_REDIS_REST_URL`, and `UPSTASH_REDIS_REST_TOKEN` as environment variables in your Vercel project settings.

---

## What I Deliberately Cut

This project is scoped intentionally. These features were considered and explicitly excluded:

- **Share/export** - not needed for the core loop
- **Save/history** - no persistence, no accounts
- **Authentication** - zero-friction, anonymous usage
- **Mobile optimization** - desktop-first for the demo
- **Dark mode** - the light starkness is a design choice
- **Scoring/verdict** - the user decides, not the tool

---

## What 10 More Hours Would Add

- **Argument memory:** The devil tracks what you've already conceded and uses it against you
- **Decision log export:** Download the full debate as a structured document
- **Intensity modes:** Skeptic / Investor / Co-founder (different system prompts)
- **Session persistence:** Resume debates across browser sessions

---

## Built By

[saiaryan.in](https://saiaryan.in)
