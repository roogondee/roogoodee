import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export type AuditAction = 'view' | 'update' | 'redeem' | 'delete' | 'export'

interface LogInput {
  leadId?: string | null
  actor: string
  action: AuditAction
  details?: Record<string, unknown>
  ip?: string
}

// Fire-and-forget: logs a row to lead_access_log.
// Never throws — audit failure must not block the primary action.
export function logLeadAccess(input: LogInput) {
  void supabaseAdmin
    .from('lead_access_log')
    .insert([{
      lead_id: input.leadId ?? null,
      actor:   input.actor,
      action:  input.action,
      details: input.details ?? null,
      ip:      input.ip ?? null,
    }])
    .then(({ error }) => {
      if (error) console.error('audit log error:', error.message)
    })
}

export function requestIp(req: NextRequest): string | undefined {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    undefined
  )
}
