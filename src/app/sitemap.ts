import { supabaseAdmin } from '@/lib/supabase'
import type { MetadataRoute } from 'next'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data: posts } = await supabaseAdmin
    .from('posts')
    .select('slug, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: 'https://roogondee.com', priority: 1.0, changeFrequency: 'weekly', lastModified: new Date() },
    { url: 'https://roogondee.com/blog', priority: 0.9, changeFrequency: 'daily', lastModified: new Date() },
    { url: 'https://roogondee.com/contact', priority: 0.8, changeFrequency: 'monthly' },
    { url: 'https://roogondee.com/privacy', priority: 0.3, changeFrequency: 'yearly' },
    { url: 'https://roogondee.com/terms', priority: 0.3, changeFrequency: 'yearly' },
  ]

  const postRoutes: MetadataRoute.Sitemap = (posts || []).map((p) => ({
    url: `https://roogondee.com/blog/${p.slug}`,
    lastModified: p.published_at ? new Date(p.published_at) : new Date(),
    priority: 0.7,
    changeFrequency: 'monthly',
  }))

  return [...staticRoutes, ...postRoutes]
}
