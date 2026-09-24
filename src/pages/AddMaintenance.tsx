import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import TopBar from '@/components/layout/TopBar'
import MaintenanceForm, { type MaintenanceSubmit } from '@/components/maintenance/MaintenanceForm'
import RenewalForm, { type RenewalSubmit } from '@/components/maintenance/RenewalForm'
import { useAddMaintenanceRecord, useAddRenewal, useMaintenanceStatus } from '@/hooks/useMaintenance'
import { useAppStore } from '@/stores/appStore'
import { cn } from '@/lib/utils'

type Mode = 'service' | 'renewal'

export default function AddMaintenance() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const addToast = useAppStore((s) => s.addToast)
  const [mode, setMode] = useState<Mode>(params.get('type') === 'renewal' ? 'renewal' : 'service')

  const { currentOdometer } = useMaintenanceStatus()
  const addService = useAddMaintenanceRecord()
  const addRenewal = useAddRenewal()

  async function handleService(data: MaintenanceSubmit) {
    try {
      await addService.mutateAsync(data)
      addToast('Service saved!', 'success')
      navigate('/service')
    } catch {
      addToast('Failed to save service.', 'error')
    }
  }

  async function handleRenewal(data: RenewalSubmit) {
    try {
      await addRenewal.mutateAsync(data)
      addToast('Renewal saved!', 'success')
      navigate('/service')
    } catch {
      addToast('Failed to save renewal.', 'error')
    }
  }

  const tabs: { value: Mode; label: string }[] = [
    { value: 'service', label: 'Service (km)' },
    { value: 'renewal', label: 'Renewal (date)' },
  ]

  return (
    <div>
      <TopBar title="Add Service" icon="🛠️" />
      <div className="px-4 md:px-12 pb-8 max-w-5xl mx-auto space-y-4 [&>*]:max-w-lg">
        <div className="flex gap-1.5 bg-surface-sidebar rounded-md p-1">
          {tabs.map((t) => (
            <button
              key={t.value}
              onClick={() => setMode(t.value)}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
                mode === t.value ? 'bg-white text-ink ring-1 ring-line' : 'text-ink-muted hover:text-ink',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {mode === 'service' ? (
          <MaintenanceForm
            currentOdometer={currentOdometer}
            onSubmit={handleService}
            submitting={addService.isPending}
          />
        ) : (
          <RenewalForm onSubmit={handleRenewal} submitting={addRenewal.isPending} />
        )}
      </div>
    </div>
  )
}
