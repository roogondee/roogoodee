// Tools for the Work Permit Q&A agent (/api/workpermit-chat).
//
// Deliberately a single tool: this bot answers from a fixed FACTS block (see
// prompt.ts) and never books appointments or searches blog posts — its only
// job besides answering is capturing a lead when the visitor wants a human.

import Anthropic from '@anthropic-ai/sdk'
import {
  executeTool,
  type ToolExecutionContext,
  type ToolResult,
} from '@/lib/agent/tools'

const CREATE_LEAD_TOOL: Anthropic.Tool = {
  name: 'create_lead',
  description:
    'Save the visitor as a lead once they have given BOTH a name AND a Thai phone number AND ' +
    'agreed to be contacted — for a callback, a document question, or to book the health ' +
    'checkup. Do NOT call this speculatively and never ask for contact details before you have ' +
    'answered their question.',
  input_schema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Name as the user gave it.' },
      phone: { type: 'string', description: 'Thai phone number, 9-10 digits, starts with 0.' },
      note: {
        type: 'string',
        description:
          'Short Thai briefing (<300 chars) for whoever calls back: what they actually asked ' +
          '(e.g. document question, nationality, worker count, "จะทันไหม"), so the call opens on ' +
          'the right context instead of starting from scratch.',
      },
    },
    required: ['name', 'phone'],
  },
}

export const WORKPERMIT_TOOLS: Anthropic.Tool[] = [CREATE_LEAD_TOOL]

export async function executeWorkPermitTool(
  name: string,
  rawInput: unknown,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  if (name === 'create_lead') {
    const input = (rawInput && typeof rawInput === 'object' ? rawInput : {}) as {
      name?: string
      phone?: string
      note?: string
    }
    // service is fixed to 'foreign' — this bot only ever lives on the
    // work-permit landing page, never routed dynamically like the advice agent.
    return executeTool(
      'create_lead',
      { name: input.name, phone: input.phone, service: 'foreign', note: input.note },
      ctx
    )
  }
  return { output: { error: `unknown_tool: ${name}` } }
}
