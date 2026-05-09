import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

interface ImageInput {
  base64: string
  mimeType: string
}

interface ParseRequest {
  images?: ImageInput[]
  // legacy fields kept for backward compatibility with old cached frontend code
  receiptImageBase64?: string
  receiptMimeType?: string
  odometerImageBase64?: string
  odometerMimeType?: string
}

interface ParsedData {
  date: string | null
  fuel_type: 'lpg' | 'petrol' | null
  liters: number | null
  price_per_liter: number | null
  total_cost: number | null
  mileage: number | null
  confidence: 'high' | 'medium' | 'low'
  parsing_notes: string
}

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const EXTRACTION_PROMPT = `You are a data extraction assistant for a car fuel cost tracking app.
You will receive one or two images in any order — they may be a fuel station receipt and/or a car odometer photo.
Identify which image is which automatically, then extract all available data.
Return ONLY valid JSON with this exact schema (no markdown, no extra text):

{
  "date": "YYYY-MM-DD or null",
  "fuel_type": "lpg" or "petrol" or null,
  "liters": number or null,
  "price_per_liter": number or null,
  "total_cost": number or null,
  "mileage": integer or null,
  "confidence": "high" or "medium" or "low",
  "parsing_notes": "brief notes on what was found or unclear"
}

Rules:
- date: receipt date as YYYY-MM-DD; null if not visible
- fuel_type: "lpg" for LPG/autogas/CNG/GPL/gaz; "petrol" for petrol/gasoline/benzyna/PB95/PB98/Pb; null if unclear
- liters: volume dispensed as a decimal number
- price_per_liter: unit price; compute from total/liters if not shown explicitly
- total_cost: total amount paid as a decimal number (no currency symbol)
- mileage: odometer reading as an integer in km; convert from miles if needed (×1.60934, round)
- confidence: "high" if 5+ fields extracted cleanly; "medium" if 3-4; "low" if fewer
- parsing_notes: note image roles identified, ambiguities, computed fields, or quality issues`

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS })

  try {
    const body: ParseRequest = await req.json()
    const geminiKey = Deno.env.get('GEMINI_API_KEY')

    if (!geminiKey) return json({ error: 'GEMINI_API_KEY not configured' }, 500)

    // Normalise: accept both new { images: [] } and old { receiptImageBase64, odometerImageBase64 }
    const images: ImageInput[] = body.images ?? []
    if (body.receiptImageBase64)
      images.push({ base64: body.receiptImageBase64, mimeType: body.receiptMimeType ?? 'image/jpeg' })
    if (body.odometerImageBase64)
      images.push({ base64: body.odometerImageBase64, mimeType: body.odometerMimeType ?? 'image/jpeg' })

    if (!images.length) return json({ error: 'At least one image required' }, 400)

    const parts: object[] = images.map((img) => ({
      inlineData: { mimeType: img.mimeType, data: img.base64 },
    }))
    parts.push({ text: EXTRACTION_PROMPT })

    const geminiRes = await fetch(`${GEMINI_URL}?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.1,
          topP: 0.8,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!geminiRes.ok) {
      const err = await geminiRes.text()
      console.error('Gemini error:', err)
      return json({ error: 'Gemini API error', detail: err }, 502)
    }

    const geminiData = await geminiRes.json()

    // With responseMimeType: 'application/json', Gemini returns raw JSON — no markdown fences.
    // Still handle thinking tokens (parts with thought: true) just in case.
    const parts2: Array<{ thought?: boolean; text?: string }> =
      geminiData?.candidates?.[0]?.content?.parts ?? []
    const rawText: string =
      parts2.find((p) => !p.thought && p.text)?.text ??
      parts2[parts2.length - 1]?.text ??
      ''

    let parsed: ParsedData
    try {
      parsed = JSON.parse(rawText.trim())
    } catch {
      console.error('JSON parse failed. Raw:', rawText)
      return json({ error: 'Could not parse AI response', raw: rawText.slice(0, 300) }, 422)
    }

    return json(parsed, 200)
  } catch (err) {
    console.error('Edge function error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
