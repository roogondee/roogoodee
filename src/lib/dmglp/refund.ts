// Program billing maths (§4.7). Programs cover services only; drugs are
// always billed per pen at dispense.
//
//   refund = amount_paid − Σ(list_price × used_qty), floored at 0

export interface UsageLine {
  item_code: string
  qty: number
}

export type PriceMap = Record<string, number>

export interface RefundResult {
  amountPaid: number
  usedValue: number
  refund: number
  lines: Array<{ item_code: string; qty: number; unit: number; total: number }>
  missingPrices: string[]
}

export function calculateRefund(amountPaid: number, usage: UsageLine[], prices: PriceMap): RefundResult {
  const lines: RefundResult['lines'] = []
  const missing: string[] = []
  let used = 0
  for (const u of usage) {
    const unit = prices[u.item_code]
    if (unit == null) { missing.push(u.item_code); continue }
    const total = round2(unit * u.qty)
    used = round2(used + total)
    lines.push({ item_code: u.item_code, qty: u.qty, unit, total })
  }
  return {
    amountPaid,
    usedValue: used,
    refund: Math.max(0, round2(amountPaid - used)),
    lines,
    missingPrices: missing,
  }
}

// Remaining entitlement per item after usage.
export function programBalance(
  entitlements: Array<{ item_code: string; qty: number }>,
  usage: UsageLine[],
): Array<{ item_code: string; entitled: number; used: number; remaining: number }> {
  const usedBy: Record<string, number> = {}
  for (const u of usage) usedBy[u.item_code] = (usedBy[u.item_code] || 0) + u.qty
  return entitlements.map(e => ({
    item_code: e.item_code,
    entitled: e.qty,
    used: usedBy[e.item_code] || 0,
    remaining: Math.max(0, e.qty - (usedBy[e.item_code] || 0)),
  }))
}

// 0% × n instalments: equal parts, remainder (satang rounding) on the last.
export function installmentPlan(price: number, n: number, firstDue: string): Array<{ seq: number; amount: number; due_date: string }> {
  const base = Math.floor((price / n) * 100) / 100
  const out: Array<{ seq: number; amount: number; due_date: string }> = []
  let acc = 0
  for (let i = 1; i <= n; i++) {
    const amount = i === n ? round2(price - acc) : base
    acc = round2(acc + amount)
    out.push({ seq: i, amount, due_date: addMonthsIso(firstDue, i - 1) })
  }
  return out
}

// When a program is cancelled, unpaid instalments are recalculated so the
// total paid equals the value of services used (finance confirms).
export function recalculateInstalments(
  installments: Array<{ seq: number; amount: number; status: string }>,
  usedValue: number,
): Array<{ seq: number; amount: number; status: string }> {
  const paid = installments.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  let outstanding = Math.max(0, round2(usedValue - paid))
  const pending = installments.filter(i => i.status !== 'paid' && i.status !== 'cancelled').sort((a, b) => a.seq - b.seq)
  const out = installments.map(i => ({ ...i }))
  for (const p of pending) {
    const row = out.find(r => r.seq === p.seq)!
    if (outstanding <= 0) { row.amount = 0; row.status = 'cancelled'; continue }
    const take = Math.min(row.amount, outstanding)
    row.amount = round2(take)
    outstanding = round2(outstanding - take)
  }
  // Anything still outstanding after existing instalments rides on the last pending one.
  if (outstanding > 0 && pending.length > 0) {
    const last = out.find(r => r.seq === pending[pending.length - 1].seq)!
    last.amount = round2(last.amount + outstanding)
    last.status = 'due'
  }
  return out
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function addMonthsIso(date: string, months: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  const day = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + months)
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(day, last))
  return d.toISOString().slice(0, 10)
}
