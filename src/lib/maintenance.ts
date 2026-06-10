// Preset km-interval services. service_type is stored as a stable slug;
// users can also enter a custom one via the "Other" option.
export interface ServicePreset {
  value: string       // stored slug
  label: string       // display label
  defaultIntervalKm: number
}

export const SERVICE_PRESETS: ServicePreset[] = [
  { value: 'lpg_service', label: 'LPG service', defaultIntervalKm: 15000 },
  { value: 'oil_change', label: 'Oil change', defaultIntervalKm: 15000 },
]

const LABELS: Record<string, string> = Object.fromEntries(
  SERVICE_PRESETS.map((p) => [p.value, p.label]),
)

// Human-readable label for a stored service_type slug. Falls back to a
// title-cased version of the slug for custom types.
export function serviceTypeLabel(slug: string): string {
  if (LABELS[slug]) return LABELS[slug]
  return titleCase(slug)
}

// Date-based renewals (OC insurance, przegląd inspection).
export interface RenewalPreset {
  value: string       // stored category slug
  label: string       // display label
}

export const RENEWAL_PRESETS: RenewalPreset[] = [
  { value: 'insurance', label: 'OC (insurance)' },
  { value: 'inspection', label: 'Przegląd (inspection)' },
]

const RENEWAL_LABELS: Record<string, string> = Object.fromEntries(
  RENEWAL_PRESETS.map((p) => [p.value, p.label]),
)

export function renewalCategoryLabel(slug: string): string {
  if (RENEWAL_LABELS[slug]) return RENEWAL_LABELS[slug]
  return titleCase(slug)
}

function titleCase(slug: string): string {
  return slug
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
