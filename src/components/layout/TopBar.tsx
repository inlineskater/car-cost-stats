import { useLocation } from 'react-router-dom'
import { NAV_ITEMS } from './nav'

interface TopBarProps {
  title: string
  action?: React.ReactNode
  icon?: string
  description?: string
}

// Notion-style page header: a thin sticky breadcrumb bar, then a large page
// title with an emoji icon.
export default function TopBar({ title, action, icon, description }: TopBarProps) {
  const { pathname } = useLocation()
  const emoji = icon ?? NAV_ITEMS.find((n) => n.to === pathname)?.emoji ?? '📄'

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur safe-top">
        <div className="flex items-center justify-between px-3 md:px-4 h-11">
          <p className="text-sm text-ink truncate flex items-center gap-1.5">
            <span className="text-ink-faint hidden sm:inline">Car Costs</span>
            <span className="text-ink-faint hidden sm:inline">/</span>
            <span>{emoji}</span>
            <span>{title}</span>
          </p>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </header>
      <div className="max-w-5xl mx-auto px-4 md:px-12 pt-6 md:pt-12 pb-4">
        <div className="text-5xl md:text-6xl leading-none mb-3 select-none">{emoji}</div>
        <h1 className="text-3xl md:text-4xl font-bold text-ink tracking-tight">{title}</h1>
        {description && <p className="text-ink-muted mt-1.5">{description}</p>}
      </div>
    </>
  )
}
