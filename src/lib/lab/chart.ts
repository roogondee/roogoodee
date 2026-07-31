import type { AnalyteFlag, AnalyteTimeline } from './types'

// Pure SVG geometry shared by the web chart component and the PDF <Svg>.
// No charting library — just coordinate math so both renderers agree.

export interface ChartPoint {
  x: number
  y: number
  value: number
  date: string
  flag: AnalyteFlag
  abnormal: boolean
}

export interface ChartTick {
  pos: number   // pixel position
  label: string
}

export interface ChartSeries {
  width: number
  height: number
  points: ChartPoint[]
  polyline: string                 // "x1,y1 x2,y2 ..."
  refBand?: { yTop: number; yBottom: number }
  targetLine?: { y: number; value: number }
  projection?: { x: number; y: number; value: number }
  yTicks: ChartTick[]
  xTicks: ChartTick[]
}

export interface ChartOpts {
  width?: number
  height?: number
  padding?: number
}

function isAbnormal(flag: AnalyteFlag): boolean {
  return flag === 'H' || flag === 'L' || flag === 'HH' || flag === 'LL' || flag === 'A'
}

// Least-squares slope/intercept over (index, value) for the projection point.
function linReg(values: number[]): { slope: number; intercept: number } | null {
  const n = values.length
  if (n < 2) return null
  let sx = 0, sy = 0, sxy = 0, sxx = 0
  values.forEach((y, i) => {
    sx += i; sy += y; sxy += i * y; sxx += i * i
  })
  const denom = n * sxx - sx * sx
  if (denom === 0) return null
  const slope = (n * sxy - sx * sy) / denom
  const intercept = (sy - slope * sx) / n
  return { slope, intercept }
}

export function buildChartSeries(t: AnalyteTimeline, opts: ChartOpts = {}): ChartSeries | null {
  const width = opts.width ?? 320
  const height = opts.height ?? 160
  const pad = opts.padding ?? 28

  const numeric = t.points.filter((p) => p.numeric_value != null) as Array<
    AnalyteTimeline['points'][number] & { numeric_value: number }
  >
  if (numeric.length === 0) return null

  const values = numeric.map((p) => p.numeric_value)
  const reg = linReg(values)
  const projValue = reg ? reg.slope * numeric.length + reg.intercept : undefined

  // Domain spans data + reference bounds + projection so everything fits.
  const candidates = [...values]
  if (t.ref_low != null) candidates.push(t.ref_low)
  if (t.ref_high != null) candidates.push(t.ref_high)
  if (projValue != null) candidates.push(projValue)
  let min = Math.min(...candidates)
  let max = Math.max(...candidates)
  if (min === max) { min -= 1; max += 1 }
  const span = max - min
  min -= span * 0.1
  max += span * 0.1

  const plotW = width - pad * 2
  const plotH = height - pad * 2
  // x slots: one per point, plus a trailing slot for the projection.
  const slots = numeric.length + (projValue != null ? 1 : 0)
  const xAt = (i: number) =>
    pad + (slots <= 1 ? plotW / 2 : (plotW * i) / (slots - 1))
  const yAt = (v: number) => pad + plotH - ((v - min) / (max - min)) * plotH

  const points: ChartPoint[] = numeric.map((p, i) => ({
    x: xAt(i),
    y: yAt(p.numeric_value),
    value: p.numeric_value,
    date: p.report_date,
    flag: p.flag,
    abnormal: isAbnormal(p.flag),
  }))

  const polyline = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  let refBand: ChartSeries['refBand']
  if (t.ref_low != null || t.ref_high != null) {
    const yTop = yAt(t.ref_high ?? max)
    const yBottom = yAt(t.ref_low ?? min)
    refBand = { yTop, yBottom }
  }

  // Target line = the "ideal" bound: upper bound if lower-is-better feel, else lower.
  let targetLine: ChartSeries['targetLine']
  if (t.ref_high != null) targetLine = { y: yAt(t.ref_high), value: t.ref_high }
  else if (t.ref_low != null) targetLine = { y: yAt(t.ref_low), value: t.ref_low }

  let projection: ChartSeries['projection']
  if (projValue != null) {
    projection = {
      x: xAt(numeric.length),
      y: yAt(projValue),
      value: +projValue.toFixed(2),
    }
  }

  const yTicks: ChartTick[] = [min, (min + max) / 2, max].map((v) => ({
    pos: yAt(v),
    label: (+v.toFixed(1)).toString(),
  }))
  const xTicks: ChartTick[] = numeric.map((p, i) => ({
    pos: xAt(i),
    label: p.report_date.slice(0, 7), // YYYY-MM
  }))

  // Guard: a non-finite coordinate (NaN/Infinity from degenerate data) makes the
  // PDF renderer throw deep in SVG layout. Skip the chart rather than crash.
  const coords = [
    ...points.flatMap((p) => [p.x, p.y]),
    ...(refBand ? [refBand.yTop, refBand.yBottom] : []),
    ...(targetLine ? [targetLine.y] : []),
    ...(projection ? [projection.x, projection.y] : []),
  ]
  if (coords.some((n) => !Number.isFinite(n))) return null

  return { width, height, points, polyline, refBand, targetLine, projection, yTicks, xTicks }
}
