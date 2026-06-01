import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/StatusBadge'
import ProductCard from '@/components/ProductCard'
import type { DailyStatusWithLocation, Product, ClientBranding } from '@/lib/supabase/types'

interface Props {
  params: { slug: string }
}

// Always SSR-fresh — status and products change frequently
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

      <StatusBadge status={status?.status ?? null} customMessage={status?.custom_message} />

      {status?.hours_open && status?.hours_close && (
        <p className="text-sm text-gray-500">
          Hours: {status.hours_open} – {status.hours_close}
        </p>
      )}

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

      {products.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Today's Products
          </h2>
          {products.map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </section>
      )}

      {products.length === 0 && status?.status === 'open' && (
        <p className="text-sm text-gray-400 text-center py-8">No products listed yet.</p>
      )}
    </main>
  )
}
