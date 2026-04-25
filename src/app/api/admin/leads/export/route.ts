import { supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { logLeadAccess } from '@/lib/audit'

export async function GET() {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let query = supabaseAdmin.from('leads').select('*').order('created_at', { ascending: false })
  if (me.role === 'sale' && me.id) query = query.eq('assigned_to', me.id)

  const { data: leads, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const headers = ['id', 'first_name', 'last_name', 'phone', 'service', 'status', 'source', 'note', 'age', 'gender', 'created_at']
  const rows = (leads || []).map(l =>
    headers.map(h => {
      const val = String(l[h] ?? '')
      return val.includes(',') || val.includes('"') || val.includes('\n')
        ? `"${val.replace(/"/g, '""')}"`
        : val
    }).join(',')
  )

  logLeadAccess({ actor: me.email, action: 'export', details: { count: leads?.length || 0, role: me.role } })

  const csv = [headers.join(','), ...rows].join('\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
