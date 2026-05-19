import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser } from '@/lib/auth'
import { postPhotoToFeed, postPhotoStory } from '@/lib/fb/graph'

export const runtime = 'nodejs'
export const maxDuration = 60

type Target = 'blog' | 'feed' | 'story'

function slugify(headline: string): string {
  const base = headline
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙\s-]/gi, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
  const suffix = Math.random().toString(36).slice(2, 8)
  return base ? `${base}-${suffix}` : `post-${suffix}`
}

export async function POST(req: NextRequest) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as {
    imageUrl?: string
    service?: string
    headline?: string
    subline?: string
    caption?: string
    cta?: string
    targets?: Target[]
  }

  const imageUrl = (body.imageUrl || '').trim()
  const service = body.service
  const headline = (body.headline || '').trim()
  const subline = (body.subline || '').trim()
  const caption = (body.caption || '').trim()
  const cta = (body.cta || '').trim()
  const targets = (body.targets || []) as Target[]

  if (!imageUrl || !service || !headline || !subline || !caption) {
    return NextResponse.json({ error: 'imageUrl, service, headline, subline, caption required' }, { status: 400 })
  }
  if (!['glp1', 'std', 'ckd', 'foreign'].includes(service)) {
    return NextResponse.json({ error: 'invalid service' }, { status: 400 })
  }
  if (targets.length === 0) {
    return NextResponse.json({ error: 'no targets selected' }, { status: 400 })
  }

  const results: Record<Target, { ok: boolean; data?: unknown; error?: string }> = {} as Record<Target, { ok: boolean; data?: unknown; error?: string }>

  if (targets.includes('blog')) {
    try {
      const slug = slugify(headline)
      const { data, error } = await supabaseAdmin.from('posts').insert({
        title: headline,
        slug,
        excerpt: subline,
        content: `<p>${caption.replace(/\n/g, '</p><p>')}</p><p><strong>${cta}</strong></p>`,
        meta_desc: subline.slice(0, 160),
        service,
        image_url: imageUrl,
        status: 'published',
        published_at: new Date().toISOString(),
      }).select('id, slug').single()
      if (error) throw error
      results.blog = { ok: true, data }
    } catch (e) {
      results.blog = { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  const feedCaption = `${headline}\n\n${caption}\n\n${cta}\nLINE: @roogondee | https://roogondee.com`

  if (targets.includes('feed')) {
    try {
      const r = await postPhotoToFeed(imageUrl, feedCaption)
      results.feed = { ok: true, data: r }
    } catch (e) {
      results.feed = { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  if (targets.includes('story')) {
    try {
      const r = await postPhotoStory(imageUrl)
      results.story = { ok: true, data: r }
      try {
        await supabaseAdmin.from('fb_stories').insert({
          posted_date: new Date().toISOString().slice(0, 10),
          service,
          story_type: 'compose',
          fb_photo_id: r.photo_id,
          fb_story_id: r.story_id,
          headline,
          subline,
          caption,
          image_url: imageUrl,
          status: 'posted',
        })
      } catch { /* logging best-effort */ }
    } catch (e) {
      results.story = { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  return NextResponse.json({ results })
}
