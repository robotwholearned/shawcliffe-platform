import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  getAuthedUser: vi.fn(),
  createServiceClient: vi.fn(),
}))

import { getAuthedUser, createServiceClient } from '@/lib/supabase/server'
import { GET as getPets } from './pets/route'
import { GET as getVehicles } from './vehicles/route'
import { GET as getProperties } from './properties/route'

const mockedGetAuthedUser = vi.mocked(getAuthedUser)
const mockedCreateServiceClient = vi.mocked(createServiceClient)

// Builds a fake Supabase query builder per table. Each method records its
// calls (so tests can assert `.eq('client_id', ...)` was used) and the
// builder resolves to `responses[table]` whether awaited directly or via
// `.single()`.
function mockAdmin(responses: Record<string, { data: unknown; error?: unknown; count?: number }>) {
  const builders: Record<string, any> = {}
  const from = vi.fn((table: string) => {
    const result = responses[table] ?? { data: null, error: null }
    const builder: any = {}
    for (const method of ['select', 'eq', 'order', 'range', 'in']) {
      builder[method] = vi.fn(() => builder)
    }
    builder.single = vi.fn(() => Promise.resolve(result))
    builder.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject)
    builders[table] = builder
    return builder
  })
  return { from, builders }
}

const routes = [
  { name: 'pets', GET: getPets, component: 'pet_profiles' },
  { name: 'vehicles', GET: getVehicles, component: 'vehicle_profiles' },
  { name: 'properties', GET: getProperties, component: 'property_profiles' },
] as const

beforeEach(() => {
  vi.clearAllMocks()
})

describe.each(routes)('GET /api/seller/$name', ({ name, GET, component }) => {
  const url = `http://localhost/api/seller/${name}`

  it('rejects an unauthenticated request', async () => {
    mockedGetAuthedUser.mockResolvedValue(null)
    const res = await GET(new NextRequest(url))
    expect(res.status).toBe(401)
  })

  it('rejects a role outside client_staff/shawcliffe_admin', async () => {
    mockedGetAuthedUser.mockResolvedValue({
      app_metadata: { role: 'customer', client_id: 'client-a' },
    } as any)
    const res = await GET(new NextRequest(url))
    expect(res.status).toBe(401)
  })

  it('scopes the query to the caller\'s own client_id', async () => {
    mockedGetAuthedUser.mockResolvedValue({
      app_metadata: { role: 'client_staff', client_id: 'client-a' },
    } as any)
    const admin = mockAdmin({
      clients: { data: { enabled_components: [component] } },
      [name]: { data: [], error: null, count: 0 },
    })
    mockedCreateServiceClient.mockReturnValue(admin as any)

    const res = await GET(new NextRequest(url))

    expect(res.status).toBe(200)
    expect(admin.builders.clients.eq).toHaveBeenCalledWith('id', 'client-a')
    expect(admin.builders[name].eq).toHaveBeenCalledWith('client_id', 'client-a')
    // every client_id filter on this query used the caller's own id, never another tenant's
    const clientIdCalls = admin.builders[name].eq.mock.calls.filter((args: unknown[]) => args[0] === 'client_id')
    expect(clientIdCalls).toEqual([['client_id', 'client-a']])
  })
})
