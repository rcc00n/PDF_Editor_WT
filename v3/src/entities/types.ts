export type Id = string

export type FormStatus = 'draft' | 'active' | 'archived'
export type SyncState = 'offline_only' | 'synced' | 'has_queue' | 'failed' | 'unknown'

export type FieldType = 'text' | 'numeric' | 'checkbox' | 'date' | 'signature' | 'photo' | 'employee' | 'select' | 'radio'

export type Validation =
  | { kind: 'none' }
  | { kind: 'range'; min: number; max: number }
  | { kind: 'regex'; pattern: string }

export type Field = {
  id: Id
  type: FieldType
  label: string
  key: string
  required: boolean
  hint?: string
  helpText?: string
  fontSize?: number
  maxLength?: number
  options?: string[]
  autoValue?: 'today' | 'creator'
  readOnly?: boolean
  validation: Validation
  page: number
  // normalized 0..1 relative to page box
  x: number
  y: number
  w: number
  h: number
}

export type Employee = {
  id: Id
  name: string
  email?: string
  role?: string
  phone?: string
  active: boolean
}

export type AccessGroup = {
  id: Id
  name: string
  description?: string
  employeeIds: Id[]
  formIds: Id[]
}

export type FormVersion = {
  id: Id
  version: string
  status: FormStatus
  fieldCount: number
  publishedAt?: string
  canvas?: {
    width: number
    height: number
  }
  pdf?: {
    name: string
    mime: string
    dataUrl?: string // base64 data url (demo)
    url?: string // API media URL
  }
  fields: Field[]
}

export type FormTemplate = {
  id: Id
  name: string
  subtitle?: string
  versions: FormVersion[]
}

export type TicketStatus = 'pending' | 'in_progress' | 'synced' | 'error' | 'queued'

export type Ticket = {
  id: Id // FT-xxxx
  title: string
  formId: Id
  versionId: Id
  assignedTo: string
  assignedAt: string // ISO
  status: TicketStatus
  approvalState: 'pending' | 'approved'
  values: Record<string, any>
  attachments: Array<{ id: Id; name: string; mime: string; dataUrl?: string; url?: string }>
  signature?: { signer: string; dataUrl?: string; url?: string }
  lastError?: string
  updatedAt: string // ISO
}

export type QueueStatus = 'pending' | 'in_progress' | 'failed' | 'synced'

export type QueueItem = {
  id: Id
  type: 'submit_ticket' | 'update_ticket' | 'upload_attachment'
  ticketId: Id
  createdAt: string
  status: QueueStatus
  attempts: number
  lastError?: string
}

export type Activity = {
  id: Id
  at: string
  title: string
  subtitle?: string
}

export type OnlineSource = 'system' | 'user'
