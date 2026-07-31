interface Props {
  loading: boolean
  loadingLabel: string
  children: React.ReactNode
  disabled?: boolean
}

// Brand-primary submit CTA that owns its loading label. Presentation only —
// the parent still controls `disabled` and the actual submit handler.
export default function SubmitButton({ loading, loadingLabel, children, disabled }: Props) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full rounded-xl bg-brand-primary py-3.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
    >
      {loading ? loadingLabel : children}
    </button>
  )
}
