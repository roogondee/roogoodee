'use client'
import { useState } from 'react'

interface ShareButtonsProps {
  url: string
  title: string
}

export default function ShareButtons({ url, title }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)

  const encoded = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback — do nothing
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-semibold text-muted">แชร์:</span>

      {/* Facebook */}
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encoded}`}
        target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1.5 bg-[#1877F2] text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity"
        aria-label="Share on Facebook"
      >
        <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        Facebook
      </a>

      {/* LINE */}
      <a
        href={`https://line.me/R/msg/text/?${encodedTitle}%0A${encoded}`}
        target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1.5 bg-[#06C755] text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity"
        aria-label="Share on LINE"
      >
        <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
        LINE
      </a>

      {/* Twitter/X */}
      <a
        href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encoded}`}
        target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1.5 bg-black text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity"
        aria-label="Share on X"
      >
        <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        X
      </a>

      {/* Copy link */}
      <button
        onClick={copyLink}
        className="flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors"
        aria-label="Copy link"
      >
        {copied ? (
          <>✓ คัดลอกแล้ว</>
        ) : (
          <>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            คัดลอก
          </>
        )}
      </button>
    </div>
  )
}
