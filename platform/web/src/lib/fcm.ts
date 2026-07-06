import { JWT } from 'google-auth-library'

// FCM HTTP v1 — mirrors lib/apns.ts's sendPush interface so the broadcast
// route can dispatch to either platform the same way. Single Firebase
// project initially (see PRD ADR 2); splits to per-client project if scale
// requires it.
let jwtClient: JWT | null = null
let projectId: string | null = null

function getClient(): JWT {
  if (jwtClient) return jwtClient

  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('FCM_SERVICE_ACCOUNT_JSON must be set')

  const serviceAccount = JSON.parse(raw)
  projectId = serviceAccount.project_id

  jwtClient = new JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  })
  return jwtClient
}

export interface PushSendResult {
  token: string
  ok: boolean
  error?: string
}

export async function sendFcmPush(tokens: string[], message: string): Promise<PushSendResult[]> {
  const client = getClient()
  const { token: accessToken } = await client.getAccessToken()

  return Promise.all(
    tokens.map(async (deviceToken) => {
      const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: deviceToken,
            notification: { body: message },
          },
        }),
      })

      if (res.ok) return { token: deviceToken, ok: true }

      const body = await res.json().catch(() => null)
      const errorCode = body?.error?.details?.find((d: any) => d.errorCode)?.errorCode
      return { token: deviceToken, ok: false, error: errorCode ?? body?.error?.message ?? `FCM error (${res.status})` }
    })
  )
}

export function isConfigured(): boolean {
  return Boolean(process.env.FCM_SERVICE_ACCOUNT_JSON)
}

export function isUnregisteredError(error: string | undefined): boolean {
  return error === 'UNREGISTERED'
}
