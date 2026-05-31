import type { Service } from '@/types'

export type Channel = 'line' | 'facebook' | 'instagram' | 'email'

export interface CrmContact {
  id: string
  patient_id?: string | null
  name?: string | null
  phone?: string | null
  line_user_id?: string | null
  facebook_user_id?: string | null
  instagram_user_id?: string | null
  consent_pdpa?: boolean
  consent_at?: string | null
  primary_owner?: string | null
  created_at?: string
  updated_at?: string
}

export type SequenceTrigger = 'welcome' | 'cross_sell' | 'lab_abnormal' | 'manual'

export interface SequenceStep {
  day_offset: number          // days after enrollment (or after previous step)
  channel_pref?: Channel      // preferred channel; sendToContact falls back
  prompt: string              // instruction for the AI message drafter
}

export interface NurtureSequence {
  id: string
  name: string
  service?: Service | null
  trigger: SequenceTrigger
  steps: SequenceStep[]
  active: boolean
  created_at?: string
}

export type EnrollmentStatus = 'active' | 'paused' | 'completed' | 'stopped'

export interface NurtureEnrollment {
  id: string
  contact_id: string
  sequence_id: string
  current_step: number
  status: EnrollmentStatus
  next_run_at?: string | null
  last_sent_at?: string | null
  started_at?: string
}

// Keys we can resolve a contact by (any subset).
export interface ContactKeys {
  phone?: string | null
  line_user_id?: string | null
  facebook_user_id?: string | null
  instagram_user_id?: string | null
  patient_id?: string | null
  name?: string | null
}
