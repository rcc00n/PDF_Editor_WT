import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { LayoutGrid, PencilRuler, Smartphone, ClipboardCheck, Shield, User, ChevronDown, LogOut } from 'lucide-react'
import { useAppStore } from '@/shared/state/useAppStore'
import { cn } from '@/shared/ui/cn'
import Modal from '@/shared/ui/Modal'
import Button from '@/shared/ui/Button'
import Badge from '@/shared/ui/Badge'
import Logo from '@/shared/ui/Logo'

const baseNav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/field', label: 'Field App', icon: Smartphone },
  { to: '/review', label: 'Review', icon: ClipboardCheck }
]

const THEME_OPTIONS = [
  { id: 'default', label: 'Default', swatch: '#f97316' },
  { id: 'slate', label: 'Slate', swatch: '#475569' },
  { id: 'ocean', label: 'Ocean', swatch: '#0284c7' },
  { id: 'meadow', label: 'Meadow', swatch: '#10b981' }
] as const


export default function AppShell() {
  const role = useAppStore(s => s.role)
  const setRole = useAppStore(s => s.setRole)
  const apiEnabled = useAppStore(s => s.apiEnabled)
  const user = useAppStore(s => s.user)
  const logout = useAppStore(s => s.logout)
  const online = useAppStore(s => s.online)
  const lastSyncSuccess = useAppStore(s => s.lastSyncSuccess)
  const theme = useAppStore(s => s.theme)
  const setTheme = useAppStore(s => s.setTheme)

  const location = useLocation()

  const isAdmin = role === 'admin'
  const RoleIcon = isAdmin ? Shield : User
  const navItems = isAdmin
    ? [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
        { to: '/builder', label: 'Builder', icon: PencilRuler },
        { to: '/field', label: 'Field App', icon: Smartphone },
        { to: '/review', label: 'Review', icon: ClipboardCheck },
        { to: '/employees', label: 'Employees', icon: User }
      ]
    : baseNav
  const [profileOpen, setProfileOpen] = useState(false)
  const profileLabel = user?.email || (isAdmin ? 'Admin' : 'Worker')

  return (
    <div className="h-full flex">
      <aside
        className={cn(
          'hidden md:flex md:flex-col shrink-0 border-r border-[var(--rf-border-soft)] bg-[var(--rf-surface)]',
          'md:w-[240px]'
        )}
      >
        <div
          className={cn(
            'h-16 flex items-center border-b border-[var(--rf-border-soft)] px-4 md:px-5 gap-3'
          )}
        >
          <div className="h-10 w-16 rounded-full border border-[var(--rf-border)] bg-[var(--rf-surface)] flex items-center justify-center overflow-hidden">
            <Logo className="h-9 w-auto" />
          </div>
          <div className="hidden md:block leading-tight">
            <div className="font-semibold">Wolsey Tech</div>
            <div className="text-xs text-[var(--rf-text-accent)] opacity-80">Tracking System</div>
          </div>
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
                      'rf-focus flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium',
                      'hover:bg-[var(--rf-orange-50)]',
                      isActive && 'bg-[var(--rf-orange-100)] text-[var(--rf-text-accent-strong)]'
                    )
                  }
                >
                <Icon size={18} className="shrink-0" />
                <span className="hidden md:block">{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 shrink-0 border-b border-[var(--rf-border-soft)] bg-[var(--rf-surface)]">
          <div className="h-full px-5 sm:px-6 flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-3">
              <div className="md:hidden h-9 w-14 rounded-full border border-[var(--rf-border)] bg-[var(--rf-surface)] flex items-center justify-center overflow-hidden">
                <Logo className="h-8 w-auto" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">
                  {titleForPath(location.pathname)}
                </div>
                <div className="text-xs text-[var(--rf-text-accent)] opacity-80 truncate">
                  {online ? (lastSyncSuccess ? `Last sync ${formatTime(lastSyncSuccess)}` : 'Online') : 'Offline'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="rf-focus rounded-2xl border border-[var(--rf-border)] bg-[var(--rf-surface)] px-3 py-2 text-sm font-medium hover:bg-[var(--rf-orange-50)]"
                onClick={() => setProfileOpen(true)}
                title={user?.email || (isAdmin ? 'Admin' : 'Worker')}
              >
                <span className="inline-flex items-center gap-2">
                  <RoleIcon size={16} />
                  <span className="hidden md:inline">{isAdmin ? 'Admin' : 'Worker'}</span>
                  <ChevronDown size={14} className="text-[var(--rf-orange-400)]" />
                </span>
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
            <div className="h-12 w-12 rounded-2xl border border-[var(--rf-border)] flex items-center justify-center font-semibold">
              <RoleIcon size={20} />
            </div>
            <div className="min-w-0">
              <div className="font-semibold truncate">{profileLabel}</div>
              <div className="text-xs text-neutral-500">
                {apiEnabled ? 'Signed in account' : 'Local demo profile'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Badge tone={isAdmin ? 'success' : 'neutral'}>{isAdmin ? 'Admin' : 'Worker'}</Badge>
            <span>{online ? 'Online' : 'Offline'}</span>
          </div>
          {isAdmin && (
            <div>
              <div className="text-xs text-neutral-500">Theme</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {THEME_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTheme(opt.id)}
                    aria-pressed={theme === opt.id}
                    className={cn(
                      'rf-focus flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm',
                      theme === opt.id
                        ? 'border-[var(--rf-orange-400)] bg-[var(--rf-orange-50)] text-[var(--rf-text-accent-strong)]'
                        : 'border-[var(--rf-border-soft)] text-neutral-600 hover:bg-[var(--rf-orange-50)]'
                    )}
                  >
                    <span
                      className="h-3 w-3 rounded-full border border-white shadow-sm"
                      style={{ backgroundColor: opt.swatch }}
                    />
                    <span className="font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
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

      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-[var(--rf-border-soft)] bg-[var(--rf-surface)] backdrop-blur">
        <div
          className={cn(
            'grid gap-1 px-2 py-2',
            navItems.length >= 6
              ? 'grid-cols-6'
              : navItems.length === 5
              ? 'grid-cols-5'
              : navItems.length === 4
              ? 'grid-cols-4'
              : 'grid-cols-3'
          )}
        >
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rf-focus flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-medium leading-tight',
                    isActive
                      ? 'bg-[var(--rf-orange-100)] text-[var(--rf-text-accent-strong)]'
                      : 'text-[var(--rf-orange-600)]'
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
  if (path.startsWith('/builder')) return 'Builder'
  if (path.startsWith('/field')) return 'Field App'
  if (path.startsWith('/review')) return 'Admin Review & Export'
  if (path.startsWith('/employees')) return 'Employees'
  if (path.startsWith('/groups')) return 'Employees'
  return 'Wolsey Tech Tracking System'
}

function formatTime(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
