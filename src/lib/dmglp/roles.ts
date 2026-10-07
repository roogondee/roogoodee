// Program roles (§3) on top of the site's existing admin session.
//
// Staff log in at /admin/login as before; their DMGLP role is the new
// admin_users.dmglp_role column, assigned from /dmglp/staff/settings/staff by
// a site manager. A site manager with no program role is treated as the
// read-only `manager` role so the owner can see dashboards on day one.
//
// The role is read in a separate query (not in getSessionUser) so an admin
// login keeps working even if this migration has not been applied yet.

import { redirect } from 'next/navigation'
import { getSessionUser, type SessionUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { DMGLP_ROLES, type DmglpRole } from './config'

export type Permission =
  | 'leads.read' | 'leads.write'
  | 'patients.read' | 'patients.write'
  | 'clinical.read' | 'clinical.write'      // screening, vitals, labs, visits
  | 'doctor.decide'                          // eligibility confirm, indication, dose, prescription
  | 'appointments.read' | 'appointments.write'
  | 'tasks.read' | 'tasks.write'
  | 'alerts.read' | 'alerts.write'
  | 'pharmacy.read' | 'pharmacy.write'
  | 'finance.read' | 'finance.write'
  | 'marketing.read' | 'marketing.write'
  | 'dashboard.read'
  | 'audit.read'
  | 'settings.read' | 'settings.write'

const MATRIX: Record<Permission, DmglpRole[]> = {
  'leads.read':          ['admin', 'marketing', 'manager'],
  'leads.write':         ['admin', 'marketing'],
  'patients.read':       ['admin', 'nurse', 'doctor', 'pharmacist', 'finance', 'manager'],
  'patients.write':      ['admin', 'nurse', 'doctor'],
  'clinical.read':       ['nurse', 'doctor', 'pharmacist', 'manager'],
  'clinical.write':      ['nurse', 'doctor'],
  'doctor.decide':       ['doctor'],
  'appointments.read':   ['admin', 'nurse', 'doctor', 'pharmacist', 'finance', 'manager'],
  'appointments.write':  ['admin', 'nurse', 'doctor', 'pharmacist'],
  'tasks.read':          ['admin', 'nurse', 'doctor', 'pharmacist', 'manager'],
  'tasks.write':         ['admin', 'nurse', 'doctor', 'pharmacist'],
  'alerts.read':         ['nurse', 'doctor', 'pharmacist', 'manager'],
  'alerts.write':        ['nurse', 'doctor', 'pharmacist'],
  'pharmacy.read':       ['pharmacist', 'doctor', 'manager'],
  'pharmacy.write':      ['pharmacist'],
  'finance.read':        ['finance', 'manager'],
  'finance.write':       ['finance'],
  'marketing.read':      ['marketing', 'manager'],
  'marketing.write':     ['marketing'],
  'dashboard.read':      ['admin', 'nurse', 'doctor', 'pharmacist', 'finance', 'marketing', 'manager'],
  'audit.read':          ['auditor'],
  'settings.read':       ['doctor', 'pharmacist', 'finance', 'manager'],
  'settings.write':      ['doctor', 'pharmacist', 'finance'],
}

export interface DmglpUser {
  id: string | null
  email: string
  name: string | null
  role: DmglpRole
  siteRole: SessionUser['role']
  licenseNo: string | null
  isSpecialist: boolean
  canManageStaff: boolean
}

export function can(role: DmglpRole, perm: Permission): boolean {
  return MATRIX[perm].includes(role)
}

export function isDmglpRole(v: unknown): v is DmglpRole {
  return typeof v === 'string' && (DMGLP_ROLES as string[]).includes(v)
}

export async function getDmglpUser(): Promise<DmglpUser | null> {
  const me = await getSessionUser()
  if (!me) return null

  let dmglpRole: DmglpRole | null = null
  let licenseNo: string | null = null
  let isSpecialist = false
  if (me.id) {
    const { data } = await supabaseAdmin
      .from('admin_users')
      .select('dmglp_role, license_no, is_specialist')
      .eq('id', me.id)
      .maybeSingle()
    if (data) {
      dmglpRole = isDmglpRole(data.dmglp_role) ? data.dmglp_role : null
      licenseNo = data.license_no ?? null
      isSpecialist = !!data.is_specialist
    }
  }

  const canManageStaff = me.role === 'manager'
  if (!dmglpRole && !canManageStaff) return null
  return {
    id: me.id,
    email: me.email,
    name: me.name ?? null,
    role: dmglpRole ?? 'manager',
    siteRole: me.role,
    licenseNo,
    isSpecialist,
    canManageStaff,
  }
}

// Server components: redirect to login when signed out, render a 403 block
// (via the returned null) when the role is not allowed.
export async function requireDmglp(perm?: Permission): Promise<DmglpUser> {
  const user = await getDmglpUser()
  if (!user) redirect('/admin/login?next=/dmglp/staff')
  if (perm && !can(user.role, perm)) redirect(`/dmglp/staff/forbidden?need=${perm}`)
  return user
}

// Server actions / route handlers: throw instead of redirecting.
export async function requireDmglpAction(perm: Permission): Promise<DmglpUser> {
  const user = await getDmglpUser()
  if (!user) throw new Error('กรุณาเข้าสู่ระบบ')
  if (!can(user.role, perm)) throw new Error(`สิทธิ์ไม่พอ (${user.role} → ${perm})`)
  return user
}
