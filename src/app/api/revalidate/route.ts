import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const handle = async (req: NextRequest) => {
  const secret = req.nextUrl.searchParams.get('secret')
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const paths = req.nextUrl.searchParams.getAll('path')
  if (paths.length === 0) {
    return NextResponse.json({ ok: false, error: 'no paths' }, { status: 400 })
  }

  const revalidated: string[] = []
  for (const p of paths) {
    revalidatePath(p)
    revalidated.push(p)
  }
  return NextResponse.json({ ok: true, revalidated, at: new Date().toISOString() })
}

export const GET = handle
export const POST = handle
