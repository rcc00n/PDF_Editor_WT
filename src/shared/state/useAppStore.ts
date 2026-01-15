import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Activity, AccessGroup, Employee, FormTemplate, FormVersion, Id, QueueItem, Ticket } from '@/entities/types'
import { nowIso, uid, nextTicketId } from '@/shared/lib/ids'
import { clamp } from '@/shared/lib/math'
import { API_ENABLED } from '@/shared/api/config'
import { apiFetch, apiJson, clearStoredTokens, getStoredAccessToken, getStoredRefreshToken, storeTokens } from '@/shared/api/client'

export type Theme = 'default' | 'slate' | 'ocean' | 'meadow'
export type UserRole = 'admin' | 'worker'
export type AuthStatus = 'unknown' | 'authenticated' | 'unauthenticated'

export type UserProfile = {
  email: string
  role: UserRole
}

export type Toast = {
  id: Id
  title: string
  message?: string
  variant?: 'default' | 'success' | 'warning' | 'danger'
  createdAt: string
}

export type OfflineFormMeta = {
  versionId: Id
  downloadedAt: string
}

const memoryStorage = new Map<string, string>()

const safeStorage = {
  getItem: (name: string) => {
    try {
      return localStorage.getItem(name) ?? memoryStorage.get(name) ?? null
    } catch {
      return memoryStorage.get(name) ?? null
    }
  },
  setItem: (name: string, value: string) => {
    try {
      localStorage.setItem(name, value)
    } catch {
      memoryStorage.set(name, value)
    }
  },
  removeItem: (name: string) => {
    try {
      localStorage.removeItem(name)
    } catch {
      memoryStorage.delete(name)
    }
  }
}

const THEME_CLASSES: Record<Theme, string | null> = {
  default: null,
  slate: 'theme-slate',
  ocean: 'theme-ocean',
  meadow: 'theme-meadow'
}

function normalizeTheme(value: string | null): Theme {
  if (!value) return 'default'
  if (value === 'light' || value === 'planet') return 'default'
  if (value === 'slate' || value === 'ocean' || value === 'meadow' || value === 'default') {
    return value
  }
  return 'default'
}

function getStoredTheme(): Theme {
  try {
    return normalizeTheme(localStorage.getItem('rf_theme'))
  } catch {
    return normalizeTheme(memoryStorage.get('rf_theme') ?? null)
  }
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.remove('dark')
  root.classList.remove('theme-planet')
  Object.values(THEME_CLASSES).forEach((cls) => {
    if (cls) root.classList.remove(cls)
  })
  const nextClass = THEME_CLASSES[theme]
  if (nextClass) root.classList.add(nextClass)
}

function upsertById<T extends { id: string }>(items: T[], next: T) {
  const idx = items.findIndex((i) => i.id === next.id)
  if (idx === -1) return [next, ...items]
  const copy = items.slice()
  copy[idx] = next
  return copy
}

function defaultFormName(forms: FormTemplate[]) {
  const existing = new Set(forms.map((f) => f.name.trim().toLowerCase()))
  let idx = Math.max(1, forms.length + 1)
  let name = `Form ${idx}`
  while (existing.has(name.toLowerCase())) {
    idx += 1
    name = `Form ${idx}`
  }
  return name
}

function normalizeFormName(name: string | undefined, forms: FormTemplate[]) {
  const trimmed = (name ?? '').trim()
  if (trimmed) return trimmed
  return defaultFormName(forms)
}

type State = {
  booted: boolean
  apiEnabled: boolean
  authStatus: AuthStatus
  user?: UserProfile
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void

  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  role: UserRole
  setRole: (role: UserRole) => void
  initAuth: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshRemote: () => Promise<void>

  systemOnline: boolean
  forcedOffline: boolean
  online: boolean
  setForcedOffline: (v: boolean) => void
  setSystemOnline: (v: boolean) => void

  forms: FormTemplate[]
  tickets: Ticket[]
  queue: QueueItem[]
  activities: Activity[]
  employees: Employee[]
  groups: AccessGroup[]
  offlineForms: Record<Id, OfflineFormMeta>
  lastSyncSuccess?: string

  toasts: Toast[]
  pushToast: (t: Omit<Toast, 'id' | 'createdAt'>) => void
  dismissToast: (id: Id) => void

  boot: () => void

  // Forms
  createForm: (name?: string) => Promise<Id>
  createVersion: (formId: Id) => Promise<Id>
  renameForm: (formId: Id, name: string) => Promise<void>
  setPdf: (formId: Id, versionId: Id, pdf: FormVersion['pdf']) => void
  setCanvasSize: (formId: Id, versionId: Id, canvas: NonNullable<FormVersion['canvas']>) => void
  uploadPdf: (formId: Id, versionId: Id, file: File) => Promise<void>
  publishVersion: (formId: Id, versionId: Id) => Promise<void>
  archiveForm: (formId: Id) => Promise<void>
  downloadFormForOffline: (formId: Id) => Promise<void>
  removeOfflineForm: (formId: Id) => void

  // Builder fields
  upsertField: (formId: Id, versionId: Id, field: FormVersion['fields'][number]) => Promise<void>
  deleteField: (formId: Id, versionId: Id, fieldId: Id) => Promise<void>

  // Tickets
  createTicket: (formId: Id, versionId: Id, title: string, assignedTo: string) => Promise<Id>
  updateTicket: (ticketId: Id, patch: Partial<Ticket>) => void
  saveDraft: (ticketId: Id) => Promise<void>
  submitTicket: (ticketId: Id) => Promise<void>
  approveTicket: (ticketId: Id) => Promise<void>
  uploadAttachment: (ticketId: Id, file: File) => Promise<void>
  uploadSignature: (ticketId: Id, dataUrl: string, signer: string) => Promise<void>

  // Queue
  retryFailed: () => void
  markQueueItem: (queueItemId: Id, status: QueueItem['status'], err?: string) => void
  markSynced: (ticketId: Id) => void
  recordSyncSuccess: () => void

  // Activity
  addActivity: (title: string, subtitle?: string) => void

  // Employees
  createEmployee: (payload: Omit<Employee, 'id'>) => Promise<Id>
  updateEmployee: (employeeId: Id, patch: Partial<Employee>) => Promise<void>
  deleteEmployee: (employeeId: Id) => Promise<void>
  importEmployees: (employees: Employee[]) => Promise<void>

  // Groups
  createGroup: (payload: Omit<AccessGroup, 'id'>) => Promise<Id>
  updateGroup: (groupId: Id, patch: Partial<AccessGroup>) => Promise<void>
  deleteGroup: (groupId: Id) => Promise<void>
}

export const useAppStore = create<State>()(
  persist(
    (set, get) => ({
      booted: false,
      apiEnabled: API_ENABLED,
      authStatus: API_ENABLED ? 'unknown' : 'authenticated',
      user: undefined,
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      theme: getStoredTheme(),
      setTheme: (theme) => {
        try {
          localStorage.setItem('rf_theme', theme)
        } catch {
          memoryStorage.set('rf_theme', theme)
        }
        applyTheme(theme)
        set({ theme })
      },
      toggleTheme: () => {
        const order: Theme[] = ['default', 'slate', 'ocean', 'meadow']
        const current = get().theme
        const idx = order.indexOf(current)
        const next = order[(idx + 1) % order.length]
        get().setTheme(next)
      },
      role: 'admin',
      setRole: (role) => {
        if (API_ENABLED) return
        set({ role })
      },
      initAuth: async () => {
        if (!API_ENABLED) return
        const hasToken = getStoredAccessToken() || getStoredRefreshToken()
        if (!hasToken) {
          clearStoredTokens()
          set({ authStatus: 'unauthenticated', user: undefined })
          return
        }
        try {
          const me = await apiJson('/auth/me/')
          set({ authStatus: 'authenticated', user: me, role: me.role })
          await get().refreshRemote()
        } catch {
          clearStoredTokens()
          set({ authStatus: 'unauthenticated', user: undefined })
        }
      },
      login: async (email, password) => {
        if (!API_ENABLED) return
        const data = await apiJson('/auth/token/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: email, password })
        }, false)
        storeTokens(data.access, data.refresh)
        const me = await apiJson('/auth/me/')
        set({ authStatus: 'authenticated', user: me, role: me.role })
        await get().refreshRemote()
      },
      logout: () => {
        clearStoredTokens()
        set({
          authStatus: API_ENABLED ? 'unauthenticated' : 'authenticated',
          user: undefined,
          role: 'worker',
          forms: [],
          tickets: [],
          queue: [],
          activities: [],
          employees: [],
          groups: [],
          offlineForms: {},
          lastSyncSuccess: undefined
        })
      },
      refreshRemote: async () => {
        if (!API_ENABLED) return
        const [forms, tickets, employees] = await Promise.all([
          apiJson('/forms/'),
          apiJson('/tickets/'),
          apiJson('/employees/')
        ])
        let groups: AccessGroup[] = []
        try {
          groups = await apiJson('/groups/')
        } catch {
          groups = []
        }
        const canvasByVersion = new Map<string, FormVersion['canvas']>()
        const pdfDataByVersion = new Map<string, string>()
        for (const f of get().forms) {
          for (const v of f.versions) {
            if (v.canvas) canvasByVersion.set(v.id, v.canvas)
            if (v.pdf?.dataUrl) pdfDataByVersion.set(v.id, v.pdf.dataUrl)
          }
        }
        const mergedForms = forms.map((f: FormTemplate) => ({
          ...f,
          versions: f.versions.map((v) => ({
            ...v,
            canvas: canvasByVersion.get(v.id),
            pdf: v.pdf ? { ...v.pdf, dataUrl: pdfDataByVersion.get(v.id) ?? v.pdf.dataUrl } : v.pdf
          }))
        }))
        set({ forms: mergedForms, tickets, employees, groups, queue: [], activities: [], lastSyncSuccess: undefined })
      },

      systemOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      forcedOffline: false,
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,

      setForcedOffline: (v) => {
        const systemOnline = get().systemOnline
        set({ forcedOffline: v, online: v ? false : systemOnline })
        get().pushToast({
          title: v ? 'Offline mode enabled' : 'Offline mode disabled',
          message: v ? 'Changes will be queued for sync.' : 'Sync will resume automatically.',
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
      employees: [],
      groups: [],
      offlineForms: {},
      lastSyncSuccess: undefined,

      toasts: [],
      pushToast: (t) =>
        set((s) => {
          const toast: Toast = {
            id: uid('toast'),
            createdAt: nowIso(),
            title: t.title,
            message: t.message,
            variant: t.variant ?? 'default'
          }
          return { toasts: [...s.toasts, toast].slice(-4) }
        }),
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),

      boot: () => {
        // sync theme on boot
        applyTheme(get().theme)
        set({ booted: true })
      },

      createForm: async (name) => {
        const safeName = normalizeFormName(name, get().forms)
        if (API_ENABLED) {
          const form = await apiJson('/forms/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: safeName })
          })
          set((s) => ({ forms: upsertById(s.forms, form) }))
          get().addActivity('Form template created', safeName)
          return form.id
        }
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
            { id, name: safeName, subtitle: 'PDF locked | Schema v1.0', versions: [version] },
            ...s.forms
          ]
        }))
        get().addActivity('Form template created', safeName)
        return id
      },

      createVersion: async (formId) => {
        if (API_ENABLED) {
          const form = await apiJson(`/forms/${formId}/versions/`, { method: 'POST' })
          set((s) => ({ forms: upsertById(s.forms, form) }))
          const latest = form.versions?.[0]
          if (latest) get().addActivity('New version created', `${formId} → ${latest.id}`)
          return latest?.id ?? formId
        }
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
              fields: latest ? latest.fields.map((x) => ({ ...x, id: uid('fld') })) : [],
              canvas: latest?.canvas,
              pdf: latest?.pdf ? { ...latest.pdf } : undefined
            }
            newV.fieldCount = newV.fields.length
            return { ...f, versions: [newV, ...f.versions] }
          })
          return { forms }
        })
        get().addActivity('New version created', `Form ${formId} → ${vId}`)
        return vId
      },

      renameForm: async (formId, name) => {
        if (API_ENABLED) {
          const form = await apiJson(`/forms/${formId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
          })
          set((s) => ({ forms: upsertById(s.forms, form) }))
          return
        }
        set((s) => ({ forms: s.forms.map((f) => (f.id === formId ? { ...f, name } : f)) }))
      },

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

      setCanvasSize: (formId, versionId, canvas) =>
        set((s) => ({
          forms: s.forms.map((f) => {
            if (f.id !== formId) return f
            return {
              ...f,
              versions: f.versions.map((v) => (v.id === versionId ? { ...v, canvas } : v))
            }
          })
        })),

      uploadPdf: async (formId, versionId, file) => {
        const formData = new FormData()
        formData.append('file', file)
        const res = await apiFetch(`/forms/${formId}/versions/${versionId}/pdf/`, { method: 'POST', body: formData })
        if (!res.ok) {
          const msg = (await res.text()) || 'PDF upload failed'
          throw new Error(msg)
        }
        const form = await res.json()
        set((s) => ({ forms: upsertById(s.forms, form) }))
      },

      publishVersion: async (formId, versionId) => {
        if (API_ENABLED) {
          const form = await apiJson(`/forms/${formId}/versions/${versionId}/publish/`, { method: 'POST' })
          set((s) => ({ forms: upsertById(s.forms, form) }))
          get().pushToast({ title: 'Version published', message: 'Ready for Field App', variant: 'success' })
          return
        }
        const preForm = get().forms.find((f) => f.id === formId)
        const preVersion = preForm?.versions.find((v) => v.id === versionId)
        const wasArchived = preVersion?.status === 'archived'
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
        const activityTitle = wasArchived ? 'Version rolled back' : 'Version published'
        const toastTitle = wasArchived ? 'Rollback completed' : 'Version published'
        const toastMessage = wasArchived ? 'Older version is now active' : 'Ready for Field App'
        get().addActivity(activityTitle, `${form?.name ?? formId} ${v?.version ?? ''}`)
        get().pushToast({ title: toastTitle, message: toastMessage, variant: 'success' })
      },

      archiveForm: async (formId) => {
        if (API_ENABLED) {
          const form = await apiJson(`/forms/${formId}/archive/`, { method: 'POST' })
          set((s) => ({ forms: upsertById(s.forms, form) }))
          get().addActivity('Form archived', formId)
          return
        }
        set((s) => ({
          forms: s.forms.map((f) =>
            f.id === formId
              ? { ...f, versions: f.versions.map((v) => ({ ...v, status: 'archived' })) }
              : f
          )
        }))
        get().addActivity('Form archived', formId)
      },

      downloadFormForOffline: async (formId) => {
        const form = get().forms.find((f) => f.id === formId)
        if (!form) throw new Error('Form not found')
        const version = form.versions.find((v) => v.status === 'active') ?? form.versions[0]
        if (!version) throw new Error('No version available')

        const needsPdfFetch = Boolean(version.pdf?.url && !version.pdf?.dataUrl)
        if (needsPdfFetch && !get().online) {
          throw new Error('Connect to the internet to download this PDF')
        }

        let pdfDataUrl = version.pdf?.dataUrl
        if (needsPdfFetch && version.pdf?.url) {
          const token = getStoredAccessToken()
          const headers = token ? { Authorization: `Bearer ${token}` } : undefined
          const res = await fetch(version.pdf.url, { headers })
          if (!res.ok) throw new Error('Unable to download PDF')
          const blob = await res.blob()
          pdfDataUrl = await blobToDataUrl(blob)
        }

        set((s) => ({
          forms: s.forms.map((f) => {
            if (f.id !== formId) return f
            return {
              ...f,
              versions: f.versions.map((v) => {
                if (v.id !== version.id) return v
                if (!v.pdf) return v
                return { ...v, pdf: { ...v.pdf, dataUrl: pdfDataUrl ?? v.pdf.dataUrl } }
              })
            }
          }),
          offlineForms: {
            ...s.offlineForms,
            [formId]: { versionId: version.id, downloadedAt: nowIso() }
          }
        }))

        const hasPdf = Boolean(version.pdf?.url || version.pdf?.dataUrl)
        get().pushToast({
          title: 'Offline download ready',
          message: hasPdf ? `${form.name} saved on this device.` : `${form.name} saved (no PDF attached).`,
          variant: hasPdf ? 'success' : 'warning'
        })
      },

      removeOfflineForm: (formId) => {
        const form = get().forms.find((f) => f.id === formId)
        const meta = get().offlineForms[formId]
        set((s) => {
          const { [formId]: _, ...rest } = s.offlineForms
          const forms = meta
            ? s.forms.map((f) => {
                if (f.id !== formId) return f
                return {
                  ...f,
                  versions: f.versions.map((v) => {
                    if (v.id !== meta.versionId) return v
                    if (!v.pdf?.dataUrl) return v
                    return { ...v, pdf: { ...v.pdf, dataUrl: undefined } }
                  })
                }
              })
            : s.forms
          return { offlineForms: rest, forms }
        })
        if (form) {
          get().pushToast({
            title: 'Offline copy removed',
            message: `${form.name} removed from this device.`,
            variant: 'warning'
          })
        }
      },

      upsertField: async (formId, versionId, field) => {
        if (API_ENABLED) {
          const form = await apiJson(`/forms/${formId}/versions/${versionId}/fields/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ field })
          })
          set((s) => ({ forms: upsertById(s.forms, form) }))
          return
        }
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

      deleteField: async (formId, versionId, fieldId) => {
        if (API_ENABLED) {
          const form = await apiJson(`/forms/${formId}/versions/${versionId}/fields/${fieldId}/`, { method: 'DELETE' })
          set((s) => ({ forms: upsertById(s.forms, form) }))
          return
        }
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

      createTicket: async (formId, versionId, title, assignedTo) => {
        const online = get().online
        if (API_ENABLED && online) {
          const ticket = await apiJson('/tickets/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ formId, versionId, title, assignedTo })
          })
          const nextTicket = { ...ticket, signatureRole: ticket.signatureRole ?? 'employee' }
          set((s) => ({ tickets: upsertById(s.tickets, nextTicket) }))
          get().addActivity('Ticket created', `${ticket.id} · ${ticket.title}`)
          return ticket.id
        }
        const id = nextTicketId(get().tickets)
        const t: Ticket = {
          id,
          serverId: undefined,
          localOnly: API_ENABLED && !online,
          title,
          formId,
          versionId,
          assignedTo,
          assignedAt: nowIso(),
          status: 'pending',
          approvalState: 'approved',
          values: {},
          attachments: [],
          signatureRole: 'employee',
          updatedAt: nowIso()
        }
        set((s) => ({ tickets: [t, ...s.tickets] }))
        get().addActivity('Ticket created', `${id} · ${title}`)
        return id
      },

      updateTicket: (ticketId, patch) => {
        set((s) => ({
          tickets: s.tickets.map((t) =>
            t.id === ticketId ? { ...t, ...patch, updatedAt: nowIso() } : t
          )
        }))
      },

      saveDraft: async (ticketId) => {
        const online = get().online
        get().updateTicket(ticketId, { status: 'queued' })
        if (API_ENABLED && online) {
          const t = get().tickets.find((x) => x.id === ticketId)
          if (t) {
            let remoteId = t.serverId ?? t.id
            if (t.localOnly && !t.serverId) {
              const created = await apiJson('/tickets/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  formId: t.formId,
                  versionId: t.versionId,
                  title: t.title,
                  assignedTo: t.assignedTo
                })
              })
              remoteId = created.id
              get().updateTicket(t.id, { serverId: created.id, localOnly: false })
            }

            const updated = await apiJson(`/tickets/${remoteId}/`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ values: t.values, signature: t.signature, status: 'queued' })
            })
            const { id: serverId, ...rest } = updated
            get().updateTicket(t.id, { ...rest, serverId })
          }
        }
        get().pushToast({ title: 'Draft saved', message: 'Saved locally on this device', variant: 'success' })
      },

      submitTicket: async (ticketId) => {
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
        get().addActivity('Ticket submitted', `${ticketId} → sync queue`)
        get().pushToast({
          title: online ? 'Sending started' : 'Queued for sync',
          message: online ? 'Sync in progress…' : 'Will sync automatically when back online.',
          variant: online ? 'default' : 'warning'
        })
      },


      approveTicket: async (ticketId) => {
        if (API_ENABLED) {
          const local = get().tickets.find((t) => t.id === ticketId)
          const remoteId = local?.serverId ?? ticketId
          const updated = await apiJson(`/tickets/${remoteId}/approve/`, { method: 'POST' })
          if (local) {
            const { id: serverId, ...rest } = updated
            get().updateTicket(local.id, { ...rest, serverId })
          } else {
            set((s) => ({ tickets: upsertById(s.tickets, updated) }))
          }
          get().addActivity('Approved & Archived', ticketId)
          get().pushToast({ title: 'Approved', message: `${ticketId} archived`, variant: 'success' })
          return
        }
        get().updateTicket(ticketId, { approvalState: 'approved' })
        get().addActivity('Approved & Archived', ticketId)
        get().pushToast({ title: 'Approved', message: `${ticketId} archived`, variant: 'success' })
      },

      uploadAttachment: async (ticketId, file) => {
        if (!API_ENABLED) return
        const local = get().tickets.find((t) => t.id === ticketId)
        const remoteId = local?.serverId ?? ticketId
        const formData = new FormData()
        formData.append('file', file)
        const res = await apiFetch(`/tickets/${remoteId}/attachments/`, { method: 'POST', body: formData })
        if (!res.ok) throw new Error('Attachment upload failed')
        const updated = await res.json()
        if (local) {
          const { id: serverId, ...rest } = updated
          get().updateTicket(local.id, { ...rest, serverId })
        } else {
          set((s) => ({ tickets: upsertById(s.tickets, updated) }))
        }
      },

      uploadSignature: async (ticketId, dataUrl, signer) => {
        if (!API_ENABLED) return
        const local = get().tickets.find((t) => t.id === ticketId)
        const remoteId = local?.serverId ?? ticketId
        const updated = await apiJson(`/tickets/${remoteId}/signature/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl, signer })
        })
        if (local) {
          const { id: serverId, ...rest } = updated
          get().updateTicket(local.id, { ...rest, serverId })
        } else {
          set((s) => ({ tickets: upsertById(s.tickets, updated) }))
        }
      },

      retryFailed: () => {
        set((s) => ({
          queue: s.queue.map((q) => (q.status === 'failed' ? { ...q, status: 'pending' } : q))
        }))
        get().pushToast({ title: 'Retry started', message: 'Failed items returned to Pending', variant: 'success' })
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
        get().updateTicket(ticketId, { status: 'synced', approvalState: 'approved', lastError: undefined })
        get().addActivity('Sync completed', ticketId)
      },

      recordSyncSuccess: () => set({ lastSyncSuccess: nowIso() }),

      addActivity: (title, subtitle) => {
        const a: Activity = { id: uid('act'), at: nowIso(), title, subtitle }
        set((s) => ({ activities: [a, ...s.activities].slice(0, 30) }))
      },

      createEmployee: async (payload) => {
        if (API_ENABLED) {
          const employee = await apiJson('/employees/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
          set((s) => ({ employees: upsertById(s.employees, employee) }))
          return employee.id
        }
        const id = uid('emp')
        const employee: Employee = { id, ...payload }
        set((s) => ({ employees: upsertById(s.employees, employee) }))
        return id
      },

      updateEmployee: async (employeeId, patch) => {
        if (API_ENABLED) {
          const employee = await apiJson(`/employees/${employeeId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch)
          })
          set((s) => ({ employees: upsertById(s.employees, employee) }))
          return
        }
        set((s) => ({
          employees: s.employees.map((e) => (e.id === employeeId ? { ...e, ...patch } : e))
        }))
      },

      deleteEmployee: async (employeeId) => {
        if (API_ENABLED) {
          await apiJson(`/employees/${employeeId}/`, { method: 'DELETE' })
        }
        set((s) => ({ employees: s.employees.filter((e) => e.id !== employeeId) }))
      },

      importEmployees: async (employees) => {
        if (API_ENABLED) {
          for (const e of employees) {
            if (e.id) {
              const { id, ...patch } = e
              try {
                await get().updateEmployee(e.id, patch)
              } catch {
                await get().createEmployee(patch)
              }
            } else {
              const { id, ...payload } = e
              await get().createEmployee(payload)
            }
          }
          return
        }
        set((s) => {
          const merged = s.employees.slice()
          for (const e of employees) {
            const id = e.id || uid('emp')
            const next: Employee = { ...e, id }
            const idx = merged.findIndex((x) => x.id === id)
            if (idx === -1) merged.push(next)
            else merged[idx] = next
          }
          return { employees: merged }
        })
      },

      createGroup: async (payload) => {
        if (API_ENABLED) {
          const group = await apiJson('/groups/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
          set((s) => ({ groups: upsertById(s.groups, group) }))
          return group.id
        }
        const id = uid('grp')
        const group: AccessGroup = {
          id,
          name: payload.name,
          description: payload.description ?? '',
          includeAllEmployees: payload.includeAllEmployees ?? false,
          includeAllForms: payload.includeAllForms ?? false,
          employeeIds: payload.employeeIds ?? [],
          formIds: payload.formIds ?? [],
          excludedEmployeeIds: payload.excludedEmployeeIds ?? [],
          excludedFormIds: payload.excludedFormIds ?? []
        }
        set((s) => ({ groups: upsertById(s.groups, group) }))
        return id
      },

      updateGroup: async (groupId, patch) => {
        if (API_ENABLED) {
          const group = await apiJson(`/groups/${groupId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch)
          })
          set((s) => ({ groups: upsertById(s.groups, group) }))
          return
        }
        set((s) => ({
          groups: s.groups.map((g) => (g.id === groupId ? { ...g, ...patch } : g))
        }))
      },

      deleteGroup: async (groupId) => {
        if (API_ENABLED) {
          await apiJson(`/groups/${groupId}/`, { method: 'DELETE' })
        }
        set((s) => ({ groups: s.groups.filter((g) => g.id !== groupId) }))
      }
    }),
    {
      name: 'rf_store_v1',
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({
        theme: s.theme,
        role: s.role,
        sidebarCollapsed: s.sidebarCollapsed,
        systemOnline: s.systemOnline,
        forcedOffline: s.forcedOffline,
        online: s.online,
        forms: s.forms,
        tickets: s.tickets,
        queue: s.queue,
        activities: s.activities,
        employees: s.employees,
        groups: s.groups,
        offlineForms: s.offlineForms,
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

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Unable to read file data'))
    reader.readAsDataURL(blob)
  })
}
