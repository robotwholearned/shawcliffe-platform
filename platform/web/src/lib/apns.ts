import { ApnsClient, Notification } from 'apns2'

// Token-based (JWT) auth — one key covers every client's app under Shawcliffe's
// single Apple Developer account (Phase 1 model, see platform/ARCHITECTURE-MAP.md
// Decision 2). No per-client Twilio-style subaccounts needed: the per-client
// piece is just `apple_bundle_id` from client_branding, passed as the topic.
let client: ApnsClient | null = null

function getClient(): ApnsClient {
  if (client) return client

  const team = process.env.APNS_TEAM_ID
  const keyId = process.env.APNS_KEY_ID
  const signingKey = process.env.APNS_PRIVATE_KEY

  if (!team || !keyId || !signingKey) {
    throw new Error('APNS_TEAM_ID, APNS_KEY_ID, and APNS_PRIVATE_KEY must be set')
  }

  client = new ApnsClient({
    team,
    keyId,
    // Render (and most host UIs) can't store a literal multiline PEM in one
    // env var field, so we accept `\n`-escaped input and un-escape it here.
    signingKey: signingKey.replace(/\\n/g, '\n'),
    defaultTopic: process.env.APNS_DEFAULT_TOPIC || 'ca.shawcliffe.tomsproduce',
    host: process.env.APNS_ENVIRONMENT === 'production'
      ? 'api.push.apple.com'
      : 'api.sandbox.push.apple.com',
  })
  return client
}

export interface PushSendResult {
  token: string
  ok: boolean
  error?: string
}

export async function sendPush(
  tokens: string[],
  message: string,
  topic?: string
): Promise<PushSendResult[]> {
  const apns = getClient()

  return Promise.all(
    tokens.map(async (token) => {
      try {
        const notification = new Notification(token, { alert: message, sound: 'default', topic })
        await apns.send(notification)
        return { token, ok: true }
      } catch (err: any) {
        return { token, ok: false, error: err?.reason ?? err?.message ?? String(err) }
      }
    })
  )
}

export function isConfigured(): boolean {
  return Boolean(process.env.APNS_TEAM_ID && process.env.APNS_KEY_ID && process.env.APNS_PRIVATE_KEY)
}
