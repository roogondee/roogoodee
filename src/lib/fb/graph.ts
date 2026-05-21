const FB_PAGE_ID = process.env.FB_PAGE_ID || ''
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || ''
const GRAPH = 'https://graph.facebook.com/v19.0'

function assertConfig() {
  if (!FB_PAGE_ID || !FB_PAGE_ACCESS_TOKEN) {
    throw new Error('FB_PAGE_ID / FB_PAGE_ACCESS_TOKEN not configured')
  }
}

export async function postPhotoToFeed(imageUrl: string, caption: string): Promise<{ id: string; post_id?: string }> {
  assertConfig()
  const url = `${GRAPH}/${FB_PAGE_ID}/photos`
  const body = new URLSearchParams({
    url: imageUrl,
    caption,
    published: 'true',
    access_token: FB_PAGE_ACCESS_TOKEN,
  })
  const res = await fetch(url, { method: 'POST', body })
  const json = await res.json()
  if (!res.ok) throw new Error(`FB feed post failed: ${JSON.stringify(json)}`)
  return json
}

export async function postPhotoStory(imageUrl: string): Promise<{ photo_id: string; story_id: string }> {
  assertConfig()
  const uploadRes = await fetch(`${GRAPH}/${FB_PAGE_ID}/photos`, {
    method: 'POST',
    body: new URLSearchParams({
      url: imageUrl,
      published: 'false',
      access_token: FB_PAGE_ACCESS_TOKEN,
    }),
  })
  const uploadJson = await uploadRes.json()
  if (!uploadRes.ok) throw new Error(`FB story upload failed: ${JSON.stringify(uploadJson)}`)
  const photoId = uploadJson.id as string

  const storyRes = await fetch(`${GRAPH}/${FB_PAGE_ID}/photo_stories`, {
    method: 'POST',
    body: new URLSearchParams({
      photo_id: photoId,
      access_token: FB_PAGE_ACCESS_TOKEN,
    }),
  })
  const storyJson = await storyRes.json()
  if (!storyRes.ok) throw new Error(`FB story publish failed: ${JSON.stringify(storyJson)}`)
  return { photo_id: photoId, story_id: storyJson.post_id || storyJson.id }
}
