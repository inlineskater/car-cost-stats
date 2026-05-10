import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import ToastContainer from '@/components/ui/Toast'

export default function AppShell() {
  return (
    <div className="min-h-screen bg-[#F2F2F7] text-gray-900">
      <main className="pb-24">
        <Outlet />
      </main>
      <BottomNav />
      <ToastContainer />
    </div>
  )
}
