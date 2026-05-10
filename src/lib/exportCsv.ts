import type { FuelEntryRow, OtherCostRow } from '@/types'

function escape(v: string | number | null | undefined): string {
  if (v == null) return ''
  const s = String(v)
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
}

export function exportCsv(fuelEntries: FuelEntryRow[], otherCosts: OtherCostRow[]) {
  const rows: string[] = [
    'date,type,fuel_type,liters,price_per_liter,total_cost,mileage,category,description,notes',
  ]

  for (const e of fuelEntries) {
    rows.push([
      escape(e.date),
      'fuel',
      escape(e.fuel_type),
      escape(e.liters),
      escape(e.price_per_liter),
      escape(e.total_cost),
      escape(e.mileage),
      '',
      '',
      escape(e.notes),
    ].join(','))
  }

  for (const c of otherCosts) {
    rows.push([
      escape(c.date),
      'other_cost',
      '',
      '',
      '',
      escape(c.cost),
      '',
      escape(c.category),
      escape(c.description),
      escape(c.notes),
    ].join(','))
  }

  const csv = rows.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `car-costs-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
