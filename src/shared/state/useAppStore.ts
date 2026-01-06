import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Activity, FormTemplate, FormVersion, Id, QueueItem, Ticket } from '@/entities/types'
import { nowIso, uid, nextTicketId } from '@/shared/lib/ids'
import { clamp } from '@/shared/lib/math'

export type Theme = 'light' | 'dark'

export type Toast = {
  id: Id
  title: string
  message?: string
  variant?: 'default' | 'success' | 'warning' | 'danger'
  createdAt: string
}

type State = {
  booted: boolean

  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void

  systemOnline: boolean
  forcedOffline: boolean
  online: boolean
  setForcedOffline: (v: boolean) => void
  setSystemOnline: (v: boolean) => void

  forms: FormTemplate[]
  tickets: Ticket[]
  queue: QueueItem[]
  activities: Activity[]
  lastSyncSuccess?: string

  toasts: Toast[]
  pushToast: (t: Omit<Toast, 'id' | 'createdAt'>) => void
  dismissToast: (id: Id) => void

  boot: () => void

  // Forms
  createForm: (name: string) => Id
  createVersion: (formId: Id) => Id
  renameForm: (formId: Id, name: string) => void
  setPdf: (formId: Id, versionId: Id, pdf: FormVersion['pdf']) => void
  publishVersion: (formId: Id, versionId: Id) => void
  archiveForm: (formId: Id) => void

  // Builder fields
  upsertField: (formId: Id, versionId: Id, field: FormVersion['fields'][number]) => void
  deleteField: (formId: Id, versionId: Id, fieldId: Id) => void

  // Tickets
  createTicket: (formId: Id, versionId: Id, title: string, assignedTo: string) => Id
  updateTicket: (ticketId: Id, patch: Partial<Ticket>) => void
  saveDraft: (ticketId: Id) => void
  submitTicket: (ticketId: Id) => void
  approveTicket: (ticketId: Id) => void

  // Queue
  retryFailed: () => void
  markQueueItem: (queueItemId: Id, status: QueueItem['status'], err?: string) => void
  markSynced: (ticketId: Id) => void
  recordSyncSuccess: () => void

  // Activity
  addActivity: (title: string, subtitle?: string) => void
}

export const useAppStore = create<State>()(
  persist(
    (set, get) => ({
      booted: false,

      theme: (localStorage.getItem('rf_theme') as Theme) || 'dark',
      setTheme: (theme) => {
        localStorage.setItem('rf_theme', theme)
        document.documentElement.classList.toggle('dark', theme === 'dark')
        set({ theme })
      },
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        get().setTheme(next)
      },

      systemOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      forcedOffline: false,
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,

      setForcedOffline: (v) => {
        const systemOnline = get().systemOnline
        set({ forcedOffline: v, online: v ? false : systemOnline })
        get().pushToast({
          title: v ? 'Offline режим включён' : 'Offline режим выключён',
          message: v ? 'Изменения будут попадать в очередь синка.' : 'Синк восстановится автоматически.',
          variant: v ? 'warning' : 'success'
        })
      },

      setSystemOnline: (v) => {
        const forcedOffline = get().forcedOffline
        set({ systemOnline: v, online: forcedOffline ? false : v })
      },

      forms: [],
      tickets: [],
      queue: [],
      activities: [],
      lastSyncSuccess: undefined,

      toasts: [],
      pushToast: (t) =>
        set((s) => ({
          toasts: [
            ...s.toasts,
            { id: uid('toast'), createdAt: nowIso(), variant: 'default', ...t }
          ].slice(-4)
        })),
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),

      boot: () => {
        // sync theme on boot
        const theme = get().theme
        document.documentElement.classList.toggle('dark', theme === 'dark')
        set({ booted: true })
      },

      createForm: (name) => {
        const id = uid('form')
        const vId = uid('ver')
        const version: FormVersion = {
          id: vId,
          version: 'v1.0',
          status: 'draft',
          fieldCount: 0,
          fields: []
        }
        set((s) => ({
          forms: [
            { id, name, subtitle: 'PDF locked | Schema v1.0', versions: [version] },
            ...s.forms
          ]
        }))
        get().addActivity('Создан шаблон формы', name)
        return id
      },

      createVersion: (formId) => {
        const vId = uid('ver')
        set((s) => {
          const forms = s.forms.map((f) => {
            if (f.id !== formId) return f
            const latest = f.versions[0]
            const next = bumpVersion(latest?.version ?? 'v1.0')
            const newV: FormVersion = {
              id: vId,
              version: next,
              status: 'draft',
              fieldCount: 0,
              fields: latest ? latest.fields.map((x) => ({ ...x, id: uid('fld') })) : []
            }
            newV.fieldCount = newV.fields.length
            return { ...f, versions: [newV, ...f.versions] }
          })
          return { forms }
        })
        get().addActivity('Создана новая версия', `Form ${formId} → ${vId}`)
        return vId
      },

      renameForm: (formId, name) =>
        set((s) => ({ forms: s.forms.map((f) => (f.id === formId ? { ...f, name } : f)) })),

      setPdf: (formId, versionId, pdf) =>
        set((s) => ({
          forms: s.forms.map((f) => {
            if (f.id !== formId) return f
            return {
              ...f,
              versions: f.versions.map((v) => (v.id === versionId ? { ...v, pdf } : v))
            }
          })
        })),

      publishVersion: (formId, versionId) => {
        set((s) => ({
          forms: s.forms.map((f) => {
            if (f.id !== formId) return f
            return {
              ...f,
              versions: f.versions.map((v) => {
                if (v.id === versionId) return { ...v, status: 'active', publishedAt: nowIso() }
                // keep older active versions as archived (demo behavior)
                if (v.status === 'active') return { ...v, status: 'archived' }
                return v
              })
            }
          })
        }))
        const form = get().forms.find((f) => f.id === formId)
        const v = form?.versions.find((x) => x.id === versionId)
        get().addActivity('Опубликована версия', `${form?.name ?? formId} ${v?.version ?? ''}`)
        get().pushToast({ title: 'Версия опубликована', message: 'Готово для Field App', variant: 'success' })
      },

      archiveForm: (formId) => {
        set((s) => ({
          forms: s.forms.map((f) =>
            f.id === formId
              ? { ...f, versions: f.versions.map((v) => ({ ...v, status: 'archived' })) }
              : f
          )
        }))
        get().addActivity('Форма архивирована', formId)
      },

      upsertField: (formId, versionId, field) => {
        set((s) => ({
          forms: s.forms.map((f) => {
            if (f.id !== formId) return f
            return {
              ...f,
              versions: f.versions.map((v) => {
                if (v.id !== versionId) return v
                const exists = v.fields.some((x) => x.id === field.id)
                const fields = exists
                  ? v.fields.map((x) => (x.id === field.id ? field : x))
                  : [...v.fields, field]
                return { ...v, fields, fieldCount: fields.length }
              })
            }
          })
        }))
      },

      deleteField: (formId, versionId, fieldId) => {
        set((s) => ({
          forms: s.forms.map((f) => {
            if (f.id !== formId) return f
            return {
              ...f,
              versions: f.versions.map((v) => {
                if (v.id !== versionId) return v
                const fields = v.fields.filter((x) => x.id !== fieldId)
                return { ...v, fields, fieldCount: fields.length }
              })
            }
          })
        }))
      },

      createTicket: (formId, versionId, title, assignedTo) => {
        const id = nextTicketId(get().tickets)
        const t: Ticket = {
          id,
          title,
          formId,
          versionId,
          assignedTo,
          assignedAt: nowIso(),
          status: 'pending',
          approvalState: 'pending',
          values: {},
          attachments: [],
          updatedAt: nowIso()
        }
        set((s) => ({ tickets: [t, ...s.tickets] }))
        get().addActivity('Создан тикет', `${id} · ${title}`)
        return id
      },

      updateTicket: (ticketId, patch) => {
        set((s) => ({
          tickets: s.tickets.map((t) =>
            t.id === ticketId ? { ...t, ...patch, updatedAt: nowIso() } : t
          )
        }))
      },

      saveDraft: (ticketId) => {
        get().updateTicket(ticketId, { status: 'queued' })
        get().pushToast({ title: 'Черновик сохранён', message: 'Локально на устройстве', variant: 'success' })
      },

      submitTicket: (ticketId) => {
        const online = get().online
        const qId = uid('q')
        const qi: QueueItem = {
          id: qId,
          type: 'submit_ticket',
          ticketId,
          createdAt: nowIso(),
          status: online ? 'in_progress' : 'pending',
          attempts: 0
        }
        set((s) => ({ queue: [qi, ...s.queue] }))
        get().updateTicket(ticketId, { status: online ? 'in_progress' : 'queued' })
        get().addActivity('Тикет отправлен', `${ticketId} → очередь синка`)
        get().pushToast({
          title: online ? 'Отправка началась' : 'Отправлено в очередь',
          message: online ? 'Синк выполняется…' : 'Уйдёт автоматически при появлении сети.',
          variant: online ? 'default' : 'warning'
        })
      },


      approveTicket: (ticketId) => {
        get().updateTicket(ticketId, { approvalState: 'approved' })
        get().addActivity('Approved & Archived', ticketId)
        get().pushToast({ title: 'Approved', message: `${ticketId} archived`, variant: 'success' })
      },

      retryFailed: () => {
        set((s) => ({
          queue: s.queue.map((q) => (q.status === 'failed' ? { ...q, status: 'pending' } : q))
        }))
        get().pushToast({ title: 'Retry запущен', message: 'Failed элементы вернулись в Pending', variant: 'success' })
      },

      markQueueItem: (queueItemId, status, err) => {
        set((s) => ({
          queue: s.queue.map((q) => {
            if (q.id !== queueItemId) return q
            const attempts = status === 'failed' ? q.attempts + 1 : q.attempts
            return { ...q, status, attempts, lastError: err }
          })
        }))
      },

      markSynced: (ticketId) => {
        get().updateTicket(ticketId, { status: 'synced', lastError: undefined })
        get().addActivity('Синк завершён', ticketId)
      },

      recordSyncSuccess: () => set({ lastSyncSuccess: nowIso() }),

      addActivity: (title, subtitle) => {
        const a: Activity = { id: uid('act'), at: nowIso(), title, subtitle }
        set((s) => ({ activities: [a, ...s.activities].slice(0, 30) }))
      }
    }),
    {
      name: 'rf_store_v1',
      partialize: (s) => ({
        theme: s.theme,
        systemOnline: s.systemOnline,
        forcedOffline: s.forcedOffline,
        online: s.online,
        forms: s.forms,
        tickets: s.tickets,
        queue: s.queue,
        activities: s.activities,
        lastSyncSuccess: s.lastSyncSuccess
      })
    }
  )
)

function bumpVersion(v: string) {
  const m = v.match(/v(\d+)\.(\d+)/i)
  if (!m) return 'v1.0'
  const major = clamp(parseInt(m[1], 10), 0, 99)
  const minor = clamp(parseInt(m[2], 10), 0, 99)
  return `v${major}.${minor + 1}`
}
