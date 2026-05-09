import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import ToastContainer from '@/components/ui/Toast'

export default function AppShell() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <main className="pb-24">
        <Outlet />
      </main>
      <BottomNav />
      <ToastContainer />
    </div>
  )
}
