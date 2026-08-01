interface Props {
  /** Optional eyebrow label (the old uppercase <h2>). */
  title?: string
  /** Stagger the entrance animation, in ms. */
  delay?: number
  className?: string
  children: React.ReactNode
}

// White card grouping form fields, replacing the flat stacked <section>s.
// Eyebrow label uses secondary color with a short accent tick — both brand
// supporting colors, used restrained (brand craft: two-tone, thin rules).
export default function CardSection({ title, delay = 0, className = '', children }: Props) {
  return (
    <section
      className={`animate-card-enter rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ${className}`.trim()}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {title && (
        <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-secondary">
          <span aria-hidden className="inline-block h-3 w-0.5 rounded bg-brand-accent" />
          {title}
        </h2>
      )}
      <div className="space-y-3">{children}</div>
    </section>
  )
}
