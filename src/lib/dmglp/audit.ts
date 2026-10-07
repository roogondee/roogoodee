// dmglp_audit_log — every read and write of a clinical record (§4.11).
// Fire-and-forget like src/lib/audit.ts: an audit failure never blocks care.

import { supabaseAdmin } from '@/lib/supabase'
import type { DmglpUser } from './roles'

export type DmglpAuditAction =
  | 'read' | 'create' | 'update' | 'delete' | 'export'
  | 'screen' | 'enroll' | 'visit' | 'lab' | 'prescribe' | 'dispense' | 'consent'
  | 'survey' | 'alert' | 'task' | 'program' | 'refund' | 'payment' | 'stock' | 'fridge'

export function dmglpAudit(
  user: DmglpUser | null,
  action: DmglpAuditAction,
  table: string,
  recordId?: string | null,
  details?: Record<string, unknown>,
) {
  void supabaseAdmin
    .from('dmglp_audit_log')
    .insert([{
      staff_id: user?.id ?? null,
      staff_role: user?.role ?? null,
      action,
      table_name: table,
      record_id: recordId ?? null,
      details: details ?? null,
    }])
    .then(({ error }) => {
      if (error) console.error('[dmglp/audit]', error.message)
    })
}
