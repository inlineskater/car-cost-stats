#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import process from 'node:process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const DEFAULT_DIR = 'check'
const DEFAULT_FROM = '2026-01-01'
const DEFAULT_TO = '2026-05-31'
const DEFAULT_OVERRIDES = 'scripts/check-receipts-overrides.json'
const MAX_BASE64_CHARS = 3_000_000
const IMAGE_EXT_RE = /\.(jpe?g|png|webp)$/i
const DOT_ENV_FILES = ['.env.local', '.env', '.env.import']

function parseArgs(argv) {
  const args = {
    apply: false,
    dir: DEFAULT_DIR,
    from: DEFAULT_FROM,
    to: DEFAULT_TO,
    maxPx: 1600,
    delayMs: 1000,
    retries: 3,
    overrides: DEFAULT_OVERRIDES,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--apply') {
      args.apply = true
    } else if (arg === '--dry-run') {
      args.apply = false
    } else if (arg === '--dir') {
      args.dir = argv[++i]
    } else if (arg === '--from') {
      args.from = argv[++i]
    } else if (arg === '--to') {
      args.to = argv[++i]
    } else if (arg === '--max-px') {
      args.maxPx = Number(argv[++i])
    } else if (arg === '--delay-ms') {
      args.delayMs = Number(argv[++i])
    } else if (arg === '--retries') {
      args.retries = Number(argv[++i])
    } else if (arg === '--overrides') {
      args.overrides = argv[++i]
    } else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  if (!Number.isFinite(args.maxPx) || args.maxPx < 512) {
    throw new Error('--max-px must be a number >= 512')
  }
  if (!Number.isFinite(args.delayMs) || args.delayMs < 0) {
    throw new Error('--delay-ms must be a number >= 0')
  }
  if (!Number.isInteger(args.retries) || args.retries < 1) {
    throw new Error('--retries must be an integer >= 1')
  }

  return args
}

function printHelp() {
  console.log(`Usage: npm run import:check-receipts -- [options]

Options:
  --dry-run          Parse and report without uploading/inserting (default)
  --apply            Upload images and insert non-duplicate rows
  --dir <path>       Image folder (default: ${DEFAULT_DIR})
  --from <YYYY-MM-DD> Query duplicate window start (default: ${DEFAULT_FROM})
  --to <YYYY-MM-DD>   Query duplicate window end (default: ${DEFAULT_TO})
  --max-px <number>  Longest side for AI parsing copies (default: 1600)
  --delay-ms <ms>    Delay between AI parse calls (default: 1000)
  --retries <n>      Parse attempts per image (default: 3)
  --overrides <path> Manual parse overrides (default: ${DEFAULT_OVERRIDES})

Environment:
  VITE_SUPABASE_URL or SUPABASE_URL
  VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY
  SUPABASE_EMAIL
  SUPABASE_PASSWORD, or SUPABASE_SERVICE_ROLE_KEY for a one-time magic-link session
  SUPABASE_API_KEYS_FILE can point at Supabase CLI "projects api-keys -o json" output`)
}

async function loadDotEnv(cwd) {
  for (const name of DOT_ENV_FILES) {
    const file = path.join(cwd, name)
    let text
    try {
      text = await fs.readFile(file, 'utf8')
    } catch (err) {
      if (err?.code === 'ENOENT') continue
      throw err
    }

    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const eq = line.indexOf('=')
      if (eq === -1) continue
      const key = line.slice(0, eq).trim()
      let value = line.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = value
    }
  }
}

function env(name, fallbackName) {
  return process.env[name] || (fallbackName ? process.env[fallbackName] : undefined)
}

function requireEnv(name, fallbackName) {
  const value = env(name, fallbackName)
  if (!value) {
    throw new Error(
      fallbackName
        ? `Missing ${name} or ${fallbackName}. Run with ${name}=... or ${fallbackName}=...`
        : `Missing ${name}. Run with ${name}=...`,
    )
  }
  return value
}

async function readApiKeysFile() {
  const file = process.env.SUPABASE_API_KEYS_FILE
  if (!file) return {}
  const raw = await fs.readFile(file, 'utf8')
  const keys = JSON.parse(raw)
  if (!Array.isArray(keys)) throw new Error(`${file} must contain a JSON array`)

  const legacyAnon = keys.find((key) => key.name === 'anon' && key.api_key)
  const legacyService = keys.find((key) => key.name === 'service_role' && key.api_key)
  const publishable = keys.find((key) => key.type === 'publishable' && key.api_key)
  const secret = keys.find((key) => key.type === 'secret' && key.api_key)

  return {
    anonKey: legacyAnon?.api_key ?? publishable?.api_key,
    serviceRoleKey: legacyService?.api_key ?? secret?.api_key,
  }
}

async function resolveSupabaseUrl(cwd) {
  const configured = env('VITE_SUPABASE_URL', 'SUPABASE_URL')
  if (configured) return configured

  try {
    const projectRef = (await fs.readFile(
      path.join(cwd, 'supabase/.temp/project-ref'),
      'utf8',
    )).trim()
    if (projectRef) return `https://${projectRef}.supabase.co`
  } catch (err) {
    if (err?.code !== 'ENOENT') throw err
  }

  throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_URL')
}

async function signInForImport({ url, anonKey, serviceRoleKey, email, password }) {
  const supabase = createClient(url, anonKey)

  if (password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (!data.user?.id) throw new Error('Supabase sign-in did not return a user id')
    return { supabase, user: data.user }
  }

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_PASSWORD or SUPABASE_SERVICE_ROLE_KEY')
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (linkError) throw linkError

  const tokenHash = linkData.properties?.hashed_token
  if (!tokenHash) throw new Error('Magic-link generation did not return a token hash')

  const attempts = ['email', 'magiclink']
  let lastError = null
  for (const type of attempts) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    })
    if (!error && data.user?.id) return { supabase, user: data.user }
    lastError = error
  }

  throw lastError ?? new Error('Magic-link verification failed')
}

async function listImages(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile() && IMAGE_EXT_RE.test(entry.name))
    .map((entry) => path.join(dir, entry.name))
    .sort((a, b) => a.localeCompare(b))
}

async function loadOverrides(cwd, overridePath) {
  if (!overridePath) return new Map()
  const absolute = path.isAbsolute(overridePath) ? overridePath : path.join(cwd, overridePath)
  let raw
  try {
    raw = await fs.readFile(absolute, 'utf8')
  } catch (err) {
    if (err?.code === 'ENOENT') return new Map()
    throw err
  }

  const data = JSON.parse(raw)
  const entries = Array.isArray(data) ? data.map((item) => [item.fileName, item]) : Object.entries(data)
  return new Map(entries)
}

async function readExif(files) {
  const { stdout } = await execFileAsync('exiftool', [
    '-json',
    '-DateTimeOriginal',
    '-CreateDate',
    '-ModifyDate',
    '-ImageWidth',
    '-ImageHeight',
    ...files,
  ], { maxBuffer: 10 * 1024 * 1024 })

  return JSON.parse(stdout).map((item) => {
    const rawDate = item.DateTimeOriginal || item.CreateDate || item.ModifyDate
    const takenAt = parseExifDate(rawDate)
    return {
      path: item.SourceFile,
      fileName: path.basename(item.SourceFile),
      takenAt,
      date: toDateOnly(takenAt),
      width: Number(item.ImageWidth),
      height: Number(item.ImageHeight),
    }
  })
}

function parseExifDate(value) {
  if (!value || typeof value !== 'string') return null
  const match = value.match(
    /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/,
  )
  if (!match) return null
  const [, y, mo, d, h, mi, s] = match
  return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s))
}

function toDateOnly(date) {
  if (!date) return null
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function roundTo(value, decimals) {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.'))
  if (!Number.isFinite(n)) return null
  return Number(n.toFixed(decimals))
}

function roundMileage(value) {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.'))
  if (!Number.isFinite(n)) return null
  return Math.round(n)
}

function normalizeFuelType(value) {
  return value === 'lpg' || value === 'petrol' ? value : null
}

function normalizeParseResult(data) {
  const entries = Array.isArray(data?.entries)
    ? data.entries
    : data?.fuel_type || data?.liters || data?.price_per_liter || data?.total_cost
      ? [{
          fuel_type: data.fuel_type,
          liters: data.liters,
          price_per_liter: data.price_per_liter,
          total_cost: data.total_cost,
        }]
      : []

  return {
    date: typeof data?.date === 'string' ? data.date : null,
    mileage: roundMileage(data?.mileage),
    confidence: ['high', 'medium', 'low'].includes(data?.confidence) ? data.confidence : 'low',
    parsing_notes: typeof data?.parsing_notes === 'string' ? data.parsing_notes : '',
    entries: entries.map((entry) => ({
      fuel_type: normalizeFuelType(entry?.fuel_type),
      liters: roundTo(entry?.liters, 3),
      price_per_liter: roundTo(entry?.price_per_liter, 4),
      total_cost: roundTo(entry?.total_cost, 2),
    })),
  }
}

function mergeParsed(base, override) {
  const normalized = normalizeParseResult(override)
  return {
    date: normalized.date ?? base.date,
    mileage: normalized.mileage ?? base.mileage,
    confidence: normalized.confidence ?? base.confidence,
    parsing_notes: [
      base.parsing_notes,
      override.parsing_notes ? `manual override: ${override.parsing_notes}` : 'manual override',
    ].filter(Boolean).join('; '),
    entries: override.entries ? normalized.entries : base.entries,
  }
}

function emptyParseResult() {
  return {
    date: null,
    mileage: null,
    confidence: 'low',
    parsing_notes: '',
    entries: [],
  }
}

function hasFuelEntry(parsed) {
  return parsed.entries.some((entry) => (
    entry.fuel_type || entry.liters || entry.price_per_liter || entry.total_cost
  ))
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function compressForAi(image, tempDir, maxPx) {
  const outPath = path.join(tempDir, `${path.parse(image.fileName).name}-${maxPx}.jpg`)
  await execFileAsync('sips', [
    '-s',
    'format',
    'jpeg',
    '-Z',
    String(maxPx),
    image.path,
    '--out',
    outPath,
  ], { maxBuffer: 2 * 1024 * 1024 })

  const data = await fs.readFile(outPath)
  const base64 = data.toString('base64')
  if (base64.length > MAX_BASE64_CHARS && maxPx > 1024) {
    return compressForAi(image, tempDir, 1024)
  }
  if (base64.length > MAX_BASE64_CHARS) {
    throw new Error(`${image.fileName} is still too large after compression`)
  }
  return {
    base64,
    mimeType: 'image/jpeg',
    path: outPath,
    byteLength: data.byteLength,
  }
}

async function parseImage(supabase, image, tempDir, maxPx) {
  const compressed = await compressForAi(image, tempDir, maxPx)
  const { data, error } = await supabase.functions.invoke('parse-receipt', {
    body: {
      images: [{
        base64: compressed.base64,
        mimeType: compressed.mimeType,
      }],
    },
  })

  if (error) {
    let detail = error.message
    try {
      const body = await error.context?.json()
      detail = body?.error || body?.detail || detail
    } catch {
      // Keep the original SDK error.
    }
    throw new Error(detail)
  }

  return normalizeParseResult(data)
}

async function parseImageWithRetry(supabase, image, tempDir, args) {
  let lastError = null
  for (let attempt = 1; attempt <= args.retries; attempt += 1) {
    try {
      return await parseImage(supabase, image, tempDir, args.maxPx)
    } catch (err) {
      lastError = err
      if (attempt < args.retries) {
        const backoff = args.delayMs + attempt * 1500
        console.log(`retrying after ${backoff}ms (${err?.message ?? err})`)
        await sleep(backoff)
      }
    }
  }
  throw lastError
}

function nearestOdometer(receipt, odometers) {
  if (!receipt.takenAt || odometers.length === 0) return null
  return odometers
    .filter((odo) => odo.takenAt && odo.parsed.mileage)
    .map((odo) => ({
      ...odo,
      deltaMs: Math.abs(odo.takenAt.getTime() - receipt.takenAt.getTime()),
    }))
    .sort((a, b) => a.deltaMs - b.deltaMs)[0] ?? null
}

function completeEntry(entry) {
  const completed = { ...entry }
  if (!completed.price_per_liter && completed.total_cost && completed.liters) {
    completed.price_per_liter = roundTo(completed.total_cost / completed.liters, 4)
  }
  if (!completed.total_cost && completed.price_per_liter && completed.liters) {
    completed.total_cost = roundTo(completed.price_per_liter * completed.liters, 2)
  }
  return completed
}

function validateCandidate(candidate) {
  const errors = []
  if (!candidate.date) errors.push('missing EXIF date')
  if (!candidate.fuel_type) errors.push('missing fuel type')
  if (!candidate.liters || candidate.liters <= 0) errors.push('missing/invalid liters')
  if (!candidate.price_per_liter || candidate.price_per_liter <= 0) {
    errors.push('missing/invalid price per liter')
  }
  if (!candidate.total_cost || candidate.total_cost <= 0) errors.push('missing/invalid total cost')
  if (!candidate.mileage || candidate.mileage <= 0) errors.push('missing/invalid mileage')

  if (candidate.liters && candidate.price_per_liter && candidate.total_cost) {
    const expected = roundTo(candidate.liters * candidate.price_per_liter, 2)
    const diff = Math.abs(expected - candidate.total_cost)
    if (diff > 0.15) {
      errors.push(`liters * price (${expected}) does not match total (${candidate.total_cost})`)
    }
  }

  return errors
}

function buildCandidates(receipts, odometers) {
  const candidates = []
  const skipped = []

  for (const receipt of receipts) {
    const odo = receipt.parsed.mileage
      ? { ...receipt, deltaMs: 0 }
      : nearestOdometer(receipt, odometers)

    for (const rawEntry of receipt.parsed.entries) {
      const entry = completeEntry(rawEntry)
      const deltaMinutes = odo?.deltaMs == null ? null : Math.round(odo.deltaMs / 60000)
      const parsedDateNote =
        receipt.parsed.date && receipt.parsed.date !== receipt.date
          ? ` printed date ${receipt.parsed.date};`
          : ''
      const odometerNote = odo
        ? ` mileage from ${odo.fileName}${deltaMinutes ? ` (${deltaMinutes} min nearest EXIF)` : ''};`
        : ' mileage source missing;'

      const candidate = {
        date: receipt.date,
        fuel_type: entry.fuel_type,
        liters: entry.liters,
        price_per_liter: entry.price_per_liter,
        total_cost: entry.total_cost,
        mileage: odo?.parsed.mileage ?? null,
        ai_parsed: true,
        receipt,
        odometer: odo,
        notes: [
          `Imported from check/${receipt.fileName};`,
          odometerNote,
          parsedDateNote,
          receipt.parsed.parsing_notes ? ` AI: ${receipt.parsed.parsing_notes}` : '',
        ].join('').replace(/\s+/g, ' ').trim(),
      }

      const errors = validateCandidate(candidate)
      if (errors.length) {
        skipped.push({ receipt, entry, errors })
      } else {
        candidates.push(candidate)
      }
    }
  }

  return { candidates, skipped }
}

function isDuplicate(candidate, existingRows) {
  return existingRows.some((row) => (
    row.date === candidate.date &&
    row.fuel_type === candidate.fuel_type &&
    Math.abs(Number(row.liters) - candidate.liters) <= 0.005 &&
    Math.abs(Number(row.total_cost) - candidate.total_cost) <= 0.02 &&
    Math.abs(Number(row.mileage) - candidate.mileage) <= 1
  ))
}

async function getExistingRows(supabase, from, to) {
  const { data, error } = await supabase
    .from('fuel_entries')
    .select('id,date,fuel_type,liters,total_cost,mileage')
    .gte('date', from)
    .lte('date', to)

  if (error) throw error
  return data ?? []
}

function safeStorageName(fileName) {
  return fileName.replace(/[^A-Za-z0-9._-]+/g, '-')
}

async function uploadImage(supabase, bucket, userId, image) {
  const body = await fs.readFile(image.path)
  const storagePath = [
    userId,
    'check-import',
    image.date ?? 'unknown-date',
    `${randomUUID()}-${safeStorageName(image.fileName)}`,
  ].join('/')

  const { error } = await supabase.storage.from(bucket).upload(storagePath, body, {
    contentType: mimeTypeFor(image.fileName),
    upsert: false,
  })
  if (error) throw error

  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath)
  return data.publicUrl
}

function mimeTypeFor(fileName) {
  if (/\.png$/i.test(fileName)) return 'image/png'
  if (/\.webp$/i.test(fileName)) return 'image/webp'
  return 'image/jpeg'
}

async function applyImport(supabase, userId, insertable) {
  const receiptUrls = new Map()
  const odometerUrls = new Map()
  const inserted = []

  for (const candidate of insertable) {
    if (!receiptUrls.has(candidate.receipt.path)) {
      receiptUrls.set(
        candidate.receipt.path,
        await uploadImage(supabase, 'receipts', userId, candidate.receipt),
      )
    }
    if (candidate.odometer?.path && !odometerUrls.has(candidate.odometer.path)) {
      odometerUrls.set(
        candidate.odometer.path,
        await uploadImage(supabase, 'odometers', userId, candidate.odometer),
      )
    }

    const payload = {
      date: candidate.date,
      fuel_type: candidate.fuel_type,
      liters: candidate.liters,
      price_per_liter: candidate.price_per_liter,
      total_cost: candidate.total_cost,
      mileage: candidate.mileage,
      receipt_image_url: receiptUrls.get(candidate.receipt.path) ?? null,
      odometer_image_url: candidate.odometer?.path
        ? odometerUrls.get(candidate.odometer.path) ?? null
        : null,
      notes: candidate.notes,
      ai_parsed: true,
    }

    const { data, error } = await supabase
      .from('fuel_entries')
      .insert(payload)
      .select('id,date,fuel_type,liters,total_cost,mileage')
      .single()

    if (error) throw error
    inserted.push(data)
  }

  return inserted
}

function printParsedImages(images) {
  console.log('\nParsed images')
  for (const img of images) {
    if (img.parseError) {
      console.log(`- ${img.fileName} ${img.date ?? 'no-date'} parse-error=${img.parseError}`)
      continue
    }
    if (img.skipReason) {
      console.log(`- ${img.fileName} ${img.date ?? 'no-date'} skipped=${img.skipReason}`)
      continue
    }
    const kinds = []
    if (hasFuelEntry(img.parsed)) kinds.push('receipt')
    if (img.parsed.mileage) kinds.push('odometer')
    if (!kinds.length) kinds.push('unclassified')
    const fuels = img.parsed.entries
      .filter((entry) => entry.fuel_type || entry.liters || entry.total_cost)
      .map((entry) => `${entry.fuel_type ?? '?'} ${entry.liters ?? '?'}L ${entry.total_cost ?? '?'}PLN`)
      .join('; ')
    console.log(
      `- ${img.fileName} ${img.date ?? 'no-date'} ${kinds.join('+')}` +
      `${img.parsed.mileage ? ` mileage=${img.parsed.mileage}` : ''}` +
      `${fuels ? ` entries=[${fuels}]` : ''}`,
    )
  }
}

function printPlan({ candidates, duplicates, insertable, skipped }) {
  console.log('\nImport plan')
  console.log(`- candidates: ${candidates.length}`)
  console.log(`- duplicates: ${duplicates.length}`)
  console.log(`- to insert: ${insertable.length}`)
  console.log(`- skipped: ${skipped.length}`)

  if (insertable.length) {
    console.log('\nRows to insert')
    for (const item of insertable) {
      console.log(
        `- ${item.date} ${item.fuel_type} ${item.liters}L x ${item.price_per_liter}` +
        ` = ${item.total_cost} PLN, mileage ${item.mileage}` +
        ` (${item.receipt.fileName}; odo ${item.odometer?.fileName ?? 'none'})`,
      )
    }
  }

  if (duplicates.length) {
    console.log('\nDuplicates skipped')
    for (const item of duplicates) {
      console.log(
        `- ${item.date} ${item.fuel_type} ${item.liters}L ${item.total_cost} PLN mileage ${item.mileage}` +
        ` (${item.receipt.fileName})`,
      )
    }
  }

  if (skipped.length) {
    console.log('\nNeeds manual review')
    for (const item of skipped) {
      console.log(`- ${item.receipt.fileName}: ${item.errors.join('; ')}`)
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const cwd = process.cwd()
  await loadDotEnv(cwd)

  const dir = path.resolve(cwd, args.dir)
  const files = await listImages(dir)
  if (!files.length) throw new Error(`No images found in ${dir}`)

  const apiKeys = await readApiKeysFile()
  const url = await resolveSupabaseUrl(cwd)
  const anonKey = env('VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY') ?? apiKeys.anonKey
  if (!anonKey) {
    throw new Error(
      'Missing VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY. ' +
      'Alternatively set SUPABASE_API_KEYS_FILE to Supabase CLI API-key JSON output.',
    )
  }
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? apiKeys.serviceRoleKey
  const email = requireEnv('SUPABASE_EMAIL')
  const password = process.env.SUPABASE_PASSWORD

  console.log(`Found ${files.length} images in ${args.dir}`)
  console.log(args.apply ? 'Mode: apply' : 'Mode: dry-run')

  const { supabase, user } = await signInForImport({
    url,
    anonKey,
    serviceRoleKey,
    email,
    password,
  })
  const userId = user.id
  console.log(`Signed in as ${user.email}`)

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'check-receipts-'))
  try {
    const images = await readExif(files)
    const overrides = await loadOverrides(cwd, args.overrides)
    for (const image of images) {
      if (!image.takenAt) {
        console.warn(`Warning: ${image.fileName} has no EXIF date`)
      }
      const override = overrides.get(image.fileName)
      if (override?.skip) {
        image.parsed = emptyParseResult()
        image.skipReason = override.reason ?? 'manual skip'
        console.log(`Skipping ${image.fileName}: ${image.skipReason}`)
        continue
      }
      if (override?.parsed) {
        image.parsed = mergeParsed(emptyParseResult(), override.parsed)
        image.manualOverride = true
        console.log(`Using manual override for ${image.fileName}`)
        continue
      }
      process.stdout.write(`Parsing ${image.fileName}... `)
      try {
        image.parsed = await parseImageWithRetry(supabase, image, tempDir, args)
        if (override?.mergeParsed) {
          image.parsed = mergeParsed(image.parsed, override.mergeParsed)
          image.manualOverride = true
        }
        console.log('done')
      } catch (err) {
        image.parsed = emptyParseResult()
        image.parseError = err?.message ?? String(err)
        console.log(`failed: ${image.parseError}`)
      }
      if (args.delayMs > 0) await sleep(args.delayMs)
    }

    const receipts = images.filter((image) => hasFuelEntry(image.parsed))
    const odometers = images.filter((image) => image.parsed.mileage)
    const { candidates, skipped } = buildCandidates(receipts, odometers)
    for (const image of images.filter((img) => img.parseError)) {
      skipped.push({
        receipt: image,
        entry: null,
        errors: [`parse failed: ${image.parseError}`],
      })
    }
    const existingRows = await getExistingRows(supabase, args.from, args.to)
    const duplicates = candidates.filter((candidate) => isDuplicate(candidate, existingRows))
    const seenNew = []
    const insertable = []

    for (const candidate of candidates) {
      if (duplicates.includes(candidate)) continue
      if (isDuplicate(candidate, seenNew)) {
        duplicates.push(candidate)
      } else {
        insertable.push(candidate)
        seenNew.push(candidate)
      }
    }

    printParsedImages(images)
    printPlan({ candidates, duplicates, insertable, skipped })

    if (!args.apply) {
      console.log('\nDry run complete. Re-run with --apply to upload images and insert rows.')
      return
    }

    const inserted = await applyImport(supabase, userId, insertable)
    console.log(`\nInserted ${inserted.length} fuel_entries rows`)
    for (const row of inserted) {
      console.log(`- ${row.id} ${row.date} ${row.fuel_type} ${row.liters}L ${row.total_cost} PLN`)
    }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(`\nImport failed: ${err?.message ?? err}`)
  process.exitCode = 1
})
