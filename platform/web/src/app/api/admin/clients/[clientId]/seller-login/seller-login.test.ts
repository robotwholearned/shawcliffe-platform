import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { POST } from './route'

const mockedCreateClient = vi.mocked(createClient)
const mockedCreateServiceClient = vi.mocked(createServiceClient)

function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/admin/clients/client-a/seller-login', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

function mockAuthedAdmin(role = 'shawcliffe_admin') {
  mockedCreateClient.mockReturnValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { app_metadata: { role } } } }) },
  } as any)
}

function mockService({ clientFound = true, createUserError = null as { status?: number; message: string } | null }) {
  mockedCreateServiceClient.mockReturnValue({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: clientFound ? { id: 'client-a' } : null }),
    })),
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue({ data: createUserError ? null : { user: { id: 'user-1' } }, error: createUserError }),
      },
    },
  } as any)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/admin/clients/[clientId]/seller-login', () => {
  it('rejects a non-admin caller', async () => {
    mockAuthedAdmin('client_staff')
    mockService({})
    const res = await POST(postRequest({ email: 'seller@example.com' }), { params: { clientId: 'client-a' } })
    expect(res.status).toBe(401)
  })

  it('404s when the client does not exist', async () => {
    mockAuthedAdmin()
    mockService({ clientFound: false })
    const res = await POST(postRequest({ email: 'seller@example.com' }), { params: { clientId: 'client-a' } })
    expect(res.status).toBe(404)
  })

  it('creates a seller login and returns the generated password once', async () => {
    mockAuthedAdmin()
    mockService({})
    const res = await POST(postRequest({ email: 'seller@example.com' }), { params: { clientId: 'client-a' } })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.email).toBe('seller@example.com')
    expect(typeof data.password).toBe('string')
    expect(data.password.length).toBeGreaterThan(0)
  })

  it('returns 409 when the email is already registered', async () => {
    mockAuthedAdmin()
    mockService({ createUserError: { status: 422, message: 'User already registered' } })
    const res = await POST(postRequest({ email: 'seller@example.com' }), { params: { clientId: 'client-a' } })
    expect(res.status).toBe(409)
  })
})
