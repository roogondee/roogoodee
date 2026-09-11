import { createClient } from '@supabase/supabase-js'
import HomeClient from '@/components/pages/HomeClient'
import { daysUntilWorkPermitDeadline, isWorkPermitWindowOpen } from '@/lib/workpermit/deadline'

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
      .select('id,title,slug,excerpt,service,image_url,published_at,meta_desc,category')
      .eq('status', 'published')
      .eq('service', 'news')
      .order('published_at', { ascending: false })
      .limit(3),
  ])

  // While the 2569 work-permit renewal window is open the homepage leads with
  // that campaign (countdown + inline Q&A chat). Computed here, not in the
  // client, so the switch-over is decided by server time; ISR (revalidate 60)
  // means it flips within a minute of the window closing.
  const workPermitDaysLeft = isWorkPermitWindowOpen() ? daysUntilWorkPermitDeadline() : null

  return <HomeClient posts={posts} news={news} workPermitDaysLeft={workPermitDaysLeft} />
}
