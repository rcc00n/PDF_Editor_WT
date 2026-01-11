import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { LayoutGrid, FileText, PencilRuler, Smartphone, RefreshCw, ClipboardCheck, Moon, Sun, Globe, Wifi, WifiOff, Command, Shield, User, Users, ChevronLeft, ChevronRight, ChevronDown, LogOut, Sparkles } from 'lucide-react'
import { useAppStore } from '@/shared/state/useAppStore'
import { cn } from '@/shared/ui/cn'
import Modal from '@/shared/ui/Modal'
import Button from '@/shared/ui/Button'
import Badge from '@/shared/ui/Badge'

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
  const apiEnabled = useAppStore(s => s.apiEnabled)
  const user = useAppStore(s => s.user)
  const sidebarCollapsed = useAppStore(s => s.sidebarCollapsed)
  const setSidebarCollapsed = useAppStore(s => s.setSidebarCollapsed)
  const logout = useAppStore(s => s.logout)
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
  const navItems = isAdmin ? [...nav, { to: '/employees', label: 'Employees', icon: Users }] : nav
  const [profileOpen, setProfileOpen] = useState(false)
  const profileLabel = user?.email || (isAdmin ? 'Admin' : 'Worker')

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
      <aside
        className={cn(
          'hidden md:flex md:flex-col shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/70 backdrop-blur',
          sidebarCollapsed ? 'md:w-[88px]' : 'md:w-[240px]'
        )}
      >
        <div
          className={cn(
            'h-16 flex items-center border-b border-neutral-200 dark:border-neutral-800',
            sidebarCollapsed ? 'px-2 justify-between gap-2' : 'px-3 md:px-4 gap-3'
          )}
        >
          <div className="h-10 w-10 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <div className="h-full w-full bg-gradient-to-br from-cyan-400/80 via-blue-500/70 to-fuchsia-500/70 text-white flex items-center justify-center">
              <Sparkles size={18} />
            </div>
          </div>
          {!sidebarCollapsed && (
            <div className="hidden md:block leading-tight">
              <div className="font-semibold">RelayForms</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">Offline-ready</div>
            </div>
          )}
          <button
            className={cn(
              'rf-focus rounded-xl p-2 hover:bg-neutral-100 dark:hover:bg-neutral-900',
              !sidebarCollapsed && 'ml-auto'
            )}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="p-2 md:p-3 flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={item.label}
                aria-label={item.label}
                className={({ isActive }) =>
                  cn(
                    'rf-focus flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition',
                    'hover:bg-neutral-100 dark:hover:bg-neutral-900',
                    isActive && 'bg-neutral-100 dark:bg-neutral-900',
                    sidebarCollapsed && 'justify-center px-2'
                  )
                }
              >
                <Icon size={18} className="shrink-0" />
                {!sidebarCollapsed && <span className="hidden md:block">{item.label}</span>}
              </NavLink>
            )
          })}

          {isAdmin && (
            <div className={cn('mt-2 hidden md:block border-t border-neutral-200 dark:border-neutral-800 pt-3', sidebarCollapsed && 'px-0')}>
              <button
                className={cn(
                  'rf-focus w-full flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900',
                  sidebarCollapsed && 'justify-center px-2'
                )}
                onClick={() => navigate('/forms')}
                title="Open Form Builder"
              >
                <span className="flex items-center gap-3">
                  <PencilRuler size={18} />
                  {!sidebarCollapsed && 'Builder'}
                </span>
                {!sidebarCollapsed && <span className="text-xs text-neutral-500 dark:text-neutral-400">→</span>}
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
                onClick={() => setProfileOpen(true)}
                title={user?.email || (isAdmin ? 'Admin' : 'Worker')}
              >
                <span className="inline-flex items-center gap-2">
                  <RoleIcon size={16} />
                  <span className="hidden md:inline">{isAdmin ? 'Admin' : 'Worker'}</span>
                  <ChevronDown size={14} className="text-neutral-400" />
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

      <Modal open={profileOpen} onClose={() => setProfileOpen(false)} title="Profile">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-center font-semibold">
              <RoleIcon size={20} />
            </div>
            <div className="min-w-0">
              <div className="font-semibold truncate">{profileLabel}</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                {apiEnabled ? 'Signed in account' : 'Local demo profile'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <Badge tone={isAdmin ? 'success' : 'neutral'}>{isAdmin ? 'Admin' : 'Worker'}</Badge>
            <span>{online ? 'Online' : 'Offline'}</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {!apiEnabled && (
              <Button variant="secondary" onClick={() => setRole(isAdmin ? 'worker' : 'admin')}>
                Switch to {isAdmin ? 'Worker' : 'Admin'}
              </Button>
            )}
            <Button
              variant="danger"
              onClick={() => {
                setProfileOpen(false)
                logout()
              }}
            >
              <LogOut size={16} /> Log out
            </Button>
          </div>
        </div>
      </Modal>

      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur">
        <div className={cn('grid gap-1 px-2 py-2', navItems.length > 5 ? 'grid-cols-6' : 'grid-cols-5')}>
          {navItems.map((item) => {
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

export function titleForPath(path: string) {
  if (path.startsWith('/dashboard')) return 'Dashboard'
  if (path.startsWith('/forms')) return 'Forms'
  if (path.startsWith('/builder')) return 'Form Builder'
  if (path.startsWith('/field')) return 'Field App'
  if (path.startsWith('/queue')) return 'Sync Queue'
  if (path.startsWith('/review')) return 'Admin Review & Export'
  if (path.startsWith('/employees')) return 'Employees'
  return 'RelayForms'
}

export function formatTime(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
