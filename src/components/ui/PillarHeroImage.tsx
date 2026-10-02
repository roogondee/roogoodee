import Image from 'next/image'
import { SERVICE_IMAGES, type ServiceImageKey } from '@/config/service-images'

// Photo panel for the right-hand side of a pillar landing hero (below the CTAs
// on mobile, so it never pushes the primary button down). Decorative motion:
// the frame rises in once, the badge floats, two blurred blobs drift behind —
// all transform-only (see tailwind.config.ts) and stopped under
// prefers-reduced-motion.
export default function PillarHeroImage({
  service,
  alt,
  badgeIcon,
  badgeTitle,
  badgeText,
  blobClass = 'bg-mint/30',
  priority = true,
}: {
  service: ServiceImageKey
  alt: string
  badgeIcon?: string
  badgeTitle?: string
  badgeText?: string
  /** Tailwind bg-* for the drifting blobs, to match the pillar's accent. */
  blobClass?: string
  priority?: boolean
}) {
  return (
    <div className="relative w-full lg:w-[44%] max-w-xl mx-auto lg:mx-0 flex-shrink-0 mt-10 lg:mt-0">
      <div className={`absolute -top-8 -right-6 w-48 h-48 md:w-64 md:h-64 ${blobClass} rounded-full blur-3xl animate-blob pointer-events-none`} aria-hidden />
      <div className={`absolute -bottom-10 -left-8 w-40 h-40 md:w-56 md:h-56 ${blobClass} rounded-full blur-3xl animate-blob [animation-delay:-6s] pointer-events-none`} aria-hidden />

      <div className="relative animate-rise-in">
        <div className="relative aspect-[4/3] lg:aspect-square rounded-[2rem] overflow-hidden shadow-2xl ring-1 ring-black/5 rotate-0 lg:rotate-1 hover:rotate-0 transition-transform duration-700">
          <Image
            src={SERVICE_IMAGES[service]}
            alt={alt}
            fill
            priority={priority}
            className="object-cover scale-[1.02] hover:scale-105 transition-transform duration-[1.5s]"
            sizes="(max-width: 1024px) 100vw, 44vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-forest/35 via-transparent to-transparent" />
        </div>

        {badgeTitle && (
          <div className="absolute -bottom-5 left-4 md:-left-6 bg-white/95 backdrop-blur rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 animate-float max-w-[80%]">
            {badgeIcon && <span className="w-10 h-10 rounded-xl bg-mint/15 flex items-center justify-center text-xl flex-shrink-0">{badgeIcon}</span>}
            <div className="min-w-0">
              <p className="text-sm font-bold text-forest leading-tight">{badgeTitle}</p>
              {badgeText && <p className="text-xs text-muted leading-snug">{badgeText}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
