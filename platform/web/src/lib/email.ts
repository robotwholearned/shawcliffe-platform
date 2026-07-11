// Basic format check for customer-submitted email addresses — a UX guard
// against typos, not full RFC 5322 validation.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function emailError(raw: string): string | null {
  if (!raw) return null
  if (!EMAIL_RE.test(raw)) return 'Enter a valid email address (e.g. jane@example.com)'
  return null
}
