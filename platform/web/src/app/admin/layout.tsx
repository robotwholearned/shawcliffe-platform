import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const isAdmin = user?.app_metadata?.role === 'shawcliffe_admin'
  if (!isAdmin) redirect('/admin/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <Link href="/admin" className="font-bold text-gray-900 text-sm">
          Shawcliffe Admin
        </Link>
        <span className="text-xs text-gray-400">{user?.email}</span>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
