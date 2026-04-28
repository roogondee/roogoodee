import type { ArticleQuizDefinition, ArticleQuizTier } from './article-quiz'

export interface ArticleQuizResult {
  score: number
  maxScore: number
  tier: ArticleQuizTier
}

export function scoreArticleQuiz(
  quiz: ArticleQuizDefinition,
  answers: Record<string, string | string[]>
): ArticleQuizResult {
  let score = 0
  let maxScore = 0

  for (const q of quiz.questions) {
    if (q.type === 'radio') {
      const top = Math.max(...q.options.map(o => o.weight ?? 0))
      maxScore += top
      const v = answers[q.id]
      if (typeof v === 'string') {
        const opt = q.options.find(o => o.value === v)
        score += opt?.weight ?? 0
      }
    } else {
      const sum = q.options.filter(o => !o.exclusive).reduce((s, o) => s + (o.weight ?? 0), 0)
      maxScore += sum
      const v = answers[q.id]
      if (Array.isArray(v)) {
        for (const val of v) {
          const opt = q.options.find(o => o.value === val)
          score += opt?.weight ?? 0
        }
      }
    }
  }

  const ratio = maxScore > 0 ? score / maxScore : 0
  const tier: ArticleQuizTier = ratio >= 0.5 ? 'high' : ratio >= 0.2 ? 'medium' : 'low'
  return { score, maxScore, tier }
}
