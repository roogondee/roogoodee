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
    { url: 'https://roogondee.com/std', priority: 0.95, changeFrequency: 'monthly', lastModified: new Date() },
    { url: 'https://roogondee.com/glp1', priority: 0.95, changeFrequency: 'monthly', lastModified: new Date() },
    { url: 'https://roogondee.com/ckd', priority: 0.95, changeFrequency: 'monthly', lastModified: new Date() },
    { url: 'https://roogondee.com/foreign', priority: 0.95, changeFrequency: 'monthly', lastModified: new Date() },
    { url: 'https://roogondee.com/mens', priority: 0.95, changeFrequency: 'monthly', lastModified: new Date() },
    { url: 'https://roogondee.com/ask', priority: 0.9, changeFrequency: 'daily', lastModified: new Date() },
    { url: 'https://roogondee.com/tools', priority: 0.9, changeFrequency: 'monthly', lastModified: new Date() },
    { url: 'https://roogondee.com/blog', priority: 0.85, changeFrequency: 'daily', lastModified: new Date() },
    { url: 'https://roogondee.com/faq', priority: 0.85, changeFrequency: 'monthly', lastModified: new Date() },
    { url: 'https://roogondee.com/about', priority: 0.8, changeFrequency: 'monthly', lastModified: new Date() },
    { url: 'https://roogondee.com/en', priority: 0.8, changeFrequency: 'monthly', lastModified: new Date() },
    { url: 'https://roogondee.com/contact', priority: 0.8, changeFrequency: 'monthly' },
    { url: 'https://roogondee.com/privacy', priority: 0.3, changeFrequency: 'yearly' },
  ]

  const postRoutes: MetadataRoute.Sitemap = (posts || []).map((p) => ({
    url: `https://roogondee.com/blog/${p.slug}`,
    lastModified: p.published_at ? new Date(p.published_at) : new Date(),
    priority: 0.7,
    changeFrequency: 'monthly',
  }))

  return [...staticRoutes, ...postRoutes]
}
