// Facebook Page publishing helper — text/link posts via Graph API.
// Supports immediate publish or scheduled_publish_time (10 min – 75 days ahead).
// Reuses `pages_manage_posts` permission already granted to the OA.

const FB_API = 'https://graph.facebook.com/v19.0'

const PAGE_ID = process.env.FB_PAGE_ID
const PAGE_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN

export interface FbPublishInput {
  message: string
  link?: string
  // Unix seconds. Must be 10 min to 75 days from now (Meta constraint).
  scheduledPublishTime?: number
}

export interface FbPublishResult {
  id: string
  scheduled: boolean
}

export async function publishToFacebookPage(input: FbPublishInput): Promise<FbPublishResult> {
  if (!PAGE_ID || !PAGE_TOKEN) {
    throw new Error('Missing FB_PAGE_ID or FB_PAGE_ACCESS_TOKEN')
  }

  const params = new URLSearchParams()
  params.set('message', input.message)
  if (input.link) params.set('link', input.link)
  params.set('access_token', PAGE_TOKEN)

  if (input.scheduledPublishTime) {
    const now = Math.floor(Date.now() / 1000)
    const minTime = now + 10 * 60
    const maxTime = now + 75 * 24 * 60 * 60
    if (input.scheduledPublishTime < minTime || input.scheduledPublishTime > maxTime) {
      throw new Error('scheduled_publish_time must be 10 min to 75 days from now')
    }
    params.set('published', 'false')
    params.set('scheduled_publish_time', String(input.scheduledPublishTime))
  }

  const res = await fetch(`${FB_API}/${PAGE_ID}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  const json = (await res.json()) as { id?: string; error?: { message: string } }
  if (!res.ok || !json.id) {
    throw new Error(json.error?.message || `Graph API HTTP ${res.status}`)
  }
  return { id: json.id, scheduled: !!input.scheduledPublishTime }
}
