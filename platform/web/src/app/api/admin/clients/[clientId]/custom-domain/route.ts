import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createCustomHostname, getCustomHostname, deleteCustomHostname, type CustomHostname } from '@/lib/cloudflare'

const ERROR_STATUSES = new Set([
  'blocked', 'pending_deletion', 'deleted', 'moved', 'test_blocked', 'test_failed',
  'initializing_timed_out', 'validation_timed_out', 'issuance_timed_out', 'deployment_timed_out', 'deletion_timed_out',
  'expired', 'inactive',
])

function mapStatus(hostname: CustomHostname): 'pending' | 'active' | 'error' {
  if (ERROR_STATUSES.has(hostname.status) || ERROR_STATUSES.has(hostname.ssl.status)) return 'error'
  if (hostname.status === 'active' && hostname.ssl.status === 'active') return 'active'
  return 'pending'
}

async function requireAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.app_metadata?.role === 'shawcliffe_admin'
}

// Creates a Cloudflare for SaaS custom hostname for this client's own domain
// (e.g. tomsproduce.com) so the platform can serve it directly with a
// managed cert, without the client leaving Shawcliffe's Cloudflare zone.
export async function POST(req: NextRequest, { params }: { params: { clientId: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { domain } = await req.json()
  if (!domain || typeof domain !== 'string') {
    return NextResponse.json({ error: 'domain is required' }, { status: 400 })
  }

  const admin = createServiceClient()

  const { data: existing } = await admin
    .from('client_branding')
    .select('custom_hostname_id')
    .eq('client_id', params.clientId)
    .single()

  if (existing?.custom_hostname_id) {
    return NextResponse.json({ error: 'This client already has a custom domain configured' }, { status: 409 })
  }

  let hostname: CustomHostname
  try {
    hostname = await createCustomHostname(domain)
  } catch (err: any) {
    return NextResponse.json({ error: `Cloudflare: ${err.message}` }, { status: 502 })
  }

  const { error } = await admin
    .from('client_branding')
    .update({
      custom_domain: domain,
      custom_hostname_id: hostname.id,
      custom_domain_status: mapStatus(hostname),
      custom_domain_ssl_status: hostname.ssl.status,
      custom_domain_verification: hostname as unknown as Record<string, unknown>,
      custom_domain_updated_at: new Date().toISOString(),
    })
    .eq('client_id', params.clientId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, hostname })
}

// Refreshes verification/SSL status from Cloudflare.
export async function GET(req: NextRequest, { params }: { params: { clientId: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createServiceClient()
  const { data: branding } = await admin
    .from('client_branding')
    .select('custom_hostname_id')
    .eq('client_id', params.clientId)
    .single()

  if (!branding?.custom_hostname_id) {
    return NextResponse.json({ error: 'No custom domain configured for this client' }, { status: 404 })
  }

  let hostname: CustomHostname
  try {
    hostname = await getCustomHostname(branding.custom_hostname_id)
  } catch (err: any) {
    return NextResponse.json({ error: `Cloudflare: ${err.message}` }, { status: 502 })
  }

  const { error } = await admin
    .from('client_branding')
    .update({
      custom_domain_status: mapStatus(hostname),
      custom_domain_ssl_status: hostname.ssl.status,
      custom_domain_verification: hostname as unknown as Record<string, unknown>,
      custom_domain_updated_at: new Date().toISOString(),
    })
    .eq('client_id', params.clientId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, hostname })
}

// Removes the custom hostname entirely (client stays reachable at {slug}.shawcliffedigital.com).
export async function DELETE(req: NextRequest, { params }: { params: { clientId: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createServiceClient()
  const { data: branding } = await admin
    .from('client_branding')
    .select('custom_hostname_id')
    .eq('client_id', params.clientId)
    .single()

  if (!branding?.custom_hostname_id) {
    return NextResponse.json({ error: 'No custom domain configured for this client' }, { status: 404 })
  }

  try {
    await deleteCustomHostname(branding.custom_hostname_id)
  } catch (err: any) {
    return NextResponse.json({ error: `Cloudflare: ${err.message}` }, { status: 502 })
  }

  const { error } = await admin
    .from('client_branding')
    .update({
      custom_domain: null,
      custom_hostname_id: null,
      custom_domain_status: 'not_started',
      custom_domain_ssl_status: null,
      custom_domain_verification: null,
      custom_domain_updated_at: new Date().toISOString(),
    })
    .eq('client_id', params.clientId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
