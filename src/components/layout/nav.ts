import { LayoutDashboard, Fuel, Receipt, Wrench, List } from 'lucide-react'

export const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', emoji: '📊', exact: true },
  { to: '/add-fuel', icon: Fuel, label: 'Fuel', emoji: '⛽', exact: false },
  { to: '/add-cost', icon: Receipt, label: 'Cost', emoji: '🧾', exact: false },
  { to: '/service', icon: Wrench, label: 'Service', emoji: '🔧', exact: false },
  { to: '/history', icon: List, label: 'History', emoji: '🗂️', exact: false },
]
