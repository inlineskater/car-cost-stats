import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { RENEWAL_PRESETS } from '@/lib/maintenance'

const OTHER = '__other__'

const schema = z.object({
  preset: z.string().min(1, 'Required'),
  custom_category: z.string().optional(),
  valid_until: z.string().min(1, 'Required'),
  cost: z.union([z.coerce.number().nonnegative(), z.nan()]).optional(),
  notes: z.string().optional(),
}).refine((d) => d.preset !== OTHER || (d.custom_category && d.custom_category.trim().length > 0), {
  message: 'Enter a name',
  path: ['custom_category'],
})

export type RenewalFormData = z.infer<typeof schema>

export interface RenewalSubmit {
  category: string
  valid_until: string
  cost: number | null
  notes: string | null
}

const PRESET_OPTIONS = [
  ...RENEWAL_PRESETS.map((p) => ({ value: p.value, label: p.label })),
  { value: OTHER, label: 'Other…' },
]

interface RenewalFormProps {
  onSubmit: (data: RenewalSubmit) => void
  submitting?: boolean
}

export default function RenewalForm({ onSubmit, submitting }: RenewalFormProps) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<RenewalFormData>({
    resolver: zodResolver(schema),
    defaultValues: { preset: RENEWAL_PRESETS[0].value },
  })

  const preset = watch('preset')

  function submit(d: RenewalFormData) {
    const category = d.preset === OTHER
      ? d.custom_category!.trim().toLowerCase().replace(/\s+/g, '_')
      : d.preset
    onSubmit({
      category,
      valid_until: d.valid_until,
      cost: d.cost != null && !Number.isNaN(d.cost) ? d.cost : null,
      notes: d.notes?.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <Select
        label="Type"
        options={PRESET_OPTIONS}
        {...register('preset')}
        error={errors.preset?.message}
      />
      {preset === OTHER && (
        <Input label="Name" placeholder="e.g. Parking permit" {...register('custom_category')} error={errors.custom_category?.message} />
      )}
      <Input label="Valid until" type="date" {...register('valid_until')} error={errors.valid_until?.message} />
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
        {submitting ? 'Saving…' : 'Save renewal'}
      </Button>
    </form>
  )
}
