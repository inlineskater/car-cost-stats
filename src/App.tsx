import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { isAllowedAuthEmail } from '@/lib/authAllowlist'
import AppShell from '@/components/layout/AppShell'
import Auth from '@/pages/Auth'
import Dashboard from '@/pages/Dashboard'
import AddFuel from '@/pages/AddFuel'
import AddOtherCost from '@/pages/AddOtherCost'
import History from '@/pages/History'
import Statistics from '@/pages/Statistics'

function ProtectedRoute({ session, children }: { session: Session | null; children: React.ReactNode }) {
  if (!session) return <Navigate to="/auth" replace />
  if (!isAllowedAuthEmail(session.user.email)) {
    return <Navigate to="/auth" replace />
  }
  return <>{children}</>
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    function applySession(s: Session | null) {
      if (s && !isAllowedAuthEmail(s.user.email)) {
        setSession(null)
        void supabase.auth.signOut()
        return
      }
      setSession(s)
    }

    supabase.auth.getSession().then(({ data }) => applySession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => applySession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/auth" element={session && isAllowedAuthEmail(session.user.email) ? <Navigate to="/" replace /> : <Auth />} />
      <Route
        path="/"
        element={
          <ProtectedRoute session={session}>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="add-fuel" element={<AddFuel />} />
        <Route path="add-cost" element={<AddOtherCost />} />
        <Route path="history" element={<History />} />
        <Route path="statistics" element={<Statistics />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
