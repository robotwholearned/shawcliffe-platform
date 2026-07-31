import { isLightColor } from '@/lib/theme'

interface Props {
  businessName: string
  logoUrl?: string | null
  tagline?: string | null
  /** First hero photo, if any — mirrors the storefront header. */
  heroUrl?: string | null
  /** Client primary_color hex; drives readable header text when no hero photo. */
  primaryColor?: string | null
  children: React.ReactNode
}

// Reusable branded surface extracted from the storefront hero ([slug]/page.tsx).
// Header = brand-primary background + logo chip (first-initial fallback) + name + tagline;
// body sits in a -mt-8 card overlapping the header. Brand colors come from the CSS vars the
// [slug] layout already injects (--brand-primary etc.), so bg-brand-primary resolves per-tenant.
export default function BrandedShell({ businessName, logoUrl, tagline, heroUrl, primaryColor, children }: Props) {
  // A hero photo carries a dark overlay, so white text is always safe over it.
  // Without one, a light primary_color would make white text unreadable → use dark text.
  const dark = !heroUrl && isLightColor(primaryColor)
  const nameText = dark ? 'text-gray-900' : 'text-white'
  const taglineText = dark ? 'text-gray-900/70' : 'text-white/75'
  const fallbackChip = dark ? 'bg-black/10 text-gray-900' : 'bg-white/15 text-white'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="relative bg-brand-primary pb-14">
        {heroUrl && (
          <>
            <img src={heroUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/50" aria-hidden />
          </>
        )}
        <div className="relative mx-auto flex max-w-lg items-center gap-4 px-4 pt-10">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${businessName} logo`}
              className="h-14 w-14 flex-shrink-0 rounded-xl bg-white object-contain p-1 shadow-sm"
            />
          ) : (
            <div
              aria-hidden
              className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl text-xl font-bold ${fallbackChip}`}
            >
              {businessName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h1 className={`text-2xl font-bold tracking-tight ${nameText}`}>{businessName}</h1>
            {tagline && <p className={`mt-0.5 text-sm ${taglineText}`}>{tagline}</p>}
          </div>
        </div>
      </header>

      <main className="relative mx-auto -mt-8 max-w-lg px-4 pb-16">{children}</main>
    </div>
  )
}
