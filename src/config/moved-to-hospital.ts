// Blog posts that now live on the W Medical Hospital website
// (www.2uhospital.com), as doctor-reviewed health-education articles.
//
// Why: the hospital site is the better home for plain health education — a
// licensed facility, a named reviewing doctor, the hospital's own domain —
// while roogondee keeps every post that carries an offer (vouchers, quizzes,
// prices), because those feed the LINE funnel. One article, one URL: a post
// moved there redirects here (301) instead of living on both sites, which
// would split ranking between two domains.
//
// The hospital repo imports the education posts as drafts
// (scripts/import-roogondee-articles.ts in roogondee/wmedicalhospital). Add a
// slug here ONLY after the hospital article is live — that is, after a doctor
// has signed it off in that repo's lib/imported/reviews.ts and it is deployed.
// Adding it earlier sends visitors to a 404.
//
// A near-duplicate post of a moved one (the hospital import lists them as
// "similar to <slug>" in lib/imported/roogondee-skipped.json) may point to the
// same hospital article.
//
// Key: the roogondee slug (Thai slugs as written, not URL-encoded).
// Value: the hospital article slug (ASCII).
export const HOSPITAL_ORIGIN = 'https://www.2uhospital.com'

export const MOVED_TO_HOSPITAL: Record<string, string> = {}

/** The hospital URL for a moved post, or null when the post stays here. */
export function hospitalUrlFor(slug: string, moved: Record<string, string> = MOVED_TO_HOSPITAL): string | null {
  const target = moved[slug]
  if (!target || !/^[a-z0-9-]+$/.test(target)) return null
  return `${HOSPITAL_ORIGIN}/th/articles/${target}`
}
