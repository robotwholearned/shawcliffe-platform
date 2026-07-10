import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.app_metadata?.role !== 'shawcliffe_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { client_id, title, description, required, needs_upload, sort_order } = body

  if (!client_id || !title) {
    return NextResponse.json({ error: 'client_id and title are required' }, { status: 400 })
  }

  const admin = createServiceClient()
  const { data: item, error } = await admin
    .from('document_checklist_items')
    .insert({
      client_id,
      title,
      description: description || null,
      required: required ?? true,
      needs_upload: needs_upload ?? true,
      sort_order: sort_order ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item }, { status: 201 })
}
