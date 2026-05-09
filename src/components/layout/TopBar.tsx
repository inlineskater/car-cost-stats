interface TopBarProps {
  title: string
  action?: React.ReactNode
}

export default function TopBar({ title, action }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 safe-top">
      <div className="flex items-center justify-between px-4 h-14">
        <h1 className="text-lg font-semibold text-white">{title}</h1>
        {action && <div>{action}</div>}
      </div>
    </header>
  )
}
