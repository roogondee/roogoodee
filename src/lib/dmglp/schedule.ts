// Care-schedule generation (§4.3). Enrolling on date X creates the 9
// template appointments at fixed offsets; after W24 the maintenance template
// is monthly follow-ups with a specialist visit every 3rd month.

import { SCHEDULE_TEMPLATE, type AppointmentType, type LabPanel } from './config.ts'
import { addDays, addMonths, type IsoDate } from './dates.ts'

export interface PlannedAppointment {
  template_code: string
  type: AppointmentType
  scheduled_date: IsoDate
  lab_panel: LabPanel | null
  drug_linked: boolean
}

export function generateSchedule(startDate: IsoDate): PlannedAppointment[] {
  return SCHEDULE_TEMPLATE.map(step => ({
    template_code: step.code,
    type: step.type,
    scheduled_date: addDays(startDate, step.offsetDays),
    lab_panel: step.labPanel,
    drug_linked: step.drugLinked,
  }))
}

// Maintenance (§4.3): monthly followup_visit; every 3rd month a
// specialist_visit with HbA1c+FBS; every 6th month the q6m panel; every 12th
// month the yearly panel (UACR + eye/foot exam as procedures).
export function generateMaintenanceSchedule(fromDate: IsoDate, months = 12): PlannedAppointment[] {
  const out: PlannedAppointment[] = []
  for (let m = 1; m <= months; m++) {
    const date = addMonths(fromDate, m)
    const specialist = m % 3 === 0
    let lab: LabPanel | null = null
    if (m % 12 === 0) lab = 'yearly'
    else if (m % 6 === 0) lab = 'q6m'
    else if (specialist) lab = 'q3m'
    out.push({
      template_code: `M${m}`,
      type: specialist ? 'specialist_visit' : 'followup_visit',
      scheduled_date: date,
      lab_panel: lab,
      drug_linked: true,
    })
  }
  return out
}

// Rescheduling one visit shifts LATER drug-linked visits by the same delta
// only when the doctor chooses "shift schedule".
export interface ShiftInput {
  appointments: Array<{ id: string; scheduled_date: IsoDate; drug_linked: boolean; status: string }>
  movedId: string
  newDate: IsoDate
  shiftLater: boolean
}

export function reschedule(input: ShiftInput): Array<{ id: string; scheduled_date: IsoDate }> {
  const moved = input.appointments.find(a => a.id === input.movedId)
  if (!moved) return []
  const delta = Math.round((Date.parse(`${input.newDate}T00:00:00Z`) - Date.parse(`${moved.scheduled_date}T00:00:00Z`)) / 86_400_000)
  const changes = [{ id: moved.id, scheduled_date: input.newDate }]
  if (!input.shiftLater || delta === 0) return changes
  for (const a of input.appointments) {
    if (a.id === moved.id || !a.drug_linked) continue
    if (a.scheduled_date <= moved.scheduled_date) continue
    if (!['scheduled', 'rescheduled'].includes(a.status)) continue
    changes.push({ id: a.id, scheduled_date: addDays(a.scheduled_date, delta) })
  }
  return changes
}
