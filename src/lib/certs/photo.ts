import { supabaseAdmin } from '@/lib/supabase'

const BUCKET = 'cert-files'

export async function downloadCertPhoto(photoPath: string | null | undefined): Promise<{ bytes: Buffer; contentType: string } | null> {
  if (!photoPath) return null
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(photoPath)
  if (error || !data) return null
  const bytes = Buffer.from(await data.arrayBuffer())
  const contentType = data.type || (photoPath.endsWith('.png') ? 'image/png' : photoPath.endsWith('.webp') ? 'image/webp' : 'image/jpeg')
  return { bytes, contentType }
}

// Data URL for embedding the photo into the @react-pdf Image element.
export async function certPhotoDataUrl(photoPath: string | null | undefined): Promise<string | undefined> {
  const p = await downloadCertPhoto(photoPath)
  if (!p) return undefined
  return `data:${p.contentType};base64,${p.bytes.toString('base64')}`
}
