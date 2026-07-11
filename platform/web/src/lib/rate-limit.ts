// ponytail: in-memory fixed-window counter — won't survive multiple server
// instances or restarts. Upgrade to a shared store (Redis/Supabase) if this
// scales past one Render instance.
const WINDOW_MS = 60_000
const MAX_REQUESTS = 20

const hits = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(key: string, max = MAX_REQUESTS, windowMs = WINDOW_MS): boolean {
  const now = Date.now()
  const entry = hits.get(key)

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= max) return false

  entry.count += 1
  return true
}
