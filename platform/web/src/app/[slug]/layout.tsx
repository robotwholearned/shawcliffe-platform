import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import { brandingToVars, FONT_IMPORT } from '@/lib/theme'
import type { ClientBranding } from '@/lib/supabase/types'

interface Props {
  children: React.ReactNode
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('clients')
    .select('business_name, client_branding(tagline)')
    .eq('slug', params.slug)
    .eq('active', true)
    .single()

  if (!data) return {}
  const branding = (data as any).client_branding as { tagline: string | null } | null
  return {
    title: data.business_name,
    description: branding?.tagline ?? undefined,
  }
}

export default async function ClientLayout({ children, params }: Props) {
  const supabase = createServiceClient()
  const { data: client } = await supabase
    .from('clients')
    .select('id, business_name, active, client_branding(*)')
    .eq('slug', params.slug)
    .eq('active', true)
    .single()

  if (!client) notFound()

  const branding = (client as any).client_branding as ClientBranding | null
  const cssVars = branding ? brandingToVars(branding) : {}
  const fontUrl = branding ? FONT_IMPORT[branding.font_theme] : null

  return (
    <>
      {fontUrl && (
        <link rel="preconnect" href="https://fonts.googleapis.com" />
      )}
      {fontUrl && (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link href={fontUrl} rel="stylesheet" />
      )}
      <div style={cssVars as React.CSSProperties} className="font-brand min-h-screen bg-white">
        {children}
      </div>
    </>
  )
}
