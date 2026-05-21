import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 8 * 1024 * 1024

export async function POST(req: NextRequest) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'no file' }, { status: 400 })
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: `unsupported type: ${file.type}` }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `too large (>${MAX_BYTES} bytes)` }, { status: 400 })
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `compose/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())

  const { error } = await supabaseAdmin.storage
    .from('images')
    .upload(path, buf, { contentType: file.type, upsert: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data } = supabaseAdmin.storage.from('images').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl, path })
}
