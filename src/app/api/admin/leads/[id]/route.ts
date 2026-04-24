import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Spec §6.1 pipeline + legacy 'converted'
const VALID_STATUSES = [
  'new', 'contacted', 'qualified', 'booked', 'visited', 'customer', 'lost', 'converted',
]

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check admin session
  const session = cookies().get('admin_session')?.value
  if (session !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { status } = await req.json()
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('leads')
    .update({ status })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
