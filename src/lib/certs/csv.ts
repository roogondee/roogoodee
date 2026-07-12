// Minimal RFC-4180 CSV parser for the certificate batch import.
// Handles quoted fields, "" escapes, CR/LF/CRLF, and the UTF-8 BOM that
// Excel's "CSV UTF-8" export prepends. Staff export .xlsx as CSV UTF-8 —
// native Excel parsing is intentionally out of scope (no new dependency).

export function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++ } else { inQuotes = false }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field); field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(field); field = ''
      rows.push(row); row = []
    } else {
      field += ch
    }
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row) }
  // Drop fully-empty trailing rows (Excel often leaves one).
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

// Header aliases: Thai or English, mapped to canonical keys.
const HEADER_ALIASES: Record<string, string> = {
  'id_type': 'id_type', 'ประเภทเอกสาร': 'id_type',
  'national_id': 'national_id', 'เลขบัตรประชาชน': 'national_id',
  'passport_no': 'national_id', 'passport': 'national_id', 'เลขพาสปอร์ต': 'national_id',
  'name': 'name', 'ชื่อ': 'name', 'ชื่อ-นามสกุล': 'name',
  'dob': 'dob', 'วันเกิด': 'dob',
  'gender': 'gender', 'เพศ': 'gender',
  'nationality': 'nationality', 'สัญชาติ': 'nationality',
  'phone': 'phone', 'เบอร์โทร': 'phone',
  'visit_date': 'visit_date', 'วันที่ตรวจ': 'visit_date',
  'weight_kg': 'weight_kg', 'น้ำหนัก': 'weight_kg',
  'height_cm': 'height_cm', 'ส่วนสูง': 'height_cm',
  'bp_sys': 'bp_sys', 'bp_dia': 'bp_dia',
  'pulse': 'pulse', 'ชีพจร': 'pulse',
  'fit_status': 'fit_status', 'ผลสรุป': 'fit_status',
  'summary': 'summary', 'ความเห็นแพทย์': 'summary',
  'consent': 'consent', 'ยินยอม': 'consent',
  'employer_name': 'employer_name', 'นายจ้าง': 'employer_name',
  'work_permit_no': 'work_permit_no', 'เลขใบอนุญาตทำงาน': 'work_permit_no',
}

export interface CsvCertRow {
  rowNumber: number            // 1-based, header = row 1
  fields: Record<string, string>
  labs: Record<string, string>     // from `lab:FBS`-style columns
  items: Record<string, string>    // from `item:1`..`item:9` overrides
}

export function mapCsvRows(rows: string[][]): { rows: CsvCertRow[]; unknownHeaders: string[] } {
  if (rows.length === 0) return { rows: [], unknownHeaders: [] }
  const rawHeaders = rows[0].map((h) => h.trim())
  const unknownHeaders: string[] = []
  const mapping: ({ kind: 'field' | 'lab' | 'item'; key: string } | null)[] = rawHeaders.map((h) => {
    const lower = h.toLowerCase()
    if (lower.startsWith('lab:')) return { kind: 'lab', key: h.slice(4).trim() }
    if (lower.startsWith('item:')) return { kind: 'item', key: h.slice(5).trim() }
    const canonical = HEADER_ALIASES[lower] ?? HEADER_ALIASES[h]
    if (!canonical) { unknownHeaders.push(h); return null }
    return { kind: 'field', key: canonical }
  })

  const out: CsvCertRow[] = rows.slice(1).map((cells, i) => {
    const row: CsvCertRow = { rowNumber: i + 2, fields: {}, labs: {}, items: {} }
    mapping.forEach((m, col) => {
      if (!m) return
      const value = (cells[col] ?? '').trim()
      if (!value) return
      if (m.kind === 'field') row.fields[m.key] = value
      else if (m.kind === 'lab') row.labs[m.key] = value
      else row.items[m.key] = value
    })
    return row
  })
  return { rows: out, unknownHeaders }
}

// Dates: accept ISO 'YYYY-MM-DD' or Thai 'DD/MM/YYYY' with Buddhist year.
export function parseThaiDate(raw: string): string | null {
  const v = (raw || '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const day = Number(m[1]), month = Number(m[2])
  let year = Number(m[3])
  if (year > 2400) year -= 543
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
