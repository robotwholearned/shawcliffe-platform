import type { Client } from '@/lib/supabase/types'

export function clientStatusLabel(c: Pick<Client, 'active' | 'paused'>): string {
  if (!c.active) return 'Suspended'
  if (c.paused) return 'Paused (Seasonal)'
  return 'Active'
}

export function clientStatusClass(c: Pick<Client, 'active' | 'paused'>): string {
  if (!c.active) return 'bg-red-100 text-red-600'
  if (c.paused) return 'bg-amber-100 text-amber-700'
  return 'bg-green-100 text-green-700'
}
