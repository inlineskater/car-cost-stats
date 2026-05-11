import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import ImageCapture from '@/components/ui/ImageCapture'
import { useState } from 'react'
import { todayISO } from '@/lib/utils'
import type { CostCategory } from '@/types'

const schema = z.object({
  date: z.string().min(1, 'Required'),
  category: z.enum(['inspection', 'insurance', 'service', 'repair', 'tax', 'other']),
  cost: z.coerce.number().positive('Must be > 0'),
  description: z.string().min(1, 'Required'),
  next_due_date: z.string().optional(),
  notes: z.string().optional(),
})

export type OtherCostFormData = z.infer<typeof schema>

const CATEGORIES: { value: CostCategory; label: string }[] = [
  { value: 'inspection', label: 'Inspection' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'service', label: 'Service' },
  { value: 'repair', label: 'Repair' },
  { value: 'tax', label: 'Road tax' },
  { value: 'other', label: 'Other' },
]

interface OtherCostFormProps {
  onSubmit: (data: OtherCostFormData, attachmentFile?: File) => void
  submitting?: boolean
}

export default function OtherCostForm({ onSubmit, submitting }: OtherCostFormProps) {
  const [attachFile, setAttachFile] = useState<File | null>(null)
  const [attachPreview, setAttachPreview] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<OtherCostFormData>({
    resolver: zodResolver(schema),
    defaultValues: { date: todayISO(), category: 'service' },
  })

  function handleAttachment(file: File, _b64: string, _mime: string) {
    setAttachFile(file)
    setAttachPreview(URL.createObjectURL(file))
  }

  return (
    <form onSubmit={handleSubmit((d) => onSubmit(d, attachFile ?? undefined))} className="space-y-4">
      <Select
        label="Category"
        options={CATEGORIES}
        {...register('category')}
        error={errors.category?.message}
      />
      <Input label="Date" type="date" {...register('date')} error={errors.date?.message} />
      <Input label="Cost" type="number" step="0.01" placeholder="0.00" {...register('cost')} error={errors.cost?.message} />
      <Input label="Description" placeholder="e.g. Annual insurance renewal" {...register('description')} error={errors.description?.message} />
      <Input label="Next due date (optional)" type="date" {...register('next_due_date')} />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
        <textarea
          {...register('notes')}
          rows={2}
          className="w-full bg-gray-100 border-0 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40 resize-none"
          placeholder="Any notes…"
        />
      </div>
      <ImageCapture
        label="Attachment (optional)"
        onImageSelected={handleAttachment}
        preview={attachPreview}
        onClear={() => { setAttachFile(null); setAttachPreview(null) }}
      />
      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? 'Saving…' : 'Save cost'}
      </Button>
    </form>
  )
}
