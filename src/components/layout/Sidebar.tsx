import { NavLink } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { NAV_ITEMS } from './nav'

// Desktop-only Notion-style sidebar.
export default function Sidebar() {
  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col bg-surface-sidebar border-r border-line z-40">
      <div className="flex items-center gap-2 px-3 h-12 mx-1 mt-1">
        <span className="w-5 h-5 rounded bg-ink text-white text-[11px] font-semibold flex items-center justify-center">C</span>
        <span className="text-sm font-medium text-ink truncate">Car Costs</span>
      </div>
      <nav className="flex flex-col gap-px px-1 mt-2">
        {NAV_ITEMS.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 mx-1 px-2 py-1 rounded-md text-sm transition-colors',
                isActive ? 'bg-surface-hover text-ink font-medium' : 'text-ink-muted hover:bg-surface-hover',
              )
            }
          >
            <Icon size={16} strokeWidth={1.75} className="shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
      <button
        onClick={() => void supabase.auth.signOut()}
        className="mt-auto mb-3 mx-2 flex items-center gap-2 px-2 py-1 rounded-md text-sm text-ink-faint hover:bg-surface-hover hover:text-ink-muted transition-colors"
      >
        <LogOut size={16} strokeWidth={1.75} />
        Sign out
      </button>
    </aside>
  )
}
