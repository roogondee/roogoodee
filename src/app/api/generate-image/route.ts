import { NextRequest, NextResponse } from 'next/server'

// Together.xyz FLUX.1-schnell-Free
// POST /api/generate-image
// Body: { prompt: string, width?: number, height?: number }
// Returns: { url: string } or { error: string }

export async function POST(req: NextRequest) {
  try {
    const { prompt, width = 1200, height = 630 } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    const together = await fetch('https://api.together.xyz/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'black-forest-labs/FLUX.1-schnell-Free',
        prompt,
        width,
        height,
        steps: 4,
        n: 1,
        response_format: 'url',
      }),
    })

    if (!together.ok) {
      const err = await together.text()
      return NextResponse.json({ error: err }, { status: together.status })
    }

    const data = await together.json()
    const url = data?.data?.[0]?.url

    if (!url) {
      return NextResponse.json({ error: 'No image returned' }, { status: 500 })
    }

    return NextResponse.json({ url })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}
