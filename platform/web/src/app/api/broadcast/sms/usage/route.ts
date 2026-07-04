import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, createServiceClient } from '@/lib/supabase/server'
import { SMS_MONTHLY_ALLOTMENT, getSmsUsageThisMonth } from '@/lib/sms-limits'

export async function GET(req: NextRequest) {
  const user = await getAuthedUser(req)
  const role = user?.app_metadata?.role
  const clientId = user?.app_metadata?.client_id

  if (!user || (role !== 'client_staff' && role !== 'shawcliffe_admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const targetClientId = clientId
  if (!targetClientId) {
    return NextResponse.json({ error: 'client_id required' }, { status: 400 })
  }

  const admin = createServiceClient()
  const { data: client } = await admin.from('clients').select('tier').eq('id', targetClientId).single()
  const tier = (client?.tier ?? 1) as 1 | 2 | 3
  const limit = SMS_MONTHLY_ALLOTMENT[tier]
  const used = await getSmsUsageThisMonth(admin, targetClientId)

  return NextResponse.json({ used, limit, remaining: Math.max(0, limit - used) })
}
