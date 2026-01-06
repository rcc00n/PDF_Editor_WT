import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from './Modal'
import Input from './Input'
import Kbd from './Kbd'
import { useAppStore } from '@/shared/state/useAppStore'
import { Search, Plus, LayoutGrid, FileText, Smartphone, RefreshCw, ClipboardCheck, Moon, Sun, WifiOff, Wifi } from 'lucide-react'

type Action = {
  id: string
  title: string
  subtitle?: string
  icon?: any
  run: () => void
  keywords?: string
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const nav = useNavigate()

  const toggleTheme = useAppStore(s => s.toggleTheme)
  const theme = useAppStore(s => s.theme)
  const forcedOffline = useAppStore(s => s.forcedOffline)
  const setForcedOffline = useAppStore(s => s.setForcedOffline)
  const createForm = useAppStore(s => s.createForm)

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

  const actions: Action[] = useMemo(() => [
    { id: 'dash', title: 'Dashboard', subtitle: 'Overview and activity', icon: LayoutGrid, run: () => nav('/dashboard') },
    { id: 'forms', title: 'Forms', subtitle: 'Templates and versions', icon: FileText, run: () => nav('/forms') },
    { id: 'field', title: 'Field App', subtitle: 'Offline tickets', icon: Smartphone, run: () => nav('/field') },
    { id: 'queue', title: 'Sync Queue', subtitle: 'Pending / failed mutations', icon: RefreshCw, run: () => nav('/queue') },
    { id: 'review', title: 'Admin Review', subtitle: 'Preview and export', icon: ClipboardCheck, run: () => nav('/review') },
    { id: 'new', title: 'Create new form', subtitle: 'Start a template from scratch', icon: Plus, run: () => {
      const id = createForm('New Form')
      nav(`/builder/${id}`)
    }, keywords: 'create new form template builder' },
    { id: 'theme', title: theme === 'dark' ? 'Switch to light' : 'Switch to dark', icon: theme === 'dark' ? Sun : Moon, run: () => toggleTheme(), keywords: 'theme dark light' },
    { id: 'offline', title: forcedOffline ? 'Disable offline simulation' : 'Enable offline simulation', icon: forcedOffline ? Wifi : WifiOff, run: () => setForcedOffline(!forcedOffline), keywords: 'offline online network' }
  ], [nav, createForm, theme, toggleTheme, forcedOffline, setForcedOffline])

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
                a.run()
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
            Ничего не найдено
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
