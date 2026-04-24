import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'

// AES-256-GCM application-level encryption for sensitive fields
// (spec §8.2: encrypt STD data at rest).
//
// Envelope format in DB: { _enc: true, v: 1, ct, iv, tag }
// — stored in the same jsonb column so readers can detect and decrypt.

const ALG = 'aes-256-gcm'
const IV_LENGTH = 12

interface EncryptedEnvelope {
  _enc: true
  v: 1
  ct: string
  iv: string
  tag: string
}

function getKey(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) return null
  // Accept either 64-char hex (32 bytes) or any passphrase — hash it to 32 bytes.
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, 'hex')
  return createHash('sha256').update(raw).digest()
}

export function isEncrypted(v: unknown): v is EncryptedEnvelope {
  return !!(v && typeof v === 'object' && (v as { _enc?: boolean })._enc === true)
}

export function encryptJson(value: unknown): unknown {
  const key = getKey()
  if (!key) return value // fail-open for local/dev

  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALG, key, iv)
  const plain = Buffer.from(JSON.stringify(value), 'utf8')
  const ct = Buffer.concat([cipher.update(plain), cipher.final()])
  const tag = cipher.getAuthTag()

  const envelope: EncryptedEnvelope = {
    _enc: true,
    v: 1,
    ct: ct.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  }
  return envelope
}

export function decryptJson(stored: unknown): unknown {
  if (!isEncrypted(stored)) return stored
  const key = getKey()
  if (!key) {
    console.error('decryptJson: ENCRYPTION_KEY not set but row is encrypted')
    return null
  }
  try {
    const decipher = createDecipheriv(ALG, key, Buffer.from(stored.iv, 'base64'))
    decipher.setAuthTag(Buffer.from(stored.tag, 'base64'))
    const plain = Buffer.concat([
      decipher.update(Buffer.from(stored.ct, 'base64')),
      decipher.final(),
    ])
    return JSON.parse(plain.toString('utf8'))
  } catch (err) {
    console.error('decryptJson failed:', err)
    return null
  }
}
