import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Fuel, List, BarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/add-fuel', icon: Fuel, label: 'Add Fuel', exact: false },
  { to: '/history', icon: List, label: 'History', exact: false },
  { to: '/statistics', icon: BarChart2, label: 'Stats', exact: false },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 safe-bottom z-40">
      <div className="flex">
        {tabs.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center gap-1 py-2 px-1 text-xs transition-colors',
                isActive ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300',
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
