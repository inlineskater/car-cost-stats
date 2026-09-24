import { useNavigate } from 'react-router-dom'
import TopBar from '@/components/layout/TopBar'
import OtherCostForm, { type OtherCostFormData } from '@/components/costs/OtherCostForm'
import { useAddOtherCost } from '@/hooks/useOtherCosts'
import { useAppStore } from '@/stores/appStore'

export default function AddOtherCost() {
  const navigate = useNavigate()
  const addToast = useAppStore((s) => s.addToast)
  const addCost = useAddOtherCost()

  async function handleSubmit(data: OtherCostFormData, attachmentFile?: File) {
    try {
      await addCost.mutateAsync({
        cost: {
          date: data.date,
          category: data.category,
          cost: data.cost,
          description: data.description,
          next_due_date: data.next_due_date || null,
          notes: data.notes || null,
        },
        attachmentFile,
      })
      addToast('Cost saved!', 'success')
      navigate('/')
    } catch {
      addToast('Failed to save cost.', 'error')
    }
  }

  return (
    <div>
      <TopBar title="Add Cost" />
      <div className="px-4 md:px-12 pb-8 max-w-5xl mx-auto [&>*]:max-w-lg">
        <OtherCostForm onSubmit={handleSubmit} submitting={addCost.isPending} />
      </div>
    </div>
  )
}
