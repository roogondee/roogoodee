import { Suspense } from 'react'
import type { Metadata } from 'next'
import DmglpLiff from '@/components/dmglp/DmglpLiff'

export const metadata: Metadata = {
  title: 'นัดหมายและแบบสอบถาม — W Medical',
  robots: { index: false, follow: false },
}

// LIFF endpoint for the DMGLP programme — register
// https://roogondee.com/dmglp/liff in the LINE Login channel (size Tall) and
// put its LIFF ID in NEXT_PUBLIC_LIFF_DMGLP_ID. Reminders link here with
// ?page=appointments | survey&appt=<id> | program (see src/lib/dmglp/db.ts).
export default function DmglpLiffPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-cream flex items-center justify-center text-muted">กำลังโหลด...</main>}>
      <DmglpLiff liffId={process.env.NEXT_PUBLIC_LIFF_DMGLP_ID || ''} />
    </Suspense>
  )
}
