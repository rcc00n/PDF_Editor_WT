import { useAppStore } from './useAppStore'
import type { FormTemplate, Ticket, QueueItem, Activity, Field, Employee } from '@/entities/types'
import { nowIso, uid } from '@/shared/lib/ids'

export function seedIfEmpty() {
  const s = useAppStore.getState()
  if (s.forms.length > 0) return

  const form1Id = uid('form')
  const form2Id = uid('form')
  const form3Id = uid('form')
  const form4Id = uid('form')

  const v23 = uid('ver')
  const v18 = uid('ver')
  const v31 = uid('ver')
  const v20 = uid('ver')

  const fields: Field[] = [
    mkField('text', 'Site ID', 'site_id', 0.08, 0.18, 0.36, 0.055),
    mkField('date', 'Inspection Date', 'inspection_date', 0.52, 0.18, 0.36, 0.055),
    mkField('text', 'Technician', 'technician', 0.08, 0.30, 0.80, 0.055),
    mkField('numeric', 'Pressure Reading (psi)', 'pressure_reading', 0.08, 0.42, 0.46, 0.055, { kind: 'range', min: 0, max: 300 }),
    mkField('checkbox', 'Valve OK', 'valve_ok', 0.60, 0.42, 0.28, 0.055),
    mkField('text', 'Notes', 'notes', 0.08, 0.54, 0.80, 0.12),
    mkField('photo', 'Photo Attachment', 'photo', 0.08, 0.70, 0.80, 0.09),
    mkField('signature', 'Signature', 'signature', 0.08, 0.82, 0.80, 0.12)
  ]

  const forms: FormTemplate[] = [
    {
      id: form1Id,
      name: 'Pump Station Safety Inspection',
      subtitle: 'PDF locked | Schema v2.3',
      versions: [
        {
          id: v23,
          version: 'v2.3',
          status: 'active',
          fieldCount: fields.length,
          publishedAt: nowIso(),
          fields
        }
      ]
    },
    {
      id: form2Id,
      name: 'Fiber Splice Completion',
      subtitle: 'PDF locked | Schema v1.8',
      versions: [
        { id: v18, version: 'v1.8', status: 'active', fieldCount: 6, publishedAt: nowIso(), fields: [] }
      ]
    },
    {
      id: form3Id,
      name: 'Hazard Assessment - Urban Site',
      subtitle: 'PDF locked | Schema v3.1',
      versions: [
        { id: v31, version: 'v3.1', status: 'draft', fieldCount: 9, fields: [] }
      ]
    },
    {
      id: form4Id,
      name: 'Water Main Pressure Test',
      subtitle: 'PDF locked | Schema v2.0',
      versions: [
        { id: v20, version: 'v2.0', status: 'archived', fieldCount: 10, publishedAt: nowIso(), fields: [] }
      ]
    }
  ]

  const ticket1: Ticket = {
    id: 'FT-2841',
    title: 'Pump Station #12',
    formId: form1Id,
    versionId: v23,
    assignedTo: 'Jordan Miles',
    assignedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    status: 'queued',
    approvalState: 'pending',
    values: {
      site_id: 'PS-12',
      inspection_date: '2024-04-12',
      technician: 'Jordan Miles',
      pressure_reading: 186,
      valve_ok: true,
      notes: 'Minor vibration at intake panel.'
    },
    attachments: [
      // demo placeholder
    ],
    signature: { signer: 'Jordan Miles' },
    updatedAt: nowIso()
  }

  const ticket2: Ticket = {
    id: 'FT-2839',
    title: 'Fiber Splice 07A',
    formId: form2Id,
    versionId: v18,
    assignedTo: 'Luis Ortega',
    assignedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'synced',
    approvalState: 'approved',
    values: {},
    attachments: [],
    updatedAt: nowIso()
  }

  const ticket3: Ticket = {
    id: 'FT-2836',
    title: 'Hazard Assessment',
    formId: form3Id,
    versionId: v31,
    assignedTo: 'Quinn Hart',
    assignedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    status: 'error',
    approvalState: 'pending',
    values: {},
    attachments: [],
    lastError: 'Conflict: server accepted newer field values',
    updatedAt: nowIso()
  }

  const queue: QueueItem[] = [
    { id: uid('q'), type: 'submit_ticket', ticketId: ticket1.id, createdAt: nowIso(), status: 'pending', attempts: 0 },
    { id: uid('q'), type: 'submit_ticket', ticketId: 'FT-2838', createdAt: nowIso(), status: 'failed', attempts: 2, lastError: 'Network timeout' }
  ]

  const employees: Employee[] = [
    { id: uid('emp'), name: 'Jordan Miles', email: 'jordan.miles@relayforms.io', role: 'Technician', phone: '+1 555-0184', active: true },
    { id: uid('emp'), name: 'Luis Ortega', email: 'luis.ortega@relayforms.io', role: 'Technician', phone: '+1 555-0162', active: true },
    { id: uid('emp'), name: 'Quinn Hart', email: 'quinn.hart@relayforms.io', role: 'Supervisor', phone: '+1 555-0147', active: true },
    { id: uid('emp'), name: 'Sasha Reed', email: 'sasha.reed@relayforms.io', role: 'Inspector', phone: '+1 555-0199', active: true }
  ]

  const activities: Activity[] = [
    { id: uid('act'), at: nowIso(), title: 'FT-2841 queued from Field App', subtitle: 'Pump Station #12 | Jordan Miles' },
    { id: uid('act'), at: new Date(Date.now() - 40 * 60 * 1000).toISOString(), title: 'Form Builder published v2.3', subtitle: 'Pump Station Safety Inspection' },
    { id: uid('act'), at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(), title: 'Sync job resolved 2 conflicts', subtitle: 'Server accepted newer field values' }
  ]

  useAppStore.setState({
    forms,
    tickets: [ticket1, ticket2, ticket3],
    queue,
    activities,
    employees,
    lastSyncSuccess: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  })
}

function mkField(type: Field['type'], label: string, key: string, x: number, y: number, w: number, h: number, validation?: Field['validation']) : Field {
  return {
    id: uid('fld'),
    type,
    label,
    key,
    required: ['site_id', 'inspection_date', 'technician'].includes(key),
    validation: validation ?? { kind: 'none' },
    hint: key === 'pressure_reading' ? 'Enter PSI between 0 and 300.' : undefined,
    helpText: key === 'pressure_reading' ? 'Capture reading after 2-minute stabilization.' : undefined,
    page: 1,
    x, y, w, h
  }
}
