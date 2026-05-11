import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import FuelTypeToggle from './FuelTypeToggle'
import type { FuelType, ParsedFuelEntry } from '@/types'
import { todayISO } from '@/lib/utils'

export interface FuelFormPrefill extends Omit<ParsedFuelEntry, 'source_image_index'> {
  date: string | null
  mileage: number | null
}

const schema = z.object({
  date: z.string().min(1, 'Required'),
  fuel_type: z.enum(['lpg', 'petrol']),
  liters: z.coerce.number().positive('Must be > 0'),
  price_per_liter: z.coerce.number().positive('Must be > 0'),
  total_cost: z.coerce.number().positive('Must be > 0'),
  mileage: z.coerce.number().int().positive('Must be > 0'),
  notes: z.string().optional(),
})

export type FuelFormData = z.infer<typeof schema>

interface FuelFormProps {
  defaultValues?: Partial<FuelFormData>
  prefilled?: FuelFormPrefill | null
  onSubmit: (data: FuelFormData) => void
  submitting?: boolean
}

export default function FuelForm({ defaultValues, prefilled, onSubmit, submitting }: FuelFormProps) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FuelFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: todayISO(),
      fuel_type: 'lpg',
      ...defaultValues,
    },
  })

  const fuelType = watch('fuel_type') as FuelType

  useEffect(() => {
    if (!prefilled) return
    if (prefilled.date) setValue('date', prefilled.date)
    if (prefilled.fuel_type) setValue('fuel_type', prefilled.fuel_type)
    if (prefilled.liters) setValue('liters', prefilled.liters)
    if (prefilled.price_per_liter) setValue('price_per_liter', prefilled.price_per_liter)
    if (prefilled.total_cost) setValue('total_cost', prefilled.total_cost)
    if (prefilled.mileage) setValue('mileage', prefilled.mileage)
  }, [prefilled, setValue])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <p className="text-sm font-medium text-gray-700 mb-1">Fuel type</p>
        <FuelTypeToggle
          value={fuelType}
          onChange={(v) => setValue('fuel_type', v)}
        />
      </div>
      <input type="hidden" {...register('fuel_type')} />

      <Input label="Date" type="date" {...register('date')} error={errors.date?.message} />

      <div className="grid grid-cols-2 gap-3">
        <Input label="Litres" type="number" step="0.001" placeholder="0.000" {...register('liters')} error={errors.liters?.message} />
        <Input label="Price / L" type="number" step="0.0001" placeholder="0.0000" {...register('price_per_liter')} error={errors.price_per_liter?.message} />
      </div>

      <Input label="Total cost" type="number" step="0.01" placeholder="0.00" {...register('total_cost')} error={errors.total_cost?.message} />
      <Input label="Odometer (km)" type="number" placeholder="e.g. 123456" {...register('mileage')} error={errors.mileage?.message} />

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
        {submitting ? 'Saving…' : 'Save entry'}
      </Button>
    </form>
  )
}
