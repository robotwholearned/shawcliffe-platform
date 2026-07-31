import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { hasComponent } from '@/lib/components'
import DocumentsForm from './DocumentsForm'
import type { DocumentChecklistItem } from '@/lib/supabase/types'

interface Props {
  params: { slug: string }
}

// SSR on every request — enabled_components must reflect live admin toggles
export const revalidate = 0

export default async function DocumentsPage({ params }: Props) {
  const supabase = createServiceClient()
  const { data: client } = await supabase
    .from('clients')
    .select('id, business_name, active, enabled_components, client_branding(primary_color, logo_url, tagline, hero_photo_urls)')
    .eq('slug', params.slug)
    .eq('active', true)
    .single()

  if (!client || !hasComponent(client.enabled_components, 'document_checklist_intake')) notFound()

  const branding = (client as any).client_branding as { primary_color: string | null; logo_url: string | null; tagline: string | null; hero_photo_urls: string[] | null } | null

  const { data: items } = await supabase
    .from('document_checklist_items')
    .select('*')
    .eq('client_id', client.id)
    .order('sort_order')

  return (
    <DocumentsForm
      clientId={client.id}
      businessName={client.business_name}
      slug={params.slug}
      logoUrl={branding?.logo_url ?? null}
      tagline={branding?.tagline ?? null}
      primaryColor={branding?.primary_color ?? null}
      heroUrl={branding?.hero_photo_urls?.[0] ?? null}
      initialItems={(items ?? []) as DocumentChecklistItem[]}
    />
  )
}
