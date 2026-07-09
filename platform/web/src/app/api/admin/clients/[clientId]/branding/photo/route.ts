import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Admin-only upload for branding images (logo/app icon/splash/hero photos).
// Mirrors api/inquiry/photos/route.ts's upload-and-return-url contract — this
// route doesn't touch client_branding, the caller persists the URL via PATCH.
const MAX_FILE_BYTES = 8 * 1024 * 1024 // 8MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/webp']
const FIELDS = ['logo', 'app_icon', 'splash', 'hero']

async function requireAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.app_metadata?.role === 'shawcliffe_admin'
}

export async function POST(req: NextRequest, { params }: { params: { clientId: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData().catch(() => null)
  const file = formData?.get('file')
  const field = formData?.get('field')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }
  if (typeof field !== 'string' || !FIELDS.includes(field)) {
    return NextResponse.json({ error: 'field must be one of ' + FIELDS.join(', ') }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 })
  }

  const admin = createServiceClient()

  const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1]
  const path = `${params.clientId}/branding/${field}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await admin.storage
    .from('assets')
    .upload(path, await file.arrayBuffer(), { contentType: file.type })

  if (uploadError) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data: publicUrl } = admin.storage.from('assets').getPublicUrl(path)

  return NextResponse.json({ url: publicUrl.publicUrl }, { status: 201 })
}
