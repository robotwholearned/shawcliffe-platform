'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { NotificationLog } from '@/lib/supabase/types'

const CHANNEL_LABEL: Record<string, string> = {
  sms: 'SMS',
  email: 'Email',
  push: 'Push',
  whatsapp: 'WhatsApp',
}

export default function NotificationLogPage() {
  const supabase = createClient()
  const [logs, setLogs] = useState<NotificationLog[] | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const cid: string | undefined = user?.app_metadata?.client_id ?? user?.user_metadata?.client_id
      if (!cid) { setLogs([]); return }

      const { data } = await supabase
        .from('notification_log')
        .select('*')
        .eq('client_id', cid)
        .order('sent_at', { ascending: false })
        .limit(50)

      setLogs(data ?? [])
    }
    load()
  }, [])

  return (
    <div className="p-4 space-y-4 pb-24">
      <header className="flex items-center gap-3 pt-2">
        <Link href="/seller" className="text-sm text-blue-600 hover:text-blue-700">
          ← Back
        </Link>
        <h1 className="text-lg font-bold text-gray-900">Sent Notifications</h1>
      </header>

      <section className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
        {logs === null && (
          <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>
        )}
        {logs?.length === 0 && (
          <p className="text-sm text-gray-400 py-8 text-center">No notifications sent yet.</p>
        )}
        {logs?.map(log => (
          <div key={log.id} className="flex items-center justify-between px-4 py-3 gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase">{CHANNEL_LABEL[log.channel] ?? log.channel}</span>
                <span className={`text-xs font-medium ${log.status === 'failed' ? 'text-red-500' : 'text-green-600'}`}>
                  {log.status}
                </span>
              </div>
              <p className="text-sm text-gray-800 truncate">{log.message_preview ?? '—'}</p>
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0">
              {new Date(log.sent_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </section>
    </div>
  )
}
