import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import { getSessionUser } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'

const SERVICE_LABELS: Record<string, string> = {
  std: '🔴 STD & PrEP',
  glp1: '💉 GLP-1',
  ckd: '🫘 CKD',
  foreign: '🧪 แรงงาน',
  general: '💬 ทั่วไป',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

interface TextBlock { type: 'text'; text: string }
interface ToolUseBlock { type: 'tool_use'; id: string; name: string; input: unknown }
interface ToolResultBlock { type: 'tool_result'; tool_use_id: string; content: unknown }
type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock | { type: string; [k: string]: unknown }

interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string | ContentBlock[]
}

export const revalidate = 0

export default async function ChatDetail({ params }: { params: { id: string } }) {
  const me = await getSessionUser()
  if (!me) redirect('/admin/login')

  const { data: session } = await supabaseAdmin
    .from('chat_sessions')
    .select('id,messages,service_hint,turn_count,lead_id,created_at,updated_at')
    .eq('id', params.id)
    .single()

  if (!session) notFound()

  const lead = session.lead_id
    ? (
        await supabaseAdmin
          .from('leads')
          .select('id,first_name,phone,service,status,note,created_at')
          .eq('id', session.lead_id)
          .single()
      ).data
    : null

  const messages = (Array.isArray(session.messages) ? session.messages : []) as AnthropicMessage[]

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/chats" className="text-sm text-mint hover:text-forest">← กลับไปรายการ</Link>
        <h1 className="text-2xl font-bold text-forest mt-2">บทสนทนา</h1>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500 mt-2">
          <span>📅 เริ่ม {formatDate(session.created_at as string)}</span>
          <span>🕒 อัปเดตล่าสุด {formatDate(session.updated_at as string)}</span>
          <span>🏷 {SERVICE_LABELS[session.service_hint as string] || '—'}</span>
          <span>💬 {session.turn_count} turns</span>
          <span className="text-gray-300">id: {session.id}</span>
        </div>
      </div>

      {lead && (
        <div className="bg-mint/10 border border-mint/30 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-forest/70 uppercase tracking-wide">Lead ที่ปิดได้จาก chat นี้</div>
            <div className="text-lg font-bold text-forest mt-1">
              {lead.first_name} · <a href={`tel:${lead.phone}`} className="hover:underline">{lead.phone}</a>
            </div>
            {lead.note && <div className="text-sm text-gray-600 mt-1 italic">{lead.note}</div>}
          </div>
          <Link
            href={`/admin/leads/${lead.id}`}
            className="bg-forest text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sage"
          >
            เปิดดู Lead →
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {messages.map((m, idx) => (
          <MessageRow key={idx} message={m} />
        ))}
      </div>
    </div>
  )
}

function MessageRow({ message }: { message: AnthropicMessage }) {
  const isUser = message.role === 'user'
  const blocks: ContentBlock[] =
    typeof message.content === 'string'
      ? [{ type: 'text', text: message.content }]
      : message.content

  // A user-role message that holds only tool_result blocks is system noise from
  // the agent loop — render it as a faded "tool results" row, not a chat bubble.
  const onlyToolResults =
    isUser && blocks.length > 0 && blocks.every(b => b.type === 'tool_result')

  if (onlyToolResults) {
    return (
      <details className="bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 px-3 py-2">
        <summary className="cursor-pointer">🔧 tool results ({blocks.length})</summary>
        <div className="mt-2 space-y-2">
          {blocks.map((b, i) => {
            if (b.type !== 'tool_result') return null
            const tr = b as ToolResultBlock
            return (
              <div key={i} className="bg-white border border-gray-100 rounded p-2">
                <div className="text-gray-400 mb-1">tool_use_id: {tr.tool_use_id}</div>
                <pre className="whitespace-pre-wrap break-all text-[11px]">{
                  typeof tr.content === 'string' ? tr.content : JSON.stringify(tr.content, null, 2)
                }</pre>
              </div>
            )
          })}
        </div>
      </details>
    )
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] space-y-2`}>
        {blocks.map((b, i) => {
          if (b.type === 'text') {
            const tb = b as TextBlock
            return (
              <div
                key={i}
                className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? 'bg-forest text-white rounded-br-sm'
                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                }`}
              >
                {tb.text}
              </div>
            )
          }
          if (b.type === 'tool_use') {
            const tu = b as ToolUseBlock
            return (
              <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs">
                <div className="font-mono text-amber-800">🔧 {tu.name}</div>
                <pre className="text-[11px] text-gray-600 mt-1 whitespace-pre-wrap break-all">{
                  JSON.stringify(tu.input, null, 2)
                }</pre>
              </div>
            )
          }
          return null
        })}
      </div>
    </div>
  )
}
