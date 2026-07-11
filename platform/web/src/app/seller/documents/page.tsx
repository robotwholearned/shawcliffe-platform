'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useEnabledComponents } from '@/lib/use-enabled-components'

interface Submission {
  id: string
  file_url: string | null
  submitted_at: string
  customer: { name: string; phone: string | null; email: string | null } | null
  checklist_item: { title: string } | null
}

export default function DocumentSubmissionsPage() {
  const { has, loading: gateLoading } = useEnabledComponents()
  const [submissions, setSubmissions] = useState<Submission[] | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const pageSize = 25

  useEffect(() => {
    if (gateLoading || !has('document_checklist_intake')) return
    const controller = new AbortController()
    setSubmissions(null)
    fetch(`/api/seller/document-submissions?page=${page}`, { signal: controller.signal })
      .then(r => (r.ok ? r.json() : { submissions: [], total: 0 }))
      .then(d => { setSubmissions(d.submissions ?? []); setTotal(d.total ?? 0) })
      .catch(() => {})
    return () => controller.abort()
  }, [gateLoading, has, page])

  if (gateLoading) {
    return <div className="flex items-center justify-center min-h-screen"><p className="text-sm text-gray-400">Loading…</p></div>
  }

  if (!has('document_checklist_intake')) {
    return (
      <div className="flex items-center justify-center min-h-screen px-6">
        <p className="text-sm text-gray-400 text-center">Document Checklist isn't enabled for your account.</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <header className="flex items-center gap-3 pt-2">
        <Link href="/seller" className="text-sm text-blue-600 hover:text-blue-700">← Back</Link>
        <h1 className="text-lg font-bold text-gray-900">Documents</h1>
      </header>

      <section className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
        {submissions === null && <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>}
        {submissions?.length === 0 && <p className="text-sm text-gray-400 py-8 text-center">No documents submitted yet.</p>}
        {submissions?.map(s => (
          <div key={s.id} className="px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-gray-800 truncate">
                {s.checklist_item?.title || 'General submission'}
              </span>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {new Date(s.submitted_at).toLocaleDateString()}
              </span>
            </div>
            {s.customer && (
              <div className="text-xs text-gray-500 flex flex-wrap gap-x-3">
                <span>{s.customer.name}</span>
                {s.customer.phone && <span>{s.customer.phone}</span>}
                {s.customer.email && <span>{s.customer.email}</span>}
              </div>
            )}
            {s.file_url && (
              <a href={s.file_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:text-blue-700">
                View file →
              </a>
            )}
          </div>
        ))}
      </section>

      {total > pageSize && (
        <div className="flex items-center justify-between text-sm">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-blue-600 disabled:text-gray-300"
          >
            ← Prev
          </button>
          <span className="text-xs text-gray-400">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}
          </span>
          <button
            onClick={() => setPage(p => ((p + 1) * pageSize < total ? p + 1 : p))}
            disabled={(page + 1) * pageSize >= total}
            className="text-blue-600 disabled:text-gray-300"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
