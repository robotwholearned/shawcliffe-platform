import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const pathname = headers().get('x-pathname') ?? ''
  if (pathname === '/seller/login') return <>{children}</>

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/seller/login')

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto">
      {children}
    </div>
  )
}
