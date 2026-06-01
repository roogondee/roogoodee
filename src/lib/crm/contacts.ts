import { supabaseAdmin } from '@/lib/supabase'
import type { ContactKeys, CrmContact } from './types'

const KEY_COLUMNS: (keyof ContactKeys)[] = [
  'phone', 'line_user_id', 'facebook_user_id', 'instagram_user_id', 'patient_id',
]

// Find an existing contact matching ANY known identifier, fill in newly-known
// fields, and return it. Creates one if none matches. This is what lets a
// person be a single customer across pillars + channels.
export async function resolveContact(keys: ContactKeys): Promise<CrmContact | null> {
  const conditions = KEY_COLUMNS
    .filter((k) => keys[k])
    .map((k) => `${k}.eq.${keys[k]}`)

  if (conditions.length === 0) return null

  const { data: matches } = await supabaseAdmin
    .from('crm_contacts')
    .select('*')
    .or(conditions.join(','))
    .limit(1)

  const existing = matches?.[0] as CrmContact | undefined

  if (existing) {
    // Backfill any identifier/name we now know but the row was missing.
    const patch: Partial<CrmContact> = {}
    for (const k of KEY_COLUMNS) {
      if (keys[k] && !existing[k]) (patch as Record<string, unknown>)[k] = keys[k]
    }
    if (keys.name && !existing.name) patch.name = keys.name
    if (Object.keys(patch).length === 0) return existing

    patch.updated_at = new Date().toISOString()
    const { data } = await supabaseAdmin
      .from('crm_contacts')
      .update(patch)
      .eq('id', existing.id)
      .select('*')
      .single()
    return (data as CrmContact) ?? existing
  }

  const { data, error } = await supabaseAdmin
    .from('crm_contacts')
    .insert([{
      phone: keys.phone ?? null,
      line_user_id: keys.line_user_id ?? null,
      facebook_user_id: keys.facebook_user_id ?? null,
      instagram_user_id: keys.instagram_user_id ?? null,
      patient_id: keys.patient_id ?? null,
      name: keys.name ?? null,
    }])
    .select('*')
    .single()

  if (error) {
    console.error('resolveContact insert failed:', error.message)
    return null
  }
  return data as CrmContact
}
