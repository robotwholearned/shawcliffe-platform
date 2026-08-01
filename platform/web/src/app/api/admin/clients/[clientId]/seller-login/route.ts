import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: { clientId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.app_metadata?.role !== 'shawcliffe_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

  const admin = createServiceClient()

  const { data: client } = await admin
    .from('clients')
    .select('id')
    .eq('id', params.clientId)
    .single()

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const password = randomBytes(9).toString('base64url')

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: 'client_staff', client_id: client.id },
  })

  if (error) {
    const isDuplicate = error.status === 422 || error.message.toLowerCase().includes('already')
    return NextResponse.json(
      { error: isDuplicate ? `An account for ${email} already exists` : error.message },
      { status: isDuplicate ? 409 : 500 }
    )
  }

  return NextResponse.json({ email, password })
}
