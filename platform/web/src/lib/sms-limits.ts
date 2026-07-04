import type { SupabaseClient } from '@supabase/supabase-js'
import type { Tier } from '@/lib/supabase/types'

export const SMS_MONTHLY_ALLOTMENT: Record<Tier, number> = {
  1: 0,
  2: 200,
  3: 500,
}

export function currentMonthStart(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

export async function getSmsUsageThisMonth(admin: SupabaseClient, clientId: string): Promise<number> {
  const { count } = await admin
    .from('notification_log')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('channel', 'sms')
    .gte('sent_at', currentMonthStart())

  return count ?? 0
}
