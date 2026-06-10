import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Fuel, Receipt, Wrench, List } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/add-fuel', icon: Fuel, label: 'Fuel', exact: false },
  { to: '/add-cost', icon: Receipt, label: 'Cost', exact: false },
  { to: '/service', icon: Wrench, label: 'Service', exact: false },
  { to: '/history', icon: List, label: 'History', exact: false },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200 safe-bottom z-40">
      <div className="flex">
        {tabs.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center gap-1 py-2 px-1 text-xs transition-colors',
                isActive ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600',
              )
            }
          >
            <Icon size={22} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
