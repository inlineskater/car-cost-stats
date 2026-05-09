import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

interface ParseRequest {
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
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

const EXTRACTION_PROMPT = `You are a data extraction assistant for a car fuel cost tracking app.
You will receive one or two images: a fuel station receipt and/or an odometer photo.
Extract data and return ONLY valid JSON with this exact schema:

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
- date: receipt date formatted as YYYY-MM-DD; null if not visible
- fuel_type: "lpg" for LPG/autogas/CNG/GPL; "petrol" for petrol/gasoline/benzin/PB95/PB98; null if unclear
- liters: volume dispensed as a number
- price_per_liter: unit price; compute from total/liters if not shown explicitly
- total_cost: total amount paid (numeric, no currency symbol)
- mileage: odometer integer in km; if shown in miles multiply by 1.60934 and round
- confidence: "high" if 5 core fields extracted; "medium" if 3-4; "low" if fewer than 3
- parsing_notes: note ambiguities, computed fields, or image quality issues

Return ONLY the JSON object. No markdown fences, no extra text.`

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS })
  }

  try {
    const body: ParseRequest = await req.json()
    const geminiKey = Deno.env.get('GEMINI_API_KEY')

    if (!geminiKey) {
      return json({ error: 'GEMINI_API_KEY not configured' }, 500)
    }
    if (!body.receiptImageBase64 && !body.odometerImageBase64) {
      return json({ error: 'At least one image required' }, 400)
    }

    const parts: object[] = []

    if (body.receiptImageBase64) {
      parts.push({
        inlineData: {
          mimeType: body.receiptMimeType ?? 'image/jpeg',
          data: body.receiptImageBase64,
        },
      })
    }
    if (body.odometerImageBase64) {
      parts.push({
        inlineData: {
          mimeType: body.odometerMimeType ?? 'image/jpeg',
          data: body.odometerImageBase64,
        },
      })
    }
    parts.push({ text: EXTRACTION_PROMPT })

    const geminiRes = await fetch(`${GEMINI_URL}?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.1, topP: 0.8, maxOutputTokens: 512 },
      }),
    })

    if (!geminiRes.ok) {
      const err = await geminiRes.text()
      console.error('Gemini error:', err)
      return json({ error: 'Gemini API error', detail: err }, 502)
    }

    const geminiData = await geminiRes.json()
    const rawText: string = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const jsonText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()

    let parsed: ParsedData
    try {
      parsed = JSON.parse(jsonText)
    } catch {
      console.error('JSON parse failed:', rawText)
      return json({ error: 'Could not parse AI response', raw: rawText }, 422)
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
