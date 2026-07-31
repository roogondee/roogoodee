import * as XLSX from 'xlsx'

// Normalises an uploaded Excel workbook (.xlsx/.xls) to the same raw string
// grid that parseCsv() produces — first row = headers — so the certificate
// import pipeline (mapCsvRows → validateRow) stays format-agnostic.
//
// Only the first worksheet is read. Every cell is coerced to a trimmed string
// (raw: false gives the formatted/displayed text, so dates and IDs survive as
// staff see them in the sheet). Fully blank trailing rows are dropped.
export async function readSpreadsheet(buf: Buffer): Promise<string[][]> {
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: false })
  const first = wb.SheetNames[0]
  if (!first) throw new Error('ไฟล์ Excel ไม่มีชีตข้อมูล')
  const sheet = wb.Sheets[first]

  const grid = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  })

  return grid.map((row) => (Array.isArray(row) ? row.map((cell) => String(cell ?? '').trim()) : []))
}
