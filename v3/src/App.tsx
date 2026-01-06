import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
import AppShell from './app/shell/AppShell'
import DashboardPage from './pages/dashboard/DashboardPage'
import FormsPage from './pages/forms/FormsPage'
import BuilderPage from './pages/builder/BuilderPage'
import FieldHomePage from './pages/field/FieldHomePage'
import FieldTicketPage from './pages/field/FieldTicketPage'
import QueuePage from './pages/queue/QueuePage'
import ReviewPage from './pages/review/ReviewPage'
import ReviewTicketPage from './pages/review/ReviewTicketPage'
import { useAppStore } from './shared/state/useAppStore'
import CommandPalette from './shared/ui/CommandPalette'
import ToastHost from './shared/ui/ToastHost'
import { useQueueProcessor } from './features/offline-queue/useQueueProcessor'
import { seedIfEmpty } from './shared/state/seed'

export default function App() {
  const boot = useAppStore(s => s.boot)
  const online = useAppStore(s => s.online)
  const setSystemOnline = useAppStore(s => s.setSystemOnline)

  useQueueProcessor()

  useEffect(() => {
    seedIfEmpty()
    boot()
  }, [boot])

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

  return (
    <>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/forms" element={<FormsPage />} />
          <Route path="/builder/:formId" element={<BuilderPage />} />
          <Route path="/field" element={<FieldHomePage />} />
          <Route path="/field/ticket/:ticketId" element={<FieldTicketPage />} />
          <Route path="/queue" element={<QueuePage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/review/:ticketId" element={<ReviewTicketPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>

      <CommandPalette />
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
