import { redirect } from 'next/navigation'
import { getDmglpUser, can } from '@/lib/dmglp/roles'

export const dynamic = 'force-dynamic'

// Land each role on the screen it uses most.
export default async function DmglpStaffHome() {
  const user = await getDmglpUser()
  if (!user) return null
  if (can(user.role, 'appointments.read') && user.role !== 'finance' && user.role !== 'manager') redirect('/dmglp/staff/today')
  if (user.role === 'finance') redirect('/dmglp/staff/finance/programs')
  if (user.role === 'marketing') redirect('/dmglp/staff/marketing/conversions')
  if (user.role === 'auditor') redirect('/dmglp/staff/audit')
  redirect('/dmglp/staff/dashboard')
}
