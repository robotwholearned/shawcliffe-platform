import { redirect } from 'next/navigation'

// Root path on shawcliffe.ca → redirect to admin.
// Client storefronts are served from subdomains (tomsproduce.shawcliffe.ca)
// rewritten to /[slug] by middleware, or via /[slug] path in local dev.
export default function RootPage() {
  redirect('/admin')
}
