import { scrypt, randomBytes, createHmac, timingSafeEqual } from 'crypto'
import { promisify } from 'util'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const scryptAsync = promisify(scrypt)

export interface SessionUser {
  id: string | null    // null = legacy pseudo-manager (pre-ACL deploy)
  email: string
  name?: string | null
  role: 'manager' | 'sale'
}

// ── Password hashing (scrypt, built-in, no native deps) ────────────────
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = (await scryptAsync(password, salt, 64)) as Buffer
  return `scrypt:${salt.toString('hex')}:${key.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, keyHex] = stored.split(':')
  if (scheme !== 'scrypt' || !saltHex || !keyHex) return false
  const salt = Buffer.from(saltHex, 'hex')
  const expected = Buffer.from(keyHex, 'hex')
  const actual = (await scryptAsync(password, salt, expected.length)) as Buffer
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}

// ── Signed session cookie (userId + HMAC) ──────────────────────────────
function sessionSecret(): string {
  return process.env.SESSION_SECRET || process.env.ADMIN_SECRET || ''
}

function sign(value: string): string {
  return createHmac('sha256', sessionSecret()).update(value).digest('base64url').slice(0, 32)
}

export function makeSessionValue(userId: string): string {
  return `${userId}.${sign(userId)}`
}

function parseSession(raw: string | undefined): string | null {
  if (!raw) return null
  const [userId, sig] = raw.split('.')
  if (!userId || !sig) return null
  const expected = sign(userId)
  if (sig.length !== expected.length) return null
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  } catch {
    return null
  }
  return userId
}

// Active user count determines whether legacy ADMIN_SECRET-only login
// still works (bootstrap for first-time deploy).
async function hasAdminUsers(): Promise<boolean> {
  const { count } = await supabaseAdmin
    .from('admin_users')
    .select('id', { count: 'exact', head: true })
    .is('disabled_at', null)
  return (count ?? 0) > 0
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const raw = cookies().get('admin_session')?.value
  if (!raw) return null

  // Legacy format: raw equals ADMIN_SECRET literally (pre-ACL cookies).
  // Only honored while admin_users is empty.
  if (raw === process.env.ADMIN_SECRET) {
    if (await hasAdminUsers()) return null
    return { id: null, email: 'admin@roogondee', role: 'manager' }
  }

  const userId = parseSession(raw)
  if (!userId) return null

  const { data: user } = await supabaseAdmin
    .from('admin_users')
    .select('id, email, name, role, disabled_at')
    .eq('id', userId)
    .maybeSingle()

  if (!user || user.disabled_at) return null
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as 'manager' | 'sale',
  }
}

export async function requireSessionUser(): Promise<SessionUser | null> {
  return getSessionUser()
}

export function requestIp(req: NextRequest): string | undefined {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim()
      || req.headers.get('x-real-ip')
      || undefined
}
