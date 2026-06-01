/**
 * V1 — Tenant Isolation Test Suite
 * Runs on every PR. Requires CI env vars (see README below).
 *
 * Setup:
 *   1. Apply migrations + seed: supabase db push && supabase db seed
 *   2. Create two Supabase Auth users via Admin API:
 *      - client_a_staff@test.internal  → app_metadata: { client_id: CLIENT_A_ID, role: 'client_staff' }
 *      - client_b_staff@test.internal  → app_metadata: { client_id: CLIENT_B_ID, role: 'client_staff' }
 *   3. Sign each in to get JWTs, set env vars below.
 *
 * Env vars required:
 *   SUPABASE_URL, SUPABASE_ANON_KEY, CI_CLIENT_A_JWT, CI_CLIENT_B_JWT
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL  = process.env.SUPABASE_URL!
const ANON_KEY      = process.env.SUPABASE_ANON_KEY!
const CLIENT_A_JWT  = process.env.CI_CLIENT_A_JWT!
const CLIENT_B_JWT  = process.env.CI_CLIENT_B_JWT!

const CLIENT_A_ID = '00000000-0000-0000-0000-000000000001'
const CLIENT_B_ID = '00000000-0000-0000-0000-000000000002'

// Tables that must be scoped to a single client
const TENANT_TABLES = [
  'client_branding',
  'locations',
  'products',
  'daily_status',
  'customers',
  'preorders',
  'announcements',
  'notification_log',
] as const

function authedClient(jwt: string): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  })
}

describe('V1 — Tenant Isolation', () => {
  let clientA: SupabaseClient
  let clientB: SupabaseClient
  let anon: SupabaseClient

  beforeAll(() => {
    clientA = authedClient(CLIENT_A_JWT)
    clientB = authedClient(CLIENT_B_JWT)
    anon    = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } })
  })

  // ── Anon cannot read Client B's sensitive data ──────────────────────────────

  for (const table of ['customers', 'preorders', 'announcements', 'notification_log'] as const) {
    it(`anon: SELECT ${table} WHERE client_id = Client B → 0 rows`, async () => {
      const { data, error } = await anon.from(table).select('*').eq('client_id', CLIENT_B_ID)
      expect(error).toBeNull()
      expect(data).toHaveLength(0)
    })
  }

  // ── Client A staff cannot read Client B's sensitive data ────────────────────

  it('Client A staff: SELECT customers WHERE client_id = Client B → 0 rows', async () => {
    const { data } = await clientA.from('customers').select('*').eq('client_id', CLIENT_B_ID)
    expect(data).toHaveLength(0)
  })

  it('Client A staff: SELECT preorders WHERE client_id = Client B → 0 rows', async () => {
    const { data } = await clientA.from('preorders').select('*').eq('client_id', CLIENT_B_ID)
    expect(data).toHaveLength(0)
  })

  it('Client A staff: SELECT announcements WHERE client_id = Client B → 0 rows', async () => {
    const { data } = await clientA.from('announcements').select('*').eq('client_id', CLIENT_B_ID)
    expect(data).toHaveLength(0)
  })

  it('Client A staff: SELECT notification_log WHERE client_id = Client B → 0 rows', async () => {
    const { data } = await clientA.from('notification_log').select('*').eq('client_id', CLIENT_B_ID)
    expect(data).toHaveLength(0)
  })

  // ── Client A staff cannot write to Client B's data ──────────────────────────

  it('Client A staff: UPDATE products SET status=sold_out WHERE client_id = Client B → 0 rows affected', async () => {
    const { data, error } = await clientA
      .from('products')
      .update({ status: 'sold_out' })
      .eq('client_id', CLIENT_B_ID)
      .select()
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('Client A staff: UPDATE daily_status WHERE client_id = Client B → 0 rows affected', async () => {
    const { data, error } = await clientA
      .from('daily_status')
      .update({ status: 'closed' })
      .eq('client_id', CLIENT_B_ID)
      .select()
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  // Client A staff cannot INSERT a customer into Client B's account
  it('Client A staff: INSERT customer with client_id = Client B → error or 0 rows', async () => {
    const { data, error } = await clientA
      .from('customers')
      .insert({
        client_id: CLIENT_B_ID,
        name: 'Injection Attempt',
        consent_text_version: 'v1',
        consent_ip_hash: 'hash',
      })
      .select()
    // RLS should block this — either an error or empty result
    const inserted = data ?? []
    expect(inserted.filter((r: any) => r.client_id === CLIENT_B_ID)).toHaveLength(0)
    if (!error) {
      // If no error, ensure nothing landed in Client B's space
      const { data: check } = await clientB.from('customers').select('*').eq('name', 'Injection Attempt')
      expect(check).toHaveLength(0)
    }
  })

  // ── Client A staff can read and write their OWN data ────────────────────────

  it('Client A staff: SELECT products WHERE client_id = Client A → ≥ 1 row', async () => {
    const { data, error } = await clientA.from('products').select('*').eq('client_id', CLIENT_A_ID)
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThanOrEqual(1)
  })

  it('Client A staff: UPDATE own product status → success', async () => {
    const { data: products } = await clientA
      .from('products')
      .select('id')
      .eq('client_id', CLIENT_A_ID)
      .limit(1)
    expect(products).not.toHaveLength(0)

    const { error } = await clientA
      .from('products')
      .update({ status: 'available' })
      .eq('client_id', CLIENT_A_ID)
      .eq('id', products![0].id)
    expect(error).toBeNull()
  })

  // ── Storage isolation ────────────────────────────────────────────────────────

  it('Client A staff: cannot download Client B storage asset', async () => {
    const { data, error } = await clientA.storage
      .from('assets')
      .download(`${CLIENT_B_ID}/logo.png`)
    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  // ── Realtime channel isolation ───────────────────────────────────────────────

  it('Client A staff: subscribing to Client B Realtime channel is rejected or receives no data', async () => {
    const unauthorizedDataReceived: unknown[] = []

    await new Promise<void>((resolve) => {
      const channel = clientA.channel(`tenant:${CLIENT_B_ID}:status`)

      channel
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'daily_status', filter: `client_id=eq.${CLIENT_B_ID}` },
          (payload) => { unauthorizedDataReceived.push(payload) }
        )
        .subscribe((status) => {
          // CHANNEL_ERROR means authorization rejected — the expected outcome
          // SUBSCRIBED without data is also acceptable (RLS filters changes)
          if (status === 'CHANNEL_ERROR' || status === 'SUBSCRIBED') {
            clientA.removeChannel(channel).then(() => resolve())
          }
        })

      setTimeout(() => {
        clientA.removeChannel(channel).then(() => resolve())
      }, 4000)
    })

    expect(unauthorizedDataReceived).toHaveLength(0)
  })
})
