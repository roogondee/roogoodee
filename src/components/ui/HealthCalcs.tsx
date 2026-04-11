'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/context'

function BMICalc() {
  const { t } = useTranslation()
  const tt = t.tools
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [comorbidity, setComorbidity] = useState(false)
  const [result, setResult] = useState<{ bmi: number; label: string; color: string; glp1: boolean; glp1Reason: string } | null>(null)

  const calculate = () => {
    const w = parseFloat(weight), h = parseFloat(height)
    if (!w || !h || w <= 0 || h <= 0) return
    const bmi = w / Math.pow(h / 100, 2)
    let label: string, color: string
    if (bmi < 18.5) { label = tt.bmiUnder; color = 'text-blue-600' }
    else if (bmi < 23) { label = tt.bmiNormal; color = 'text-green-600' }
    else if (bmi < 25) { label = tt.bmiOver; color = 'text-yellow-600' }
    else if (bmi < 30) { label = tt.bmiObese1; color = 'text-orange-600' }
    else { label = tt.bmiObese2; color = 'text-red-600' }
    const glp1 = bmi >= 30 || (bmi >= 27.5 && comorbidity)
    const glp1Reason = bmi >= 30 ? tt.glp1Reason30
      : bmi >= 27.5 && comorbidity ? tt.glp1Reason275Co
      : bmi >= 27.5 ? tt.glp1Reason275 : tt.glp1ReasonLow
    setResult({ bmi: Math.round(bmi * 10) / 10, label, color, glp1, glp1Reason })
  }

  return (
    <div className="bg-white border border-mint/20 rounded-2xl p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">💉</span>
        <div><h2 className="font-display text-xl text-forest">{tt.bmiTitle}</h2><p className="text-xs text-muted">{tt.bmiDesc}</p></div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-semibold text-muted mb-1.5">{tt.weight}</label>
          <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder={tt.weightPlaceholder} min="20" max="300" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-mint" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted mb-1.5">{tt.height}</label>
          <input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder={tt.heightPlaceholder} min="100" max="250" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-mint" />
        </div>
      </div>
      <label className="flex items-center gap-2 mb-5 cursor-pointer">
        <input type="checkbox" checked={comorbidity} onChange={e => setComorbidity(e.target.checked)} className="w-4 h-4 accent-forest" />
        <span className="text-sm text-muted">{tt.comorbidity}</span>
      </label>
      <button onClick={calculate} className="w-full bg-forest text-white py-3 rounded-xl text-sm font-semibold hover:bg-sage transition-colors">{tt.calculateBmi}</button>
      {result && (
        <div className="mt-5 space-y-3 animate-fade-in">
          <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
            <span className="text-sm text-muted">{tt.yourBmi}</span>
            <span className={`text-3xl font-bold ${result.color}`}>{result.bmi}</span>
          </div>
          <div className="rounded-xl px-4 py-3 text-sm font-semibold"><span className={result.color}>{result.label}</span></div>
          <div className={`rounded-xl p-4 text-sm ${result.glp1 ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50 border border-gray-200'}`}>
            <p className={`font-semibold mb-1 ${result.glp1 ? 'text-emerald-700' : 'text-gray-600'}`}>{result.glp1 ? tt.glp1Eligible : tt.glp1NotEligible}</p>
            <p className="text-xs text-muted leading-relaxed">{result.glp1Reason}</p>
          </div>
          {result.glp1 && <Link href="/contact?service=glp1" className="block text-center bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors">{tt.consultGlp1}</Link>}
          <p className="text-[10px] text-gray-400 text-center">{tt.bmiDisclaimer}</p>
        </div>
      )}
    </div>
  )
}

function EGFRCalc() {
  const { t } = useTranslation()
  const tt = t.tools
  const [creatinine, setCreatinine] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState<'male' | 'female'>('male')
  const [result, setResult] = useState<{ egfr: number; stage: number; label: string; color: string; advice: string } | null>(null)

  const calculate = () => {
    const scr = parseFloat(creatinine), a = parseInt(age)
    if (!scr || !a || scr <= 0 || a <= 0) return
    const kappa = sex === 'female' ? 0.7 : 0.9
    const alpha = sex === 'female' ? -0.241 : -0.302
    const sexMult = sex === 'female' ? 1.012 : 1.0
    const ratio = scr / kappa
    const egfr = 142 * Math.pow(Math.min(ratio, 1), alpha) * Math.pow(Math.max(ratio, 1), -1.200) * Math.pow(0.9938, a) * sexMult
    const val = Math.round(egfr)
    let stage: number, label: string, color: string, advice: string
    if (egfr >= 90) { stage = 1; label = tt.g1; color = 'text-green-600'; advice = tt.adviceG1 }
    else if (egfr >= 60) { stage = 2; label = tt.g2; color = 'text-lime-600'; advice = tt.adviceG2 }
    else if (egfr >= 45) { stage = 3; label = tt.g3a; color = 'text-yellow-600'; advice = tt.adviceG3a }
    else if (egfr >= 30) { stage = 3; label = tt.g3b; color = 'text-orange-600'; advice = tt.adviceG3b }
    else if (egfr >= 15) { stage = 4; label = tt.g4; color = 'text-red-600'; advice = tt.adviceG4 }
    else { stage = 5; label = tt.g5; color = 'text-red-800'; advice = tt.adviceG5 }
    setResult({ egfr: val, stage, label, color, advice })
  }

  return (
    <div className="bg-white border border-mint/20 rounded-2xl p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🫘</span>
        <div><h2 className="font-display text-xl text-forest">{tt.egfrTitle}</h2><p className="text-xs text-muted">{tt.egfrDesc}</p></div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-semibold text-muted mb-1.5">{tt.creatinine}</label>
          <input type="number" value={creatinine} onChange={e => setCreatinine(e.target.value)} placeholder={tt.creatininePlaceholder} step="0.1" min="0.1" max="20" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-mint" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted mb-1.5">{tt.age}</label>
          <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder={tt.agePlaceholder} min="18" max="110" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-mint" />
        </div>
      </div>
      <div className="mb-5">
        <label className="block text-xs font-semibold text-muted mb-1.5">{tt.sex}</label>
        <div className="flex gap-3">
          {(['male', 'female'] as const).map(s => (
            <button key={s} onClick={() => setSex(s)} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${sex === s ? 'bg-forest text-white border-forest' : 'border-gray-200 text-muted hover:border-mint'}`}>
              {s === 'male' ? tt.male : tt.female}
            </button>
          ))}
        </div>
      </div>
      <button onClick={calculate} className="w-full bg-forest text-white py-3 rounded-xl text-sm font-semibold hover:bg-sage transition-colors">{tt.calculateEgfr}</button>
      {result && (
        <div className="mt-5 space-y-3">
          <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
            <span className="text-sm text-muted">{tt.yourEgfr}</span>
            <span className={`text-3xl font-bold ${result.color}`}>{result.egfr} <span className="text-sm font-normal">mL/min</span></span>
          </div>
          <div className={`rounded-xl p-4 border ${result.stage >= 4 ? 'bg-red-50 border-red-200' : result.stage === 3 ? 'bg-orange-50 border-orange-200' : result.stage === 2 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
            <p className={`font-semibold mb-1 ${result.color}`}>{result.label}</p>
            <p className="text-xs text-muted leading-relaxed">{result.advice}</p>
          </div>
          {result.stage >= 2 && <Link href="/contact?service=ckd" className="block text-center bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">{tt.consultCkd}</Link>}
          <p className="text-[10px] text-gray-400 text-center">{tt.egfrDisclaimer}</p>
        </div>
      )}
    </div>
  )
}

function PrEPQuiz() {
  const { t } = useTranslation()
  const tt = t.tools
  const PREP_QUESTIONS = [
    { q: tt.prepQ1, a: [tt.prepQ1A1, tt.prepQ1A2, tt.prepQ1A3], scores: [0, 1, 2] },
    { q: tt.prepQ2, a: [tt.prepQ2A1, tt.prepQ2A2, tt.prepQ2A3], scores: [0, 1, 2] },
    { q: tt.prepQ3, a: [tt.prepQ3A1, tt.prepQ3A2, tt.prepQ3A3], scores: [0, 1, 2] },
    { q: tt.prepQ4, a: [tt.prepQ4A1, tt.prepQ4A2, tt.prepQ4A3], scores: [0, 1, 2] },
    { q: tt.prepQ5, a: [tt.prepQ5A1, tt.prepQ5A2, tt.prepQ5A3], scores: [0, 1, 2] },
  ]
  const [answers, setAnswers] = useState<(number | null)[]>(Array(5).fill(null))
  const [result, setResult] = useState<{ score: number; level: string; color: string; advice: string; recommend: boolean } | null>(null)

  const answer = (qi: number, score: number) => { setAnswers(prev => { const n = [...prev]; n[qi] = score; return n }); setResult(null) }
  const calculate = () => {
    if (answers.some(a => a === null)) return
    const total = answers.reduce<number>((s, a) => s + (a ?? 0), 0)
    let level: string, color: string, advice: string, recommend: boolean
    if (total <= 2) { level = tt.riskLow; color = 'text-green-700'; recommend = false; advice = tt.adviceLow }
    else if (total <= 5) { level = tt.riskMedium; color = 'text-yellow-700'; recommend = true; advice = tt.adviceMedium }
    else { level = tt.riskHigh; color = 'text-red-700'; recommend = true; advice = tt.adviceHigh }
    setResult({ score: total, level, color, advice, recommend })
  }

  return (
    <div className="bg-white border border-mint/20 rounded-2xl p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🔴</span>
        <div><h2 className="font-display text-xl text-forest">{tt.prepTitle}</h2><p className="text-xs text-muted">{tt.prepDesc}</p></div>
      </div>
      <div className="space-y-5">
        {PREP_QUESTIONS.map((q, qi) => (
          <div key={qi} className="border border-gray-100 rounded-xl p-4">
            <p className="text-sm font-semibold text-forest mb-3">{qi + 1}. {q.q}</p>
            <div className="space-y-2">
              {q.a.map((option, ai) => (
                <button key={ai} onClick={() => answer(qi, q.scores[ai])}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all border ${answers[qi] === q.scores[ai] ? 'bg-forest text-white border-forest' : 'border-gray-200 text-muted hover:border-mint hover:bg-mint/5'}`}>{option}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button onClick={calculate} disabled={!answers.every(a => a !== null)} className="w-full mt-5 bg-forest text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-sage transition-colors">{tt.viewResult}</button>
      {result && (
        <div className="mt-5 space-y-3">
          <div className={`rounded-xl p-5 border ${result.recommend ? result.score > 5 ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
            <p className={`text-lg font-bold mb-2 ${result.color}`}>{result.level}</p>
            <p className="text-sm text-muted leading-relaxed">{result.advice}</p>
          </div>
          {result.recommend && <Link href="/contact?service=std" className="block text-center bg-rose-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-rose-700 transition-colors">{tt.consultPrep}</Link>}
          <p className="text-[10px] text-gray-400 text-center">{tt.prepDisclaimer}</p>
        </div>
      )}
    </div>
  )
}

export { BMICalc, EGFRCalc, PrEPQuiz }
