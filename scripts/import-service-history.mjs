#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const DOT_ENV_FILES = ['.env.local', '.env', '.env.import']

// Odometer readings from CEPiK for date interpolation
const ODOMETER_READINGS = [
  { date: '2017-02-17', km: 186000 },
  { date: '2018-02-16', km: 193050 },
  { date: '2019-02-15', km: 211985 },
  { date: '2020-02-15', km: 241735 },
  { date: '2021-02-17', km: 253942 },
  { date: '2022-03-07', km: 267013 },
  { date: '2023-03-06', km: 280105 },
  { date: '2023-05-27', km: 283301 },
  { date: '2023-08-13', km: 285137 },
  { date: '2024-03-06', km: 293031 },
  { date: '2025-03-05', km: 315980 },
  { date: '2026-03-05', km: 333616 },
  { date: '2026-04-04', km: 334623 },
]

function estimateDate(km) {
  for (let i = 0; i < ODOMETER_READINGS.length - 1; i++) {
    const a = ODOMETER_READINGS[i]
    const b = ODOMETER_READINGS[i + 1]
    if (km >= a.km && km <= b.km) {
      const ratio = (km - a.km) / (b.km - a.km)
      const aMs = new Date(a.date).getTime()
      const bMs = new Date(b.date).getTime()
      const d = new Date(aMs + ratio * (bMs - aMs))
      return d.toISOString().slice(0, 10)
    }
  }
  // Before first reading — extrapolate backwards
  const first = ODOMETER_READINGS[0]
  const second = ODOMETER_READINGS[1]
  const kmPerDay = (second.km - first.km) / ((new Date(second.date) - new Date(first.date)) / 86400000)
  const daysBefore = (first.km - km) / kmPerDay
  const d = new Date(new Date(first.date).getTime() - daysBefore * 86400000)
  return d.toISOString().slice(0, 10)
}

// All historical entries
const ENTRIES = [
  { km: 192000, desc: 'Wymiana rozrządu', cost: 0.01, category: 'service' },
  { km: 200000, desc: 'Opony Nokian Weatherproof, Cewka, przewody, świece, Dojazdówka, Przednie amortyzatory, łącznik stabilizatora, Poduszka silnika, Szczęki tylnych hamulców, Czujnik temperatury, Czujnik ciśnienia w kolektorze dolotowym', cost: 0.01, category: 'repair' },
  { km: 207000, desc: 'Wymiana oleju', cost: 0.01, category: 'service' },
  { km: 221122, desc: 'Planowana wymiana oleju', cost: 0.01, category: 'service' },
  { km: 224222, desc: 'Sprzęgło, Naprawa tylnych hamulców, Uszczelka pokrywy zaworów, Sworzeń, Łapa sprzęgła, Olej', cost: 1542, category: 'repair' },
  { km: 225000, desc: 'Akumulator', cost: 250, category: 'repair' },
  { km: 226500, desc: 'Błąd: czujnik ciśnienia w kolektorze ssącym, Zbyt uboga mieszanka', cost: 0.01, category: 'repair' },
  { km: 227000, desc: 'Wymiana czujnika ciśnienia w kolektorze ssącym', cost: 300, category: 'repair' },
  { km: 241000, desc: 'Serwis LPG, Oleje i filtry, Tylne amortyzatory, Przednie hamulce, Uszczelniacze półosi, Przewody hamulcowe, Olej w skrzyni, Linka hamulców, Poduszki amortyzatorów', cost: 0.01, category: 'service' },
  { km: 254000, desc: 'Rozrząd, Uszczelka, Oleje, Filtry, Tłumik', cost: 0.01, category: 'service' },
  { km: 265000, desc: 'Sprzęgło', cost: 0.01, category: 'repair' },
  { km: 266000, desc: 'Nowe opony – Noxan', cost: 0.01, category: 'other' },
  { km: 288000, desc: 'Nic (brak napraw)', cost: 0.01, category: 'service' },
  { km: 290000, desc: 'Oleje, filtry, Hak tłumika, Spawanie części tłumika', cost: 0.01, category: 'service' },
  { km: 291000, date: '2024-02-01', desc: 'Filtry, oleje, mocowania tłumika', cost: 796, category: 'service' },
  { km: 291000, date: '2024-02-14', desc: 'Przegląd LPG', cost: 200, category: 'inspection' },
  { km: 292000, date: '2024-03-01', desc: 'Przegląd rejestracyjny', cost: 160, category: 'inspection' },
  { km: 301000, date: '2024-05-29', desc: 'Naprawa klapy bagażnika', cost: 350, category: 'repair' },
  { km: 308000, date: '2024-10-02', desc: 'Filtry, oleje', cost: 370, category: 'service' },
  { km: 310000, date: '2024-11-27', desc: 'Kupno linki', cost: 70, category: 'repair' },
  { km: 310000, date: '2024-11-27', desc: 'Przegląd LPG', cost: 200, category: 'inspection' },
  { km: 313000, date: '2025-01-05', desc: 'Airbag + przewody napięcia', cost: 400, category: 'repair' },
  { km: 322000, date: '2025-06-15', desc: 'Filtry, oleje', cost: 600, category: 'service' },
  { km: 322000, date: '2025-06-15', desc: 'Mycie tapicerki', cost: 500, category: 'other' },
  { km: 322000, date: '2025-06-15', desc: 'Rozrząd, hamulce, świece', cost: 1650, category: 'service' },
  { km: 322000, date: '2025-06-15', desc: 'Opony', cost: 1000, category: 'other' },
  { km: 322000, date: '2025-06-15', desc: 'Wymiana opon', cost: 120, category: 'service' },
  { km: 322000, date: '2025-11-15', desc: '1 Opona', cost: 200, category: 'other' },
  { km: null, date: '2025-09-07', desc: 'Ubezpieczenie OC (polisa 191208050, ważna 15/09/2025-14/09/2026)', cost: 609.57, category: 'insurance', next_due_date: '2026-09-14' },
  { km: null, date: '2026-03-05', desc: 'Przegląd techniczny', cost: 245, category: 'inspection', next_due_date: '2027-03-05' },
]

async function loadDotEnv(cwd) {
  for (const name of DOT_ENV_FILES) {
    const file = path.join(cwd, name)
    let text
    try { text = await fs.readFile(file, 'utf8') } catch (err) { if (err?.code === 'ENOENT') continue; throw err }
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const eq = line.indexOf('=')
      if (eq === -1) continue
      const key = line.slice(0, eq).trim()
      let value = line.slice(eq + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
        value = value.slice(1, -1)
      if (!process.env[key]) process.env[key] = value
    }
  }
}

function requireEnv(name, fallback) {
  const v = process.env[name] || (fallback ? process.env[fallback] : undefined)
  if (!v) throw new Error(`Missing ${name}${fallback ? ` or ${fallback}` : ''}`)
  return v
}

async function main() {
  const cwd = process.cwd()
  await loadDotEnv(cwd)

  const apply = process.argv.includes('--apply')
  const url = requireEnv('VITE_SUPABASE_URL', 'SUPABASE_URL')
  const anonKey = requireEnv('VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY')
  const email = requireEnv('SUPABASE_EMAIL')
  const password = process.env.SUPABASE_PASSWORD
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const supabase = createClient(url, anonKey)

  // Auth
  if (password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  } else if (serviceRoleKey) {
    const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
    if (error) throw error
    const tokenHash = data.properties?.hashed_token
    for (const type of ['email', 'magiclink']) {
      const { data: d, error: e } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      if (!e && d.user?.id) break
    }
  } else {
    throw new Error('Missing SUPABASE_PASSWORD or SUPABASE_SERVICE_ROLE_KEY')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  console.log(`Authenticated as ${user.email} (${user.id})`)

  // Build rows
  const rows = ENTRIES.map((e) => ({
    date: e.date || estimateDate(e.km),
    category: e.category,
    cost: e.cost,
    description: e.desc,
    next_due_date: e.next_due_date || null,
    notes: e.km ? `${e.km} km` : null,
  }))

  console.log(`\n${apply ? 'INSERTING' : 'DRY RUN'} — ${rows.length} entries:\n`)
  for (const r of rows) {
    console.log(`  ${r.date} | ${r.category.padEnd(10)} | ${String(r.cost).padStart(7)} zł | ${r.description.slice(0, 60)}`)
  }

  if (!apply) {
    console.log('\nDry run complete. Use --apply to insert.')
    return
  }

  const { data, error } = await supabase.from('other_costs').insert(rows).select('id')
  if (error) throw error
  console.log(`\n✓ Inserted ${data.length} rows.`)
}

main().catch((err) => { console.error(err); process.exit(1) })
