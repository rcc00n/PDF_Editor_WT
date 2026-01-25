import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from './Modal'
import Input from './Input'
import Kbd from './Kbd'
import { useAppStore } from '@/shared/state/useAppStore'
import { Search, Plus, LayoutGrid, PencilRuler, Smartphone, ClipboardCheck, Shield, User, LogOut, Users } from 'lucide-react'

type Action = {
  id: string
  title: string
  subtitle?: string
  icon?: any
  run: () => void | Promise<void>
  keywords?: string
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const nav = useNavigate()

  const role = useAppStore(s => s.role)
  const setRole = useAppStore(s => s.setRole)
  const apiEnabled = useAppStore(s => s.apiEnabled)
  const logout = useAppStore(s => s.logout)
  const createForm = useAppStore(s => s.createForm)

  const isAdmin = role === 'admin'

  useEffect(() => {
    const onOpen = () => setOpen(true)
    const onClose = () => setOpen(false)
    window.addEventListener('rf:command:open', onOpen as any)
    window.addEventListener('rf:command:close', onClose as any)
    return () => {
      window.removeEventListener('rf:command:open', onOpen as any)
      window.removeEventListener('rf:command:close', onClose as any)
    }
  }, [])

  useEffect(() => {
    if (!open) setQ('')
  }, [open])

  const actions: Action[] = useMemo(() => {
    const base: Action[] = [
      { id: 'dash', title: 'Dashboard', subtitle: 'Overview and activity', icon: LayoutGrid, run: () => nav('/dashboard') },
      { id: 'builder', title: 'Builder', subtitle: 'Templates and versions', icon: PencilRuler, run: () => nav('/builder') },
      { id: 'field', title: 'Field App', subtitle: 'Offline tickets', icon: Smartphone, run: () => nav('/field') },
      { id: 'review', title: 'Admin Review', subtitle: 'Preview and export', icon: ClipboardCheck, run: () => nav('/review') }
    ]

    if (!apiEnabled) {
      base.splice(5, 0, {
        id: 'role',
        title: isAdmin ? 'Switch to worker' : 'Switch to admin',
        subtitle: isAdmin ? 'Limit access to form creation' : 'Full template access',
        icon: isAdmin ? User : Shield,
        run: () => setRole(isAdmin ? 'worker' : 'admin'),
        keywords: 'role admin worker access'
      })
    }

    if (isAdmin) {
      base.splice(apiEnabled ? 5 : 6, 0, {
        id: 'new',
        title: 'Create new form',
        subtitle: 'Start a template from scratch',
        icon: Plus,
        run: async () => {
          const name = window.prompt('Form name (optional). Leave blank for auto name.', '')
          if (name === null) return
          const id = await createForm(name)
          nav(`/builder/${id}`)
          setOpen(false)
        },
        keywords: 'create new form template builder'
      })
      base.splice(apiEnabled ? 6 : 7, 0, {
        id: 'employees',
        title: 'Employees',
        subtitle: 'Staff directory and imports',
        icon: Users,
        run: () => nav('/employees'),
        keywords: 'employees staff team directory'
      })
      base.splice(apiEnabled ? 7 : 8, 0, {
        id: 'groups',
        title: 'Groups',
        subtitle: 'Access group assignments',
        icon: Users,
        run: () => nav('/groups'),
        keywords: 'groups access forms permissions'
      })
    }

    if (apiEnabled) {
      base.push({
        id: 'logout',
        title: 'Sign out',
        subtitle: 'End current session',
        icon: LogOut,
        run: () => logout(),
        keywords: 'logout sign out session'
      })
    }

    return base
  }, [nav, createForm, isAdmin, setRole, apiEnabled, logout])

  const filtered = actions.filter((a) => {
    const s = (a.title + ' ' + (a.subtitle ?? '') + ' ' + (a.keywords ?? '')).toLowerCase()
    return s.includes(q.trim().toLowerCase())
  })

  return (
    <Modal open={open} onClose={() => setOpen(false)} title={undefined} className="max-w-2xl">
      <div className="flex items-center gap-2">
        <Search size={18} className="text-neutral-500" />
        <Input
          autoFocus
          placeholder="Search commands…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Kbd>Esc</Kbd>
      </div>

      <div className="mt-3 max-h-[50vh] overflow-auto rf-scrollbar rounded-2xl border border-neutral-200 dark:border-neutral-800">
        {filtered.map((a) => {
          const Icon = a.icon
          return (
            <button
              key={a.id}
              className="rf-focus w-full text-left px-3 py-3 flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-900"
              onClick={() => {
                const result = a.run()
                if (result && typeof (result as Promise<void>).finally === 'function') {
                  ;(result as Promise<void>).finally(() => setOpen(false))
                  return
                }
                setOpen(false)
              }}
            >
              <div className="h-9 w-9 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-center">
                {Icon ? <Icon size={18} /> : null}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold">{a.title}</div>
                {a.subtitle && <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{a.subtitle}</div>}
              </div>
            </button>
          )
        })}
        {filtered.length === 0 && (
          <div className="px-3 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
            No results found
          </div>
        )}
      </div>

      <div className="mt-3 text-xs text-neutral-500 dark:text-neutral-400 flex items-center justify-between">
        <div>Ctrl/⌘ + K</div>
        <div>Enter</div>
      </div>
    </Modal>
  )
}
