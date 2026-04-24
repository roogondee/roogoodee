'use client'
import { useState } from 'react'

interface User {
  id: string
  email: string
  name: string | null
  role: string
  created_at: string
  disabled_at: string | null
  last_login_at: string | null
}

function fmt(iso: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })
}

export default function UserManagement({ initial, currentUserId }: { initial: User[]; currentUserId: string | null }) {
  const [users, setUsers] = useState(initial)
  const [showForm, setShowForm] = useState(false)

  const refresh = async () => {
    const res = await fetch('/api/admin/users')
    const data = await res.json()
    if (data.users) setUsers(data.users)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-forest mb-1">👥 Admin Users</h1>
          <p className="text-sm text-gray-500">จัดการผู้ใช้งานระบบ admin (manager/sale)</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(v => !v)}
          className="bg-forest text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-sage"
        >
          {showForm ? 'ยกเลิก' : '+ เพิ่ม User'}
        </button>
      </div>

      {showForm && <AddUserForm onCreated={() => { setShowForm(false); refresh() }} />}

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">ชื่อ</th>
              <th className="text-left px-4 py-3">Role</th>
              <th className="text-left px-4 py-3">Last login</th>
              <th className="text-left px-4 py-3">สถานะ</th>
              <th className="text-left px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(u => (
              <UserRow key={u.id} user={u} currentUserId={currentUserId} onChange={refresh} />
            ))}
            {users.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">ยังไม่มี user — เพิ่มคนแรกด้านบน</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AddUserForm({ onCreated }: { onCreated: () => void }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'manager' | 'sale'>('sale')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null); setLoading(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, role, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'เพิ่มไม่สำเร็จ'); return }
      setEmail(''); setName(''); setPassword('')
      onCreated()
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={submit} className="bg-white border border-mint/30 rounded-xl p-5 space-y-3">
      <h2 className="text-sm font-semibold">เพิ่ม User ใหม่</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@roogondee.com"
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-forest" />
        <input value={name} onChange={e => setName(e.target.value)} placeholder="ชื่อ (optional)"
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-forest" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <select value={role} onChange={e => setRole(e.target.value as 'manager' | 'sale')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-forest">
          <option value="sale">Sale (เห็นเฉพาะ lead ที่ได้รับมอบหมาย)</option>
          <option value="manager">Manager (เห็นทั้งหมด + จัดการ user)</option>
        </select>
        <input required type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="รหัสผ่าน (ขั้นต่ำ 8 ตัว)"
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-forest" />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" disabled={loading}
        className="bg-forest text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-sage disabled:opacity-50">
        {loading ? 'กำลังเพิ่ม…' : 'เพิ่ม User'}
      </button>
    </form>
  )
}

function UserRow({ user, currentUserId, onChange }: { user: User; currentUserId: string | null; onChange: () => void }) {
  const [busy, setBusy] = useState(false)

  const run = async (body: Record<string, unknown>) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) onChange()
      else {
        const data = await res.json()
        window.alert(data.error || 'ล้มเหลว')
      }
    } finally { setBusy(false) }
  }

  const disabled = !!user.disabled_at
  const isMe = user.id === currentUserId

  return (
    <tr className={disabled ? 'opacity-50' : ''}>
      <td className="px-4 py-3 font-mono text-xs">{user.email}{isMe && <span className="ml-2 text-mint">(คุณ)</span>}</td>
      <td className="px-4 py-3 text-xs">{user.name || '-'}</td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${user.role === 'manager' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
          {user.role}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">{fmt(user.last_login_at)}</td>
      <td className="px-4 py-3">
        {disabled ? (
          <span className="text-xs text-red-600">ปิดใช้งาน</span>
        ) : (
          <span className="text-xs text-green-600">ใช้งานอยู่</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-1">
          {!isMe && (
            <button disabled={busy} onClick={() => run({ action: disabled ? 'enable' : 'disable' })}
              className="text-xs text-gray-600 hover:text-forest px-2 py-1">
              {disabled ? 'เปิดใช้' : 'ปิดใช้'}
            </button>
          )}
          <button disabled={busy} onClick={() => {
            const pw = window.prompt('รหัสผ่านใหม่ (ขั้นต่ำ 8 ตัว)')
            if (pw) run({ action: 'reset_password', password: pw })
          }} className="text-xs text-gray-600 hover:text-forest px-2 py-1">
            รีเซ็ตรหัส
          </button>
        </div>
      </td>
    </tr>
  )
}
