import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { api } from './lib/api'
import { AppProvider, useApp } from './lib/store'
import { Spinner } from './components/ui'
import Kampdag from './screens/Kampdag'
import Billet from './screens/Billet'
import Point from './screens/Point'
import Live from './screens/Live'
import Dunk from './screens/Dunk'
import CheckIn from './screens/CheckIn'
import Onboarding from './screens/Onboarding'
import Profil from './screens/Profil'

const Admin = lazy(() => import('./screens/Admin'))

/** Nye brugere sendes gennem onboarding – og tilbage til fx check-in-linket bagefter. */
function Gate({ children }: { children: React.ReactNode }) {
  const { profile } = useApp()
  const loc = useLocation()
  if (!profile.onboarded && loc.pathname !== '/velkommen') {
    const next = encodeURIComponent(loc.pathname + loc.search)
    const ven = new URLSearchParams(loc.search).get('ven')
    return <Navigate to={`/velkommen?next=${next}${ven ? `&ven=${ven}` : ''}`} replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      {api.mode === 'demo' && <div className="demo-banner"><b>Demo</b> · eksempeldata gemt i din browser</div>}
      <div className="shell">
        <AppProvider fallback={<Spinner />}>
          <Gate>
            <Suspense fallback={<Spinner />}>
              <Routes>
                <Route path="/" element={<Kampdag />} />
                <Route path="/billet" element={<Billet />} />
                <Route path="/point" element={<Point />} />
                <Route path="/live" element={<Live />} />
                <Route path="/dunk" element={<Dunk />} />
                <Route path="/tjek-ind" element={<CheckIn />} />
                <Route path="/velkommen" element={<Onboarding />} />
                <Route path="/profil" element={<Profil />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </Gate>
        </AppProvider>
      </div>
    </BrowserRouter>
  )
}
