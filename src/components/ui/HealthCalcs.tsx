'use client'
import { useState } from 'react'
import Link from 'next/link'

// ─── BMI + GLP-1 CALCULATOR ────────────────────────────────────────────────────

function BMICalc() {
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [comorbidity, setComorbidity] = useState(false)
  const [result, setResult] = useState<{ bmi: number; label: string; color: string; glp1: boolean; glp1Reason: string } | null>(null)

  const calculate = () => {
    const w = parseFloat(weight)
    const h = parseFloat(height)
    if (!w || !h || w <= 0 || h <= 0) return
    const bmi = w / Math.pow(h / 100, 2)

    let label: string, color: string
    if (bmi < 18.5) { label = 'น้ำหนักน้อยกว่าเกณฑ์'; color = 'text-blue-600' }
    else if (bmi < 23) { label = 'น้ำหนักปกติ'; color = 'text-green-600' }
    else if (bmi < 25) { label = 'น้ำหนักเกิน (เฝ้าระวัง)'; color = 'text-yellow-600' }
    else if (bmi < 30) { label = 'อ้วนระดับ 1'; color = 'text-orange-600' }
    else { label = 'อ้วนระดับ 2'; color = 'text-red-600' }

    const glp1 = bmi >= 30 || (bmi >= 27.5 && comorbidity)
    const glp1Reason = bmi >= 30
      ? 'BMI ≥ 30 เข้าเกณฑ์ใช้ GLP-1 ได้'
      : bmi >= 27.5 && comorbidity
        ? 'BMI ≥ 27.5 ร่วมกับโรคร่วม เข้าเกณฑ์ใช้ GLP-1 ได้'
        : bmi >= 27.5
          ? 'BMI ≥ 27.5 แต่ยังไม่มีโรคร่วม (เพิ่มเติมข้อมูลโรคร่วม)'
          : 'BMI ยังไม่ถึงเกณฑ์ใช้ GLP-1 (ต้องการ BMI ≥ 27.5 + โรคร่วม หรือ BMI ≥ 30)'

    setResult({ bmi: Math.round(bmi * 10) / 10, label, color, glp1, glp1Reason })
  }

  return (
    <div className="bg-white border border-mint/20 rounded-2xl p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">💉</span>
        <div>
          <h2 className="font-display text-xl text-forest">BMI & GLP-1 Eligibility</h2>
          <p className="text-xs text-muted">ประเมินความเหมาะสมสำหรับยาลดน้ำหนัก GLP-1</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-semibold text-muted mb-1.5">น้ำหนัก (กก.)</label>
          <input
            type="number" value={weight} onChange={e => setWeight(e.target.value)}
            placeholder="เช่น 75" min="20" max="300"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-mint"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted mb-1.5">ส่วนสูง (ซม.)</label>
          <input
            type="number" value={height} onChange={e => setHeight(e.target.value)}
            placeholder="เช่น 165" min="100" max="250"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-mint"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 mb-5 cursor-pointer">
        <input type="checkbox" checked={comorbidity} onChange={e => setComorbidity(e.target.checked)} className="w-4 h-4 accent-forest" />
        <span className="text-sm text-muted">มีโรคร่วม (เบาหวาน / ความดันสูง / ไขมันสูง)</span>
      </label>

      <button
        onClick={calculate}
        className="w-full bg-forest text-white py-3 rounded-xl text-sm font-semibold hover:bg-sage transition-colors"
      >
        คำนวณ BMI
      </button>

      {result && (
        <div className="mt-5 space-y-3 animate-fade-in">
          <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
            <span className="text-sm text-muted">ค่า BMI ของคุณ</span>
            <span className={`text-3xl font-bold ${result.color}`}>{result.bmi}</span>
          </div>
          <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${result.color} bg-current/5`} style={{ backgroundColor: 'transparent' }}>
            <span className={result.color}>{result.label}</span>
          </div>
          <div className={`rounded-xl p-4 text-sm ${result.glp1 ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50 border border-gray-200'}`}>
            <p className={`font-semibold mb-1 ${result.glp1 ? 'text-emerald-700' : 'text-gray-600'}`}>
              {result.glp1 ? '✅ เหมาะสมสำหรับ GLP-1' : '⚪ ยังไม่เข้าเกณฑ์ GLP-1'}
            </p>
            <p className="text-xs text-muted leading-relaxed">{result.glp1Reason}</p>
          </div>
          {result.glp1 && (
            <Link href="/contact?service=glp1" className="block text-center bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors">
              ปรึกษาแพทย์เรื่อง GLP-1 ฟรี →
            </Link>
          )}
          <p className="text-[10px] text-gray-400 text-center">ผลการคำนวณเป็นการประเมินเบื้องต้นเท่านั้น ต้องได้รับการประเมินจากแพทย์ก่อนเริ่มยา</p>
        </div>
      )}
    </div>
  )
}

// ─── EGFR CALCULATOR (CKD-EPI 2021) ────────────────────────────────────────────

function EGFRCalc() {
  const [creatinine, setCreatinine] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState<'male' | 'female'>('male')
  const [result, setResult] = useState<{ egfr: number; stage: number; label: string; color: string; advice: string } | null>(null)

  const calculate = () => {
    const scr = parseFloat(creatinine)
    const a = parseInt(age)
    if (!scr || !a || scr <= 0 || a <= 0) return

    const kappa = sex === 'female' ? 0.7 : 0.9
    const alpha = sex === 'female' ? -0.241 : -0.302
    const sexMult = sex === 'female' ? 1.012 : 1.0
    const ratio = scr / kappa
    const egfr = 142 * Math.pow(Math.min(ratio, 1), alpha) * Math.pow(Math.max(ratio, 1), -1.200) * Math.pow(0.9938, a) * sexMult

    const val = Math.round(egfr)
    let stage: number, label: string, color: string, advice: string
    if (egfr >= 90) {
      stage = 1; label = 'G1 — ปกติ หรือสูง'; color = 'text-green-600'
      advice = 'ค่าไตปกติ แนะนำตรวจสม่ำเสมอทุกปีหากมีความเสี่ยง'
    } else if (egfr >= 60) {
      stage = 2; label = 'G2 — ลดลงเล็กน้อย'; color = 'text-lime-600'
      advice = 'ควรพบแพทย์และตรวจค่าไตทุก 6-12 เดือน'
    } else if (egfr >= 45) {
      stage = 3; label = 'G3a — ลดลงปานกลาง'; color = 'text-yellow-600'
      advice = 'ควรพบอายุรแพทย์โรคไต ปรับอาหารและยา'
    } else if (egfr >= 30) {
      stage = 3; label = 'G3b — ลดลงปานกลาง-มาก'; color = 'text-orange-600'
      advice = 'ต้องพบแพทย์โรคไตโดยด่วน วางแผนการรักษาระยะยาว'
    } else if (egfr >= 15) {
      stage = 4; label = 'G4 — ลดลงมาก'; color = 'text-red-600'
      advice = 'ต้องเตรียมพร้อมสำหรับการบำบัดทดแทนไต (ล้างไต/ปลูกถ่าย)'
    } else {
      stage = 5; label = 'G5 — ไตวาย'; color = 'text-red-800'
      advice = 'ต้องบำบัดทดแทนไตทันที ติดต่อแพทย์โรคไตฉุกเฉิน'
    }

    setResult({ egfr: val, stage, label, color, advice })
  }

  return (
    <div className="bg-white border border-mint/20 rounded-2xl p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🫘</span>
        <div>
          <h2 className="font-display text-xl text-forest">eGFR Calculator (CKD-EPI)</h2>
          <p className="text-xs text-muted">ประเมินระยะโรคไตเรื้อรัง จากค่าครีอะตินีนในเลือด</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-semibold text-muted mb-1.5">Creatinine (mg/dL)</label>
          <input
            type="number" value={creatinine} onChange={e => setCreatinine(e.target.value)}
            placeholder="เช่น 1.2" step="0.1" min="0.1" max="20"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-mint"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted mb-1.5">อายุ (ปี)</label>
          <input
            type="number" value={age} onChange={e => setAge(e.target.value)}
            placeholder="เช่น 55" min="18" max="110"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-mint"
          />
        </div>
      </div>

      <div className="mb-5">
        <label className="block text-xs font-semibold text-muted mb-1.5">เพศ</label>
        <div className="flex gap-3">
          {(['male', 'female'] as const).map(s => (
            <button key={s} onClick={() => setSex(s)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${sex === s ? 'bg-forest text-white border-forest' : 'border-gray-200 text-muted hover:border-mint'}`}>
              {s === 'male' ? '♂ ชาย' : '♀ หญิง'}
            </button>
          ))}
        </div>
      </div>

      <button onClick={calculate} className="w-full bg-forest text-white py-3 rounded-xl text-sm font-semibold hover:bg-sage transition-colors">
        คำนวณ eGFR
      </button>

      {result && (
        <div className="mt-5 space-y-3">
          <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
            <span className="text-sm text-muted">eGFR ของคุณ</span>
            <span className={`text-3xl font-bold ${result.color}`}>{result.egfr} <span className="text-sm font-normal">mL/min</span></span>
          </div>
          <div className={`rounded-xl p-4 border ${result.stage >= 4 ? 'bg-red-50 border-red-200' : result.stage === 3 ? 'bg-orange-50 border-orange-200' : result.stage === 2 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
            <p className={`font-semibold mb-1 ${result.color}`}>{result.label}</p>
            <p className="text-xs text-muted leading-relaxed">{result.advice}</p>
          </div>
          {result.stage >= 2 && (
            <Link href="/contact?service=ckd" className="block text-center bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
              ปรึกษาแพทย์โรคไต ฟรี →
            </Link>
          )}
          <p className="text-[10px] text-gray-400 text-center">สูตร CKD-EPI 2021 (Race-free) ใช้เพื่อประเมินเบื้องต้นเท่านั้น</p>
        </div>
      )}
    </div>
  )
}

// ─── PREP RISK QUIZ ─────────────────────────────────────────────────────────────

const PREP_QUESTIONS = [
  {
    q: 'คุณมีคู่นอนมากกว่า 1 คน ในช่วง 6 เดือนที่ผ่านมา?',
    a: ['ไม่มี', 'มี 2-3 คน', 'มี 4 คนขึ้นไป'],
    scores: [0, 1, 2],
  },
  {
    q: 'คุณใช้ถุงยางอนามัยทุกครั้งที่มีเพศสัมพันธ์?',
    a: ['ใช้ทุกครั้ง', 'ใช้บางครั้ง', 'ไม่ค่อยใช้ / ไม่ใช้เลย'],
    scores: [0, 1, 2],
  },
  {
    q: 'คู่นอนของคุณมีสถานะ HIV ที่ทราบหรือไม่?',
    a: ['ทราบว่า HIV(-)', 'ไม่ทราบสถานะ', 'HIV(+) หรือกำลังรักษา'],
    scores: [0, 1, 2],
  },
  {
    q: 'คุณเคยมีประวัติโรคติดต่อทางเพศสัมพันธ์ (STD) ในช่วง 12 เดือนที่ผ่านมา?',
    a: ['ไม่เคย', 'ตรวจพบ 1 ครั้ง', 'ตรวจพบมากกว่า 1 ครั้ง'],
    scores: [0, 1, 2],
  },
  {
    q: 'คุณใช้ยาหรือสารเสพติดก่อน/ระหว่างมีเพศสัมพันธ์?',
    a: ['ไม่เคย', 'นานๆ ครั้ง', 'บ่อยครั้ง'],
    scores: [0, 1, 2],
  },
]

function PrEPQuiz() {
  const [answers, setAnswers] = useState<(number | null)[]>(Array(5).fill(null))
  const [result, setResult] = useState<{ score: number; level: string; color: string; advice: string; recommend: boolean } | null>(null)

  const answer = (qi: number, score: number) => {
    setAnswers(prev => { const n = [...prev]; n[qi] = score; return n })
    setResult(null)
  }

  const calculate = () => {
    if (answers.some(a => a === null)) return
    const total = answers.reduce<number>((s, a) => s + (a ?? 0), 0)
    let level: string, color: string, advice: string, recommend: boolean

    if (total <= 2) {
      level = 'ความเสี่ยงต่ำ'; color = 'text-green-700'; recommend = false
      advice = 'ความเสี่ยงในปัจจุบันค่อนข้างต่ำ แต่ควรตรวจ STD สม่ำเสมอทุก 6-12 เดือน และใช้ถุงยางอนามัยทุกครั้ง'
    } else if (total <= 5) {
      level = 'ความเสี่ยงปานกลาง'; color = 'text-yellow-700'; recommend = true
      advice = 'คุณมีความเสี่ยงปานกลาง ควรปรึกษาแพทย์เกี่ยวกับ PrEP และตรวจ STD ทุก 3-6 เดือน'
    } else {
      level = 'ความเสี่ยงสูง'; color = 'text-red-700'; recommend = true
      advice = 'แนะนำอย่างยิ่งให้เริ่ม PrEP โดยเร็ว PrEP ที่กินสม่ำเสมอสามารถลดความเสี่ยงติด HIV ได้มากกว่า 99%'
    }

    setResult({ score: total, level, color, advice, recommend })
  }

  const allAnswered = answers.every(a => a !== null)

  return (
    <div className="bg-white border border-mint/20 rounded-2xl p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🔴</span>
        <div>
          <h2 className="font-display text-xl text-forest">PrEP Risk Assessment</h2>
          <p className="text-xs text-muted">ประเมินความเสี่ยงและความเหมาะสมในการเริ่ม PrEP ป้องกัน HIV</p>
        </div>
      </div>

      <div className="space-y-5">
        {PREP_QUESTIONS.map((q, qi) => (
          <div key={qi} className="border border-gray-100 rounded-xl p-4">
            <p className="text-sm font-semibold text-forest mb-3">{qi + 1}. {q.q}</p>
            <div className="space-y-2">
              {q.a.map((option, ai) => (
                <button key={ai} onClick={() => answer(qi, q.scores[ai])}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all border ${answers[qi] === q.scores[ai] ? 'bg-forest text-white border-forest' : 'border-gray-200 text-muted hover:border-mint hover:bg-mint/5'}`}>
                  {option}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={calculate}
        disabled={!allAnswered}
        className="w-full mt-5 bg-forest text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-sage transition-colors"
      >
        ดูผลการประเมิน
      </button>

      {result && (
        <div className="mt-5 space-y-3">
          <div className={`rounded-xl p-5 border ${result.recommend ? result.score > 5 ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
            <p className={`text-lg font-bold mb-2 ${result.color}`}>{result.level}</p>
            <p className="text-sm text-muted leading-relaxed">{result.advice}</p>
          </div>
          {result.recommend && (
            <Link href="/contact?service=std" className="block text-center bg-rose-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-rose-700 transition-colors">
              ปรึกษาเรื่อง PrEP ฟรี →
            </Link>
          )}
          <p className="text-[10px] text-gray-400 text-center">การประเมินนี้ไม่ใช่การวินิจฉัยทางการแพทย์ ปรึกษาแพทย์เสมอก่อนเริ่ม PrEP</p>
        </div>
      )}
    </div>
  )
}

// ─── EXPORT ─────────────────────────────────────────────────────────────────────

export { BMICalc, EGFRCalc, PrEPQuiz }
