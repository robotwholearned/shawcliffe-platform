import type { SupabaseClient } from '@supabase/supabase-js'
import type { Tier } from '@/lib/supabase/types'

export const SMS_MONTHLY_ALLOTMENT: Record<Tier, number> = {
  1: 0,
  2: 200,
  3: 500,
}

// Email costs money per send (Resend); same ceiling as SMS.
export const EMAIL_MONTHLY_ALLOTMENT: Record<Tier, number> = {
  1: 0,
  2: 200,
  3: 500,
}

// Push is free (FCM/APNs); ceiling exists only to guard against abuse/bugs.
export const PUSH_MONTHLY_ALLOTMENT: Record<Tier, number> = {
  1: 500,
  2: 2000,
  3: 5000,
}

export function currentMonthStart(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

export type NotificationChannel = 'sms' | 'email' | 'push'

export async function getUsageThisMonth(
  admin: SupabaseClient,
  clientId: string,
  channel: NotificationChannel
): Promise<number> {
  const { count } = await admin
    .from('notification_log')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('channel', channel)
    .gte('sent_at', currentMonthStart())

  return count ?? 0
}

export async function getSmsUsageThisMonth(admin: SupabaseClient, clientId: string): Promise<number> {
  return getUsageThisMonth(admin, clientId, 'sms')
}
