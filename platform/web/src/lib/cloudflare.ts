const API_BASE = 'https://api.cloudflare.com/client/v4'

interface CloudflareResponse<T> {
  success: boolean
  errors: { code: number; message: string }[]
  result: T
}

async function cf<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  const data: CloudflareResponse<T> = await res.json()
  if (!data.success) {
    throw new Error(data.errors?.map(e => e.message).join('; ') || `Cloudflare API error (${res.status})`)
  }
  return data.result
}

export interface CustomHostname {
  id: string
  hostname: string
  status: string
  ownership_verification?: { name: string; type: string; value: string }
  ownership_verification_http?: { http_url: string; http_body: string }
  ssl: {
    status: string
    validation_records?: unknown[]
  }
}

export function createCustomHostname(hostname: string): Promise<CustomHostname> {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID
  return cf<CustomHostname>(`/zones/${zoneId}/custom_hostnames`, {
    method: 'POST',
    body: JSON.stringify({
      hostname,
      ssl: { method: 'txt', type: 'dv', bundle_method: 'ubiquitous' },
    }),
  })
}

export function getCustomHostname(customHostnameId: string): Promise<CustomHostname> {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID
  return cf<CustomHostname>(`/zones/${zoneId}/custom_hostnames/${customHostnameId}`)
}

export function deleteCustomHostname(customHostnameId: string): Promise<void> {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID
  return cf<void>(`/zones/${zoneId}/custom_hostnames/${customHostnameId}`, { method: 'DELETE' })
}
