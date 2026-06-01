import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'shawcliffe.ca'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({
    request: { headers: new Headers(req.headers) },
  })

  // Refresh Supabase session on every request
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )
  await supabase.auth.getUser()

  // Make pathname available to server-component layouts via header
  res.headers.set('x-pathname', req.nextUrl.pathname)

  // Subdomain routing: tomsproduce.shawcliffe.ca → rewrite to /tomsproduce
  const hostname = req.headers.get('host') ?? ''
  const hostWithoutPort = hostname.replace(/:\d+$/, '')

  const isClientSubdomain =
    hostWithoutPort !== BASE_DOMAIN &&
    hostWithoutPort !== `www.${BASE_DOMAIN}` &&
    hostWithoutPort.endsWith(`.${BASE_DOMAIN}`)

  if (isClientSubdomain) {
    const slug = hostWithoutPort.replace(`.${BASE_DOMAIN}`, '')
    const url = req.nextUrl.clone()
    const originalPath = url.pathname === '/' ? '' : url.pathname
    url.pathname = `/${slug}${originalPath}`
    return NextResponse.rewrite(url)
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
