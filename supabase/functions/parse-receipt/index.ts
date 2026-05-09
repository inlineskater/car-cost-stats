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

interface FuelEntry {
  fuel_type: 'lpg' | 'petrol' | null
  liters: number | null
  price_per_liter: number | null
  total_cost: number | null
}

interface ParsedData {
  date: string | null
  mileage: number | null
  entries: FuelEntry[]
  confidence: 'high' | 'medium' | 'low'
  parsing_notes: string
}

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const EXTRACTION_PROMPT = `You are a data extraction assistant for a car fuel cost tracking app.
You will receive one or two images — they may be a fuel station receipt and/or a car odometer photo.
Identify which image is which automatically, then extract all available data.

IMPORTANT: A single receipt may contain BOTH LPG and petrol fuel types as separate line items.
If you see multiple fuel types on one receipt, return ALL of them as separate entries in the "entries" array.

Return JSON with this exact schema:

{
  "date": "YYYY-MM-DD or null",
  "mileage": integer or null,
  "entries": [
    {
      "fuel_type": "lpg" or "petrol" or null,
      "liters": number or null,
      "price_per_liter": number or null,
      "total_cost": number or null
    }
  ],
  "confidence": "high" or "medium" or "low",
  "parsing_notes": "brief notes on what was found or unclear"
}

Rules:
- date: receipt date as YYYY-MM-DD; null if not visible
- mileage: odometer reading as an integer in km; convert from miles if needed (×1.60934, round); null if no odometer photo
- entries: array with 1 entry normally, 2 entries if receipt shows both LPG and petrol
- fuel_type: "lpg" for LPG/autogas/CNG/GPL/gaz/LPG; "petrol" for petrol/gasoline/benzyna/PB95/PB98/Pb/E10; null if unclear
- liters: volume dispensed as a decimal number
- price_per_liter: unit price; compute from total/liters if not shown explicitly
- total_cost: amount paid for THIS fuel type only (no currency symbol)
- confidence: "high" if 5+ fields extracted cleanly; "medium" if 3-4; "low" if fewer
- parsing_notes: note image roles, multiple fuels detected, ambiguities, computed fields, or quality issues`

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_IMAGES = 2
const MAX_BASE64_CHARS = 3_000_000
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/

type ParsedPayload = Partial<ParsedData> & Partial<FuelEntry>

interface AuthenticatedUser {
  id: string
  email: string
}

function roundTo(v: unknown, decimals: number): number | null {
  if (v == null) return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'))
  if (!Number.isFinite(n)) return null
  return Number(n.toFixed(decimals))
}

function roundMileage(v: unknown): number | null {
  if (v == null) return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? Math.round(n) : null
}

function normalizeFuelType(v: unknown): FuelEntry['fuel_type'] {
  return v === 'lpg' || v === 'petrol' ? v : null
}

function normalizeConfidence(v: unknown): ParsedData['confidence'] {
  return v === 'high' || v === 'medium' || v === 'low' ? v : 'low'
}

async function requireAuthenticatedUser(req: Request): Promise<AuthenticatedUser | Response> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.toLowerCase().startsWith('bearer ')) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase auth env vars missing')
    return json({ error: 'Auth not configured' }, 500)
  }

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      authorization: authHeader,
      apikey: supabaseAnonKey,
    },
  })

  if (!userRes.ok) return json({ error: 'Unauthorized' }, 401)

  const user = await userRes.json()
  if (typeof user?.id !== 'string' || typeof user?.email !== 'string') {
    return json({ error: 'Unauthorized' }, 401)
  }

  const allowRes = await fetch(`${supabaseUrl}/rest/v1/rpc/is_allowed_user`, {
    method: 'POST',
    headers: {
      authorization: authHeader,
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: '{}',
  })

  if (!allowRes.ok) {
    console.error('Allowlist check failed:', await allowRes.text())
    return json({ error: 'Authorization check failed' }, 500)
  }

  const allowed = await allowRes.json()
  if (allowed !== true) {
    return json({ error: 'Forbidden' }, 403)
  }

  return { id: user.id, email: user.email }
}

function validateImages(images: ImageInput[]): Response | null {
  if (!images.length) return json({ error: 'At least one image required' }, 400)
  if (images.length > MAX_IMAGES) return json({ error: `Maximum ${MAX_IMAGES} images allowed` }, 400)

  for (const img of images) {
    if (!ALLOWED_MIME_TYPES.has(img.mimeType)) {
      return json({ error: 'Unsupported image type' }, 400)
    }
    if (
      typeof img.base64 !== 'string' ||
      img.base64.length === 0 ||
      img.base64.length > MAX_BASE64_CHARS ||
      !BASE64_RE.test(img.base64)
    ) {
      return json({ error: 'Invalid image payload' }, 400)
    }
  }

  return null
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS })

  try {
    const user = await requireAuthenticatedUser(req)
    if (user instanceof Response) return user

    const body: ParseRequest = await req.json()
    const geminiKey = Deno.env.get('GEMINI_API_KEY')

    if (!geminiKey) return json({ error: 'GEMINI_API_KEY not configured' }, 500)

    // Normalise: accept both new { images: [] } and old { receiptImageBase64, odometerImageBase64 }
    const images: ImageInput[] = [...(body.images ?? [])]
    if (body.receiptImageBase64)
      images.push({ base64: body.receiptImageBase64, mimeType: body.receiptMimeType ?? 'image/jpeg' })
    if (body.odometerImageBase64)
      images.push({ base64: body.odometerImageBase64, mimeType: body.odometerMimeType ?? 'image/jpeg' })

    const validationError = validateImages(images)
    if (validationError) return validationError

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
          thinkingConfig: { thinkingBudget: 0 },
          responseSchema: {
            type: 'OBJECT',
            properties: {
              date: { type: 'STRING', nullable: true },
              mileage: { type: 'INTEGER', nullable: true },
              entries: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    fuel_type: { type: 'STRING', nullable: true },
                    liters: { type: 'NUMBER', nullable: true },
                    price_per_liter: { type: 'NUMBER', nullable: true },
                    total_cost: { type: 'NUMBER', nullable: true },
                  },
                  required: ['fuel_type', 'liters', 'price_per_liter', 'total_cost'],
                },
              },
              confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] },
              parsing_notes: { type: 'STRING' },
            },
            required: ['entries', 'confidence', 'parsing_notes'],
          },
        },
      }),
    })

    if (!geminiRes.ok) {
      const err = await geminiRes.text()
      console.error('Gemini error:', err.slice(0, 500))
      return json({ error: 'Gemini API error' }, 502)
    }

    const geminiData = await geminiRes.json()

    const parts2: Array<{ thought?: boolean; text?: string }> =
      geminiData?.candidates?.[0]?.content?.parts ?? []
    const rawText: string =
      parts2.find((p) => !p.thought && p.text)?.text ??
      parts2[parts2.length - 1]?.text ??
      ''

    let parsed: ParsedPayload
    try {
      parsed = JSON.parse(rawText.trim())
    } catch {
      console.error('JSON parse failed. Raw:', rawText)
      const preview = rawText.slice(0, 200) || '(empty)'
      return json({ error: `Parse failed — raw: ${preview}` }, 422)
    }

    if (!Array.isArray(parsed.entries)) {
      const hasLegacyEntry =
        parsed.fuel_type != null ||
        parsed.liters != null ||
        parsed.price_per_liter != null ||
        parsed.total_cost != null
      parsed.entries = hasLegacyEntry
        ? [{
            fuel_type: parsed.fuel_type ?? null,
            liters: parsed.liters ?? null,
            price_per_liter: parsed.price_per_liter ?? null,
            total_cost: parsed.total_cost ?? null,
          }]
        : []
    }

    const result: ParsedData = {
      date: parsed.date ?? null,
      mileage: roundMileage(parsed.mileage),
      confidence: normalizeConfidence(parsed.confidence),
      parsing_notes: parsed.parsing_notes ?? '',
      entries: parsed.entries.map((e) => ({
        fuel_type: normalizeFuelType(e.fuel_type),
        liters: roundTo(e.liters, 3),
        price_per_liter: roundTo(e.price_per_liter, 4),
        total_cost: roundTo(e.total_cost, 2),
      })),
    }

    return json(result, 200)
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
