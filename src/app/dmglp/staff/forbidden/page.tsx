import Link from 'next/link'

export default function Forbidden({ searchParams }: { searchParams: { need?: string } }) {
  return (
    <div className="max-w-md mx-auto mt-12 bg-white rounded-xl p-6 border border-gray-200 text-center">
      <p className="text-forest font-semibold mb-1">บทบาทของคุณเข้าหน้านี้ไม่ได้</p>
      <p className="text-sm text-gray-500 mb-4">ต้องการสิทธิ์ <code className="bg-gray-100 px-1 rounded">{searchParams.need || '-'}</code></p>
      <Link href="/dmglp/staff" className="text-sm text-forest underline">กลับหน้าหลัก</Link>
    </div>
  )
}
