import { supabaseAdmin } from '@/lib/supabase'
import DeletionRequestRow from '@/components/admin/DeletionRequestRow'

export const revalidate = 0

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

export default async function DeletionRequestsPage() {
  const { data: requests } = await supabaseAdmin
    .from('data_deletion_requests')
    .select('*')
    .order('requested_at', { ascending: false })
    .limit(200)

  const pending = (requests || []).filter(r => r.status === 'pending')
  const completed = (requests || []).filter(r => r.status !== 'pending')

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="font-display text-2xl text-forest mb-1">คำขอลบข้อมูล (PDPA)</h1>
        <p className="text-sm text-gray-500">กดปุ่ม "ดำเนินการ" เพื่อลบข้อมูลลูกค้า (รวม voucher) ออกจากระบบถาวร</p>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">🟡 รอดำเนินการ ({pending.length})</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {pending.length === 0 ? (
            <p className="text-sm text-gray-400 p-6 text-center">ไม่มีคำขอค้างอยู่</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {pending.map(r => (
                <DeletionRequestRow
                  key={r.id}
                  id={r.id}
                  phone={r.phone}
                  email={r.email}
                  reason={r.reason}
                  requestedAt={formatDate(r.requested_at)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">ดำเนินการแล้ว ({completed.length})</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {completed.length === 0 ? (
            <p className="text-sm text-gray-400 p-6 text-center">—</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="text-left px-4 py-3">เบอร์</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">สถานะ</th>
                  <th className="text-left px-4 py-3">ดำเนินการเมื่อ</th>
                  <th className="text-left px-4 py-3">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {completed.map(r => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-mono text-xs">{r.phone}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{r.email || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === 'processed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {r.status === 'processed' ? '✓ ลบแล้ว' : 'ปฏิเสธ'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {r.processed_at ? formatDate(r.processed_at) : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{r.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}
