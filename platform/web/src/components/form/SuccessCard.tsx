interface Props {
  businessName: string
  logoUrl?: string | null
  title: string
  message: string
  slug: string
}

// Branded success state — replaces the bare ✓ emoji block. Logo chip (first-initial
// fallback) + brand-colored checkmark ring + message + back link.
export default function SuccessCard({ businessName, logoUrl, title, message, slug }: Props) {
  return (
    <div className="animate-card-enter rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`${businessName} logo`}
          className="mx-auto h-16 w-16 rounded-xl bg-white object-contain p-1 shadow-sm"
        />
      ) : (
        <div
          aria-hidden
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-primary text-3xl font-bold text-white"
        >
          ✓
        </div>
      )}
      <h1 className="mt-4 text-xl font-bold text-gray-900">{title}</h1>
      <p className="mt-2 text-sm text-gray-500">{message}</p>
      <a href={`/${slug}`} className="mt-4 inline-block text-sm font-medium text-brand-primary hover:underline">
        ← Back to storefront
      </a>
    </div>
  )
}
