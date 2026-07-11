import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { hasComponent } from '@/lib/components'

// Server-mediated upload for the anonymous customer-facing Inquiry / Quote
// Form (photo_urls field) — anon can't write to the `assets` bucket directly
// (see 002_rls_policies.sql's storage policy comment), same trust model as
// api/inquiry, api/preorder, and api/signup all going through service_role.
//
// ponytail: no photo-count/size limits are specified anywhere (Ops Guide
// 11.18 just says "within agreed file limits"), so these are reasonable
// defaults, not a contract — raise them if a client actually needs more.
const MAX_FILE_BYTES = 8 * 1024 * 1024 // 8MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/webp']

export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null)
  const clientId = formData?.get('client_id')
  const file = formData?.get('file')
  const context = formData?.get('context')

  if (typeof clientId !== 'string' || !clientId) {
    return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }
  if (context !== null && context !== undefined && context !== 'inquiry' && context !== 'booking') {
    return NextResponse.json({ error: 'Invalid context' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 })
  }

  const admin = createServiceClient()

  const { data: client } = await admin
    .from('clients')
    .select('id, enabled_components')
    .eq('id', clientId)
    .eq('active', true)
    .single()

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }
  if (!hasComponent(client.enabled_components, 'photo_file_upload')) {
    return NextResponse.json({ error: 'Component not enabled' }, { status: 403 })
  }

  const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1]
  const pathPrefix = context === 'booking' ? 'pets' : 'inquiries'
  const path = `${clientId}/${pathPrefix}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await admin.storage
    .from('assets')
    .upload(path, await file.arrayBuffer(), { contentType: file.type })

  if (uploadError) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data: publicUrl } = admin.storage.from('assets').getPublicUrl(path)

  return NextResponse.json({ url: publicUrl.publicUrl }, { status: 201 })
}
