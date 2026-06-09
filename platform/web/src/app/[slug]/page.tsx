import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import RealtimeStorefront from '@/components/RealtimeStorefront'
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
    .select('id, business_name, active, client_branding(logo_url, tagline, hero_photo_urls)')
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
  const branding = (client as any).client_branding as Pick<ClientBranding, 'logo_url' | 'tagline' | 'hero_photo_urls'> | null

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <header className="flex items-center gap-3 py-1">
        {branding?.logo_url && (
          <img
            src={branding.logo_url}
            alt={`${client.business_name} logo`}
            className="w-12 h-12 object-contain rounded-lg"
          />
        )}
        <div>
          <h1 className="text-xl font-bold text-gray-900">{client.business_name}</h1>
          {branding?.tagline && (
            <p className="text-sm text-gray-500">{branding.tagline}</p>
          )}
        </div>
      </header>

      {status?.locations && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-1">
          <p className="font-medium text-sm text-gray-800">{status.locations.display_name}</p>
          {status.locations.address && (
            <a
              href={
                status.locations.map_url ??
                `https://maps.google.com/?q=${encodeURIComponent(status.locations.address)}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--brand-primary)] underline"
            >
              {status.locations.address} →
            </a>
          )}
          {status.locations.parking_notes && (
            <p className="text-xs text-gray-400 pt-0.5">{status.locations.parking_notes}</p>
          )}
        </div>
      )}

      {status?.hours_open && status?.hours_close && (
        <p className="text-sm text-gray-500">
          Hours: {status.hours_open} – {status.hours_close}
        </p>
      )}

      {/* Realtime client component takes over status + products after SSR */}
      <RealtimeStorefront
        clientId={client.id}
        slug={params.slug}
        initialStatus={status ? { status: status.status as DailyStatusValue, custom_message: status.custom_message } : null}
        initialProducts={products}
      />
    </main>
  )
}
