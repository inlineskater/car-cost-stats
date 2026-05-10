interface TopBarProps {
  title: string
  action?: React.ReactNode
}

export default function TopBar({ title, action }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-200 safe-top">
      <div className="flex items-center justify-between px-4 h-14">
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        {action && <div>{action}</div>}
      </div>
    </header>
  )
}
