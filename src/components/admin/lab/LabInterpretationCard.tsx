import type { LabInterpretation } from '@/lib/lab/types'

export default function LabInterpretationCard({ interp }: { interp: LabInterpretation }) {
  const urgent = interp.urgent
  return (
    <div className={`rounded-2xl p-5 border ${urgent ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
      <h3 className="font-display text-lg text-forest mb-1">{interp.headline}</h3>
      <p className="text-sm leading-relaxed text-gray-700">{interp.summary}</p>
      {interp.findings?.length > 0 && (
        <ul className="list-disc list-inside text-sm text-gray-700 mt-2 space-y-1">
          {interp.findings.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      )}
      <p className="text-sm mt-3"><span className="font-semibold">คำแนะนำ:</span> {interp.recommendation}</p>
      <p className="text-xs italic text-gray-500 border-t border-black/5 pt-2 mt-3">⚕️ {interp.disclaimer}</p>
    </div>
  )
}
