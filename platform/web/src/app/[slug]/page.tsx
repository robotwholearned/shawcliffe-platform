import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import RealtimeStorefront from '@/components/RealtimeStorefront'
import { hasComponent } from '@/lib/components'
import type { DailyStatusWithLocation, DailyStatusValue, Product, ClientBranding } from '@/lib/supabase/types'

interface Props {
  params: { slug: string }
}

// SSR on every request — Realtime client takes over after hydration
export const revalidate = 0

export default async function ClientPage({ params }: Props) {
  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: client } = await supabase
    .from('clients')
    .select('id, business_name, active, enabled_components, client_branding(primary_color, logo_url, tagline, hero_photo_urls)')
    .eq('slug', params.slug)
    .eq('active', true)
    .single()

  if (!client) notFound()

  const [statusResult, productsResult] = await Promise.all([
    supabase
      .from('daily_status')
      .select('*, locations(*)')
      .eq('client_id', client.id)
      .eq('date', today)
      .maybeSingle(),
    supabase
      .from('products')
      .select('*')
      .eq('client_id', client.id)
      .order('sort_order'),
  ])

  const status = statusResult.data as DailyStatusWithLocation | null
  const products = (productsResult.data ?? []) as Product[]
  const branding = (client as any).client_branding as Pick<ClientBranding, 'primary_color' | 'logo_url' | 'tagline' | 'hero_photo_urls'> | null

  const heroUrl = branding?.hero_photo_urls?.[0] ?? null

  return (
    <div className="min-h-screen bg-gray-50">
      <header
        className="relative bg-[var(--brand-primary,#2563eb)] pb-14"
        style={{ '--brand-primary': branding?.primary_color ?? '#2563eb' } as React.CSSProperties}
      >
        {heroUrl && (
          <>
            <img
              src={heroUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50" aria-hidden />
          </>
        )}
        <div className="relative mx-auto flex max-w-lg items-center gap-4 px-4 pt-10">
          {branding?.logo_url ? (
            <img
              src={branding.logo_url}
              alt={`${client.business_name} logo`}
              className="h-14 w-14 flex-shrink-0 rounded-xl bg-white object-contain p-1 shadow-sm"
            />
          ) : (
            <div
              aria-hidden
              className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-white/15 text-xl font-bold text-white"
            >
              {client.business_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {client.business_name}
            </h1>
            {branding?.tagline && (
              <p className="mt-0.5 text-sm text-white/75">{branding.tagline}</p>
            )}
          </div>
        </div>
      </header>

      {/* Realtime client component takes over status + products after SSR */}
      <main className="relative mx-auto -mt-8 max-w-lg px-4 pb-12">
        <RealtimeStorefront
          clientId={client.id}
          slug={params.slug}
          showStatus={hasComponent(client.enabled_components, 'status_tracker')}
          showQuote={hasComponent(client.enabled_components, 'inquiry_quote_form')}
          showBooking={hasComponent(client.enabled_components, 'booking_request_system')}
          showDocuments={hasComponent(client.enabled_components, 'document_checklist_intake')}
          initialStatus={status ? { status: status.status as DailyStatusValue, custom_message: status.custom_message } : null}
          initialProducts={products}
          hours={status?.hours_open && status?.hours_close ? `${status.hours_open} – ${status.hours_close}` : null}
          location={status?.locations ? {
            displayName: status.locations.display_name,
            address: status.locations.address,
            mapUrl: status.locations.map_url,
            parkingNotes: status.locations.parking_notes,
          } : null}
        />
      </main>
    </div>
  )
}
