import Image from 'next/image'

type Props = {
  imageUrl?: string | null
  videoUrl?: string | null
  alt: string
  priority?: boolean
  sizes?: string
  className?: string
}

function parseVideo(url: string): { kind: 'youtube' | 'vimeo' | 'file'; src: string } | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = u.searchParams.get('v')
      if (id) return { kind: 'youtube', src: `https://www.youtube.com/embed/${id}` }
      const shortMatch = u.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)/)
      if (shortMatch) return { kind: 'youtube', src: `https://www.youtube.com/embed/${shortMatch[1]}` }
    }
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1)
      if (id) return { kind: 'youtube', src: `https://www.youtube.com/embed/${id}` }
    }
    if (host === 'vimeo.com') {
      const id = u.pathname.split('/').filter(Boolean)[0]
      if (id && /^\d+$/.test(id)) return { kind: 'vimeo', src: `https://player.vimeo.com/video/${id}` }
    }
    if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(u.pathname)) {
      return { kind: 'file', src: url }
    }
    return null
  } catch {
    return null
  }
}

export default function MediaBlock({ imageUrl, videoUrl, alt, priority, sizes, className }: Props) {
  const video = videoUrl ? parseVideo(videoUrl) : null
  const wrapper = `rounded-2xl overflow-hidden aspect-video relative bg-gray-100 ${className || ''}`

  if (video) {
    if (video.kind === 'file') {
      return (
        <div className={wrapper}>
          <video
            src={video.src}
            poster={imageUrl || undefined}
            controls
            preload="metadata"
            playsInline
            className="w-full h-full object-cover"
          />
        </div>
      )
    }
    return (
      <div className={wrapper}>
        <iframe
          src={video.src}
          title={alt}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
    )
  }

  if (imageUrl) {
    return (
      <div className={wrapper}>
        <Image
          src={imageUrl}
          alt={alt}
          fill
          className="object-cover"
          priority={priority}
          sizes={sizes || '(max-width: 768px) 100vw, 768px'}
        />
      </div>
    )
  }

  return null
}
