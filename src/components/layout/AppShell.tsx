import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'
import ToastContainer from '@/components/ui/Toast'

export default function AppShell() {
  return (
    <div className="min-h-screen bg-white text-ink">
      <Sidebar />
      <main className="pb-24 md:pb-12 md:pl-60">
        <Outlet />
      </main>
      <BottomNav />
      <ToastContainer />
    </div>
  )
}
