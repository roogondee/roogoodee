import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'

const FB_API = 'https://graph.facebook.com/v19.0'

interface Check {
  id: string
  label: string
  status: 'ok' | 'warn' | 'fail' | 'skip'
  detail: string
}

async function fetchJson(url: string): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  try {
    const res = await fetch(url)
    const json = await res.json()
    return { ok: res.ok, status: res.status, json }
  } catch (err) {
    return { ok: false, status: 0, json: { error: { message: err instanceof Error ? err.message : 'fetch failed' } } }
  }
}

function envCheck(id: string, label: string, value: string | undefined): Check {
  if (!value) return { id, label, status: 'fail', detail: 'ยังไม่ได้ตั้งใน env' }
  return { id, label, status: 'ok', detail: `set (len=${value.length})` }
}

export async function GET() {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const PAGE_ID = process.env.FB_PAGE_ID
  const PAGE_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN
  const PIXEL_ID = process.env.FB_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID
  const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN
  const PUBLIC_PIXEL = process.env.NEXT_PUBLIC_META_PIXEL_ID
  const TEST_CODE = process.env.FB_TEST_EVENT_CODE

  const checks: Check[] = []

  // 1. Env vars
  checks.push(envCheck('env.FB_PAGE_ID', 'FB_PAGE_ID', PAGE_ID))
  checks.push(envCheck('env.FB_PAGE_ACCESS_TOKEN', 'FB_PAGE_ACCESS_TOKEN (autopost)', PAGE_TOKEN))
  checks.push(envCheck('env.NEXT_PUBLIC_META_PIXEL_ID', 'NEXT_PUBLIC_META_PIXEL_ID (browser Pixel)', PUBLIC_PIXEL))
  checks.push(envCheck('env.FB_PIXEL_ID', 'FB_PIXEL_ID (CAPI server)', PIXEL_ID))
  checks.push(envCheck('env.FB_ACCESS_TOKEN', 'FB_ACCESS_TOKEN (CAPI server)', ACCESS_TOKEN))
  checks.push({
    id: 'env.FB_TEST_EVENT_CODE',
    label: 'FB_TEST_EVENT_CODE (preview only)',
    status: TEST_CODE ? 'ok' : 'warn',
    detail: TEST_CODE ? 'set — events go to Test Events tab' : 'not set — events go live (ok for production)',
  })

  // 2. Pixel/Public mismatch
  if (PIXEL_ID && PUBLIC_PIXEL && PIXEL_ID !== PUBLIC_PIXEL) {
    checks.push({
      id: 'pixel.mismatch',
      label: 'Pixel ID mismatch',
      status: 'fail',
      detail: `FB_PIXEL_ID (${PIXEL_ID}) ≠ NEXT_PUBLIC_META_PIXEL_ID (${PUBLIC_PIXEL}) — dedup จะพัง`,
    })
  } else if (PIXEL_ID) {
    checks.push({ id: 'pixel.match', label: 'Pixel IDs match', status: 'ok', detail: PIXEL_ID })
  }

  // 3. Page token → /me/accounts permission check
  if (PAGE_ID && PAGE_TOKEN) {
    const r = await fetchJson(`${FB_API}/${PAGE_ID}?fields=id,name,fan_count&access_token=${encodeURIComponent(PAGE_TOKEN)}`)
    if (r.ok) {
      const name = (r.json as { name?: string }).name
      const fans = (r.json as { fan_count?: number }).fan_count
      checks.push({
        id: 'page.access',
        label: 'FB Page accessible',
        status: 'ok',
        detail: `${name} · ${fans ?? '?'} fans`,
      })
    } else {
      const msg = ((r.json as { error?: { message?: string } }).error?.message) || `HTTP ${r.status}`
      checks.push({ id: 'page.access', label: 'FB Page accessible', status: 'fail', detail: msg })
    }
  } else {
    checks.push({ id: 'page.access', label: 'FB Page accessible', status: 'skip', detail: 'ต้องมี FB_PAGE_ID + FB_PAGE_ACCESS_TOKEN' })
  }

  // 4. Page token permissions
  if (PAGE_TOKEN) {
    const r = await fetchJson(`${FB_API}/me/permissions?access_token=${encodeURIComponent(PAGE_TOKEN)}`)
    if (r.ok) {
      const data = (r.json as { data?: { permission: string; status: string }[] }).data || []
      const granted = data.filter((p) => p.status === 'granted').map((p) => p.permission)
      const needed = ['pages_manage_posts', 'pages_read_engagement']
      const missing = needed.filter((p) => !granted.includes(p))
      checks.push({
        id: 'page.perms',
        label: 'Page token permissions',
        status: missing.length === 0 ? 'ok' : 'warn',
        detail: missing.length === 0 ? granted.join(', ') : `missing: ${missing.join(', ')}`,
      })
    }
  }

  // 5. CAPI access token validity (debug_token would need app secret; use /me instead)
  if (PIXEL_ID && ACCESS_TOKEN) {
    const r = await fetchJson(`${FB_API}/${PIXEL_ID}?access_token=${encodeURIComponent(ACCESS_TOKEN)}`)
    if (r.ok) {
      const name = (r.json as { name?: string }).name
      checks.push({ id: 'capi.token', label: 'CAPI access token valid for Pixel', status: 'ok', detail: name || PIXEL_ID })
    } else {
      const msg = ((r.json as { error?: { message?: string } }).error?.message) || `HTTP ${r.status}`
      checks.push({ id: 'capi.token', label: 'CAPI access token valid for Pixel', status: 'fail', detail: msg })
    }
  } else {
    checks.push({ id: 'capi.token', label: 'CAPI access token valid for Pixel', status: 'skip', detail: 'ต้องมี FB_PIXEL_ID + FB_ACCESS_TOKEN' })
  }

  return NextResponse.json({
    ok: true,
    checked_at: new Date().toISOString(),
    summary: {
      ok:   checks.filter((c) => c.status === 'ok').length,
      warn: checks.filter((c) => c.status === 'warn').length,
      fail: checks.filter((c) => c.status === 'fail').length,
      skip: checks.filter((c) => c.status === 'skip').length,
    },
    checks,
  })
}
