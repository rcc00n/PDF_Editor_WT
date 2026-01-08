import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { LayoutGrid, FileText, PencilRuler, Smartphone, RefreshCw, ClipboardCheck, Moon, Sun, Globe, Wifi, WifiOff, Command, Shield, User } from 'lucide-react'
import { useAppStore } from '@/shared/state/useAppStore'
import { cn } from '@/shared/ui/cn'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/forms', label: 'Forms', icon: FileText },
  { to: '/field', label: 'Field App', icon: Smartphone },
  { to: '/queue', label: 'Sync Queue', icon: RefreshCw },
  { to: '/review', label: 'Review', icon: ClipboardCheck }
]

export default function AppShell() {
  const theme = useAppStore(s => s.theme)
  const toggleTheme = useAppStore(s => s.toggleTheme)
  const role = useAppStore(s => s.role)
  const setRole = useAppStore(s => s.setRole)
  const online = useAppStore(s => s.online)
  const forcedOffline = useAppStore(s => s.forcedOffline)
  const setForcedOffline = useAppStore(s => s.setForcedOffline)
  const queueCount = useAppStore(s => s.queue.filter(q => q.status === 'pending' || q.status === 'in_progress').length)
  const lastSyncSuccess = useAppStore(s => s.lastSyncSuccess)

  const location = useLocation()
  const navigate = useNavigate()

  const nextTheme = theme === 'dark' ? 'light' : theme === 'light' ? 'planet' : 'dark'
  const ThemeIcon = nextTheme === 'light' ? Sun : nextTheme === 'dark' ? Moon : Globe
  const isAdmin = role === 'admin'
  const RoleIcon = isAdmin ? Shield : User

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        useAppStore.getState().pushToast({ title: 'Command', message: 'Open the command palette: ⌘/Ctrl + K', variant: 'default' })
        window.dispatchEvent(new CustomEvent('rf:command:open'))
      }
      if (e.key === 'Escape') {
        window.dispatchEvent(new CustomEvent('rf:command:close'))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="h-full flex">
      <aside className="hidden md:flex md:flex-col md:w-[240px] shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/70 backdrop-blur">
        <div className="h-16 flex items-center gap-2 px-3 md:px-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="h-10 w-10 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-center font-semibold">
            RF
          </div>
          <div className="hidden md:block leading-tight">
            <div className="font-semibold">RelayForms</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Offline-ready</div>
          </div>
        </div>

        <nav className="p-2 md:p-3 flex flex-col gap-1">
          {nav.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rf-focus flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition',
                    'hover:bg-neutral-100 dark:hover:bg-neutral-900',
                    isActive && 'bg-neutral-100 dark:bg-neutral-900'
                  )
                }
              >
                <Icon size={18} className="shrink-0" />
                <span className="hidden md:block">{item.label}</span>
              </NavLink>
            )
          })}

          {isAdmin && (
            <div className="mt-2 hidden md:block border-t border-neutral-200 dark:border-neutral-800 pt-3">
              <button
                className="rf-focus w-full flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900"
                onClick={() => navigate('/forms')}
                title="Open Form Builder"
              >
                <span className="flex items-center gap-3">
                  <PencilRuler size={18} /> Builder
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">→</span>
              </button>
            </div>
          )}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 shrink-0 border-b border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-950/60 backdrop-blur">
          <div className="h-full px-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">
                {titleForPath(location.pathname)}
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                {online ? (lastSyncSuccess ? `Last sync ${formatTime(lastSyncSuccess)}` : 'Online') : 'Offline'}
                {queueCount ? ` · Queue ${queueCount}` : ''}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="rf-focus hidden sm:flex items-center gap-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
                onClick={() => window.dispatchEvent(new CustomEvent('rf:command:open'))}
                title="Command palette (Ctrl/⌘+K)"
              >
                <Command size={16} />
                <span className="hidden md:inline">Search</span>
                <span className="ml-2 text-xs text-neutral-500 dark:text-neutral-400">Ctrl K</span>
              </button>

              <button
                className={cn(
                  'rf-focus rounded-2xl border px-3 py-2 text-sm font-medium transition',
                  online ? 'border-neutral-200 dark:border-neutral-800' : 'border-amber-300/60 dark:border-amber-400/30',
                  'hover:bg-neutral-50 dark:hover:bg-neutral-900'
                )}
                onClick={() => setForcedOffline(!forcedOffline)}
                title={forcedOffline ? 'Disable offline simulation' : 'Enable offline simulation'}
              >
                <span className="inline-flex items-center gap-2">
                  {online ? <Wifi size={16} /> : <WifiOff size={16} />}
                  <span className="hidden md:inline">{online ? 'Online' : 'Offline'}</span>
                </span>
              </button>

              <button
                className="rf-focus rounded-2xl border border-neutral-200 dark:border-neutral-800 px-3 py-2 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-900"
                onClick={() => setRole(isAdmin ? 'worker' : 'admin')}
                title={isAdmin ? 'Switch to worker' : 'Switch to admin'}
              >
                <span className="inline-flex items-center gap-2">
                  <RoleIcon size={16} />
                  <span className="hidden md:inline">{isAdmin ? 'Admin' : 'Worker'}</span>
                </span>
              </button>

              <button
                className="rf-focus rounded-2xl border border-neutral-200 dark:border-neutral-800 px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
                onClick={toggleTheme}
                title={`Switch to ${nextTheme} theme`}
              >
                <ThemeIcon size={16} />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-auto rf-scrollbar pb-24 md:pb-0">
          <Outlet />
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur">
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          {nav.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rf-focus flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-medium leading-tight transition',
                    isActive
                      ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-white'
                      : 'text-neutral-500 dark:text-neutral-400'
                  )
                }
              >
                <Icon size={18} />
                <span className="text-center">{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

function titleForPath(path: string) {
  if (path.startsWith('/dashboard')) return 'Dashboard'
  if (path.startsWith('/forms')) return 'Forms'
  if (path.startsWith('/builder')) return 'Form Builder'
  if (path.startsWith('/field')) return 'Field App'
  if (path.startsWith('/queue')) return 'Sync Queue'
  if (path.startsWith('/review')) return 'Admin Review & Export'
  return 'RelayForms'
}

function formatTime(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
