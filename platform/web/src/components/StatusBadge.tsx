import type { DailyStatusValue } from '@/lib/supabase/types'

const CONFIG: Record<DailyStatusValue, { label: string; bg: string; text: string; icon: string }> = {
  open:          { label: 'Open',          bg: 'bg-green-100',  text: 'text-green-800', icon: '✓'  },
  closed:        { label: 'Closed',        bg: 'bg-gray-100',   text: 'text-gray-600',  icon: '✕'  },
  sold_out:      { label: 'Sold Out',      bg: 'bg-red-100',    text: 'text-red-700',   icon: '✕'  },
  back_tomorrow: { label: 'Back Tomorrow', bg: 'bg-yellow-100', text: 'text-yellow-800',icon: '↺'  },
  weather_delay: { label: 'Weather Delay', bg: 'bg-blue-100',   text: 'text-blue-700',  icon: '⛈' },
  opening_soon:  { label: 'Opening Soon',  bg: 'bg-green-50',   text: 'text-green-700', icon: '⏱' },
}

interface Props {
  status: DailyStatusValue | null
  customMessage?: string | null
}

export default function StatusBadge({ status, customMessage }: Props) {
  if (!status) {
    return (
      <div className="rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-400">
        No update yet today
      </div>
    )
  }

  const cfg = CONFIG[status]
  return (
    <div className={`rounded-xl px-4 py-3 ${cfg.bg} ${cfg.text} flex items-start gap-2.5`}>
      <span className="text-lg leading-none mt-0.5">{cfg.icon}</span>
      <div>
        <span className="font-semibold">{cfg.label}</span>
        {customMessage && (
          <p className="text-sm opacity-80 mt-0.5">{customMessage}</p>
        )}
      </div>
    </div>
  )
}
