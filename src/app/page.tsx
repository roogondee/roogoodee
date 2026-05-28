import { createClient } from '@supabase/supabase-js'
import HomeClient from '@/components/pages/HomeClient'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const revalidate = 60

export default async function Home() {
  const [{ data: posts }, { data: news }] = await Promise.all([
    supabase
      .from('posts')
      .select('id,title,slug,excerpt,service,image_url,published_at,meta_desc')
      .eq('status', 'published')
      .neq('service', 'news')
      .order('published_at', { ascending: false })
      .limit(3),
    supabase
      .from('posts')
      .select('id,title,slug,excerpt,service,news_pillar,image_url,published_at,meta_desc,category')
      .eq('status', 'published')
      .eq('service', 'news')
      .order('published_at', { ascending: false })
      .limit(3),
  ])

  return <HomeClient posts={posts} news={news} />
}
