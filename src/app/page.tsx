import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import HomeClient from '@/components/pages/HomeClient'
import { daysUntilWorkPermitDeadline, isWorkPermitWindowOpen } from '@/lib/workpermit/deadline'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// The root layout reads the locale header so it can render the page in the
// visitor's own language, which makes every route dynamic — page-level ISR no
// longer applies. The caching moves down to the data instead: these two queries
// still only run once a minute, so the render stays cheap.
const getHomePosts = unstable_cache(
  async () => {
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
        .select('id,title,slug,excerpt,service,image_url,published_at,meta_desc,category')
        .eq('status', 'published')
        .eq('service', 'news')
        .order('published_at', { ascending: false })
        .limit(3),
    ])
    return { posts, news }
  },
  ['home-posts'],
  { revalidate: 60, tags: ['home-posts'] }
)

export default async function Home() {
  const { posts, news } = await getHomePosts()

  // While the 2569 work-permit renewal window is open the homepage leads with
  // that campaign (countdown + inline Q&A chat). Computed here, not in the
  // client, so the switch-over is decided by server time — and since the render
  // is per-request now, it flips the moment the window closes.
  const workPermitDaysLeft = isWorkPermitWindowOpen() ? daysUntilWorkPermitDeadline() : null

  return <HomeClient posts={posts} news={news} workPermitDaysLeft={workPermitDaysLeft} />
}
