// Tools for the general-illness advice agent (/api/advice).
//
// Deliberately a different set from AGENT_TOOLS: the advice agent must be able
// to route into all eight pillars (the chat widget only knows five), and it must
// NOT be able to book an appointment — since 2026-08-07 booking lives on LINE,
// so the agent hands off instead of pretending to hold a calendar.

import Anthropic from '@anthropic-ai/sdk'
import type { Service } from '@/types'
import { ROUTES, nextStepUrl, serviceRoute as sharedServiceRoute } from '@/lib/advice/routes'
import {
  AGENT_TOOLS,
  executeTool,
  type ToolExecutionContext,
  type ToolResult,
} from '@/lib/agent/tools'

const RECOMMEND_SERVICE_TOOL: Anthropic.Tool = {
  name: 'recommend_service',
  description:
    'Look up which RooGonDee service fits this person and get the exact next-step link and ' +
    'offer wording. Call this ONCE, only after you have already answered their health question, ' +
    'and only when one of our services genuinely matches their symptoms. This is the only source ' +
    'for the women / mind / dna pillars (get_service_info does not cover them). Use "general" when ' +
    'the complaint is an ordinary illness that none of the specific pillars cover. Never invent ' +
    'an offer — read back the wording this tool returns.',
  input_schema: {
    type: 'object',
    properties: {
      service: {
        type: 'string',
        enum: ['glp1', 'std', 'ckd', 'foreign', 'mens', 'women', 'mind', 'dna', 'general'],
        description: 'The pillar that fits the symptoms described.',
      },
      reason: {
        type: 'string',
        description: 'One short sentence (Thai) on why this fits, shown to the sales team.',
      },
    },
    required: ['service'],
  },
}

// create_lead with the full nine-value service enum. AGENT_TOOLS' version only
// offers five, which would force the advice agent to file a women/mind lead as
// "general" and lose the routing the model just worked out.
const ADVICE_CREATE_LEAD: Anthropic.Tool = {
  name: 'create_lead',
  description:
    'Save the visitor as a lead once they have given BOTH a name AND a Thai phone number AND ' +
    'agreed to be contacted. The team calls back within 30 minutes during opening hours. ' +
    'Do NOT call this speculatively and never ask for contact details before you have answered ' +
    'their health question.',
  input_schema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Name as the user gave it.' },
      phone: { type: 'string', description: 'Thai phone number, 9-10 digits, starts with 0.' },
      service: {
        type: 'string',
        enum: ['glp1', 'std', 'ckd', 'foreign', 'mens', 'women', 'mind', 'dna', 'general'],
        description: 'Best-matching service, or "general" for an ordinary illness.',
      },
      note: {
        type: 'string',
        description:
          'Short Thai summary of the symptoms for the team: what hurts, how long, red flags. <300 chars.',
      },
    },
    required: ['name', 'phone', 'service'],
  },
}

const SHARED = AGENT_TOOLS.filter(t => t.name === 'search_blog_posts' || t.name === 'get_service_info')

export const ADVICE_TOOLS: Anthropic.Tool[] = [
  ...SHARED,
  RECOMMEND_SERVICE_TOOL,
  ADVICE_CREATE_LEAD,
]

function handleRecommendService(input: { service?: string; reason?: string }): ToolResult {
  const key = (input.service || 'general') as Service | 'general'
  const target = ROUTES[key] ?? ROUTES.general
  const service = ROUTES[key] ? key : 'general'

  return {
    output: {
      service,
      label: target.label,
      who_it_fits: target.fits,
      offer: target.free,
      caution: target.note,
      next_step_url: nextStepUrl(service),
      cta_hint:
        'Tell the user what the offer includes in one line, then invite them to continue on ' +
        'LINE @roogondee. The UI already shows the button — do not paste the raw URL.',
    },
    serviceSuggested: service,
  }
}

export async function executeAdviceTool(
  name: string,
  rawInput: unknown,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  if (name === 'recommend_service') {
    const input = (rawInput && typeof rawInput === 'object' ? rawInput : {}) as {
      service?: string
      reason?: string
    }
    return handleRecommendService(input)
  }
  return executeTool(name, rawInput, ctx)
}

// Re-exported so callers only need one import path; the actual table lives in
// advice/routes.ts (client-safe — no supabaseAdmin/email/LINE-push imports).
export const serviceRoute = sharedServiceRoute
