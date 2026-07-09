import type { DailyStatusValue } from '@/lib/supabase/types'

interface StatusConfig {
  label: string
  dot: string
  text: string
  live?: boolean
}

const CONFIG: Record<DailyStatusValue, StatusConfig> = {
  open:          { label: 'Open Now',      dot: 'bg-emerald-500', text: 'text-emerald-700', live: true },
  opening_soon:  { label: 'Opening Soon',  dot: 'bg-emerald-400', text: 'text-emerald-700', live: true },
  closed:        { label: 'Closed',        dot: 'bg-gray-400',    text: 'text-gray-600' },
  sold_out:      { label: 'Sold Out',      dot: 'bg-red-500',     text: 'text-red-700' },
  back_tomorrow: { label: 'Back Tomorrow', dot: 'bg-amber-500',   text: 'text-amber-700' },
  weather_delay: { label: 'Weather Delay', dot: 'bg-sky-500',     text: 'text-sky-700' },
}

interface Props {
  status: DailyStatusValue | null
  customMessage?: string | null
}

export default function StatusBadge({ status, customMessage }: Props) {
  if (!status) {
    return (
      <div className="flex items-center gap-2.5">
        <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-gray-300" />
        <span className="text-[15px] font-semibold text-gray-400">No update yet today</span>
      </div>
    )
  }

  const cfg = CONFIG[status]
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
          {cfg.live && (
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${cfg.dot}`} />
          )}
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
        </span>
        <span className={`text-base font-bold tracking-tight ${cfg.text}`}>{cfg.label}</span>
      </div>
      {customMessage && (
        <p className="mt-1 pl-5 text-sm leading-relaxed text-gray-600">{customMessage}</p>
      )}
    </div>
  )
}
