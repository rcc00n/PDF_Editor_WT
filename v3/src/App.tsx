import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
import AppShell from './app/shell/AppShell'
import DashboardPage from './pages/dashboard/DashboardPage'
import BuilderPage from './pages/builder/BuilderPage'
import BuilderHomePage from './pages/builder/BuilderHomePage'
import BuilderCompletePage from './pages/builder/BuilderCompletePage'
import FieldHomePage from './pages/field/FieldHomePage'
import FieldTicketPage from './pages/field/FieldTicketPage'
import ReviewPage from './pages/review/ReviewPage'
import ReviewTicketPage from './pages/review/ReviewTicketPage'
import EmployeesPage from './pages/employees/EmployeesPage'
import LoginPage from './pages/auth/LoginPage'
import { useAppStore } from './shared/state/useAppStore'
import ToastHost from './shared/ui/ToastHost'
import { useQueueProcessor } from './features/offline-queue/useQueueProcessor'
import { seedIfEmpty } from './shared/state/seed'
import { API_ENABLED, APP_MODE, DEMO_MODE } from './shared/api/config'

export default function App() {
  const boot = useAppStore(s => s.boot)
  const primePdfCache = useAppStore(s => s.primePdfCache)
  const online = useAppStore(s => s.online)
  const setSystemOnline = useAppStore(s => s.setSystemOnline)
  const initAuth = useAppStore(s => s.initAuth)
  const authStatus = useAppStore(s => s.authStatus)

  useQueueProcessor()

  useEffect(() => {
    if (APP_MODE === 'unconfigured') return
    if (DEMO_MODE) seedIfEmpty()
    boot()
    void primePdfCache()
    if (API_ENABLED) void initAuth()
  }, [boot, initAuth, primePdfCache])

  useEffect(() => {
    const on = () => setSystemOnline(true)
    const off = () => setSystemOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [setSystemOnline])

  if (APP_MODE === 'unconfigured') {
    return <main className="p-8"><h1>Application configuration required</h1>
      <p>Set VITE_API_BASE_URL for a connected workspace, or VITE_DEMO_MODE=true for the local simulation. Do not set both.</p>
    </main>
  }

  if (API_ENABLED && authStatus === 'unknown') {
    return (
      <div className="h-full flex items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">
        Loading session…
      </div>
    )
  }

  if (API_ENABLED && authStatus !== 'authenticated') {
    return (
      <>
        <LoginPage />
        <ToastHost />
      </>
    )
  }

  return (
    <>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/builder" element={<BuilderHomePage />} />
          <Route path="/builder/:formId" element={<BuilderPage />} />
          <Route path="/builder/complete/:formId" element={<BuilderCompletePage />} />
          <Route path="/field" element={<FieldHomePage />} />
          <Route path="/field/ticket/:ticketId" element={<FieldTicketPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/review/:ticketId" element={<ReviewTicketPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/groups" element={<Navigate to="/employees#groups" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>

      <ToastHost />
      {!online && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <div className="px-3 py-2 rounded-full text-xs font-medium border border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/80">
            Offline: changes are saved locally and will go to the sync queue
          </div>
        </div>
      )}
    </>
  )
}
