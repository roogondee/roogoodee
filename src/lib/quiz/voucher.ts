import { randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import type { Service, Voucher } from '@/types'

const VOUCHER_TTL_DAYS = 14

const SERVICE_CODE: Record<Service, string> = {
  glp1: 'GLP1',
  ckd: 'CKD',
  std: 'STD',
  foreign: 'FRN',
  mens: 'MENS',
}

// A-Z + 2-9 (avoid 0/1/O/I for voice/SMS readability)
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomSegment(len: number): string {
  const bytes = randomBytes(len)
  let out = ''
  for (let i = 0; i < len; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return out
}

export function generateVoucherCode(service: Service): string {
  return `RGD-${SERVICE_CODE[service]}-${randomSegment(6)}`
}

export interface IssueVoucherInput {
  leadId: string
  service: Service
}

export async function issueVoucher({ leadId, service }: IssueVoucherInput): Promise<Voucher> {
  const expiresAt = new Date(Date.now() + VOUCHER_TTL_DAYS * 24 * 60 * 60 * 1000)

  // Retry a handful of times on the (extremely unlikely) unique-code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateVoucherCode(service)
    const { data, error } = await supabaseAdmin
      .from('vouchers')
      .insert([{ code, lead_id: leadId, service, expires_at: expiresAt.toISOString() }])
      .select()
      .single()

    if (!error && data) return data as Voucher
    // 23505 = unique_violation
    if (error && error.code !== '23505') throw error
  }
  throw new Error('Failed to generate unique voucher code')
}
