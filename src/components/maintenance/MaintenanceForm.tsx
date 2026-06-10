import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { todayISO } from '@/lib/utils'
import { SERVICE_PRESETS } from '@/lib/maintenance'

const OTHER = '__other__'

const schema = z.object({
  preset: z.string().min(1, 'Required'),
  custom_type: z.string().optional(),
  date: z.string().min(1, 'Required'),
  odometer_km: z.coerce.number().int().positive('Must be > 0'),
  interval_km: z.coerce.number().int().positive('Must be > 0'),
  cost: z.union([z.coerce.number().nonnegative(), z.nan()]).optional(),
  notes: z.string().optional(),
}).refine((d) => d.preset !== OTHER || (d.custom_type && d.custom_type.trim().length > 0), {
  message: 'Enter a name',
  path: ['custom_type'],
})

export type MaintenanceFormData = z.infer<typeof schema>

export interface MaintenanceSubmit {
  service_type: string
  date: string
  odometer_km: number
  interval_km: number
  cost: number | null
  notes: string | null
}

const PRESET_OPTIONS = [
  ...SERVICE_PRESETS.map((p) => ({ value: p.value, label: p.label })),
  { value: OTHER, label: 'Other…' },
]

interface MaintenanceFormProps {
  currentOdometer?: number
  onSubmit: (data: MaintenanceSubmit) => void
  submitting?: boolean
}

export default function MaintenanceForm({ currentOdometer, onSubmit, submitting }: MaintenanceFormProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<MaintenanceFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      preset: SERVICE_PRESETS[0].value,
      date: todayISO(),
      odometer_km: currentOdometer || undefined,
      interval_km: SERVICE_PRESETS[0].defaultIntervalKm,
    },
  })

  const preset = watch('preset')
  const [intervalTouched, setIntervalTouched] = useState(false)

  // when switching preset, suggest its default interval (until the user edits it)
  function handlePresetChange(value: string) {
    setValue('preset', value)
    if (!intervalTouched) {
      const found = SERVICE_PRESETS.find((p) => p.value === value)
      if (found) setValue('interval_km', found.defaultIntervalKm)
    }
  }

  function submit(d: MaintenanceFormData) {
    const service_type = d.preset === OTHER
      ? d.custom_type!.trim().toLowerCase().replace(/\s+/g, '_')
      : d.preset
    onSubmit({
      service_type,
      date: d.date,
      odometer_km: d.odometer_km,
      interval_km: d.interval_km,
      cost: d.cost != null && !Number.isNaN(d.cost) ? d.cost : null,
      notes: d.notes?.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <Select
        label="Service"
        options={PRESET_OPTIONS}
        {...register('preset')}
        onChange={(e) => handlePresetChange(e.target.value)}
        error={errors.preset?.message}
      />
      {preset === OTHER && (
        <Input label="Service name" placeholder="e.g. Timing belt" {...register('custom_type')} error={errors.custom_type?.message} />
      )}
      <Input label="Date" type="date" {...register('date')} error={errors.date?.message} />
      <Input
        label="Odometer at service (km)"
        type="number"
        placeholder="e.g. 327166"
        {...register('odometer_km')}
        error={errors.odometer_km?.message}
      />
      <Input
        label="Interval (km)"
        type="number"
        placeholder="e.g. 15000"
        {...register('interval_km', { onChange: () => setIntervalTouched(true) })}
        error={errors.interval_km?.message}
      />
      <Input label="Cost (optional)" type="number" step="0.01" placeholder="0.00" {...register('cost')} error={errors.cost?.message} />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
        <textarea
          {...register('notes')}
          rows={2}
          className="w-full bg-gray-100 border-0 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40 resize-none"
          placeholder="Any notes…"
        />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? 'Saving…' : 'Save service'}
      </Button>
    </form>
  )
}
