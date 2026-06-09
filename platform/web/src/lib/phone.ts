// Normalize a phone number to E.164 format (+1XXXXXXXXXX for CA/US)
// Returns null if the number is invalid.
export function normalizePhone(raw: string): string | null {
  // Strip everything except digits and leading +
  const digits = raw.replace(/[^\d+]/g, '')
  const digitsOnly = digits.replace(/\D/g, '')

  // Already E.164 with country code
  if (digits.startsWith('+') && digitsOnly.length >= 10 && digitsOnly.length <= 15) {
    return `+${digitsOnly}`
  }

  // 10-digit North American number — assume +1
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`
  }

  // 11-digit starting with 1 (1XXXXXXXXXX)
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`
  }

  return null
}

export function phoneError(raw: string): string | null {
  if (!raw) return null
  const normalized = normalizePhone(raw)
  if (!normalized) return 'Enter a valid phone number (e.g. (289) 555-0100)'
  return null
}
