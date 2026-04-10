import { supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  // Auth check
  const token = cookies().get('admin_token')?.value
  if (token !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: leads, error } = await supabaseAdmin
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

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

  const csv = [headers.join(','), ...rows].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
