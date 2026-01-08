import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SectionHeader from '@/shared/ui/SectionHeader'
import Button from '@/shared/ui/Button'
import { Card, CardBody } from '@/shared/ui/Card'
import Badge from '@/shared/ui/Badge'
import Modal from '@/shared/ui/Modal'
import Input from '@/shared/ui/Input'
import Select from '@/shared/ui/Select'
import { useAppStore } from '@/shared/state/useAppStore'
import { dateTimeShort } from '@/shared/lib/format'
import type { Field, FormVersion } from '@/entities/types'
import { Plus, GitBranchPlus, Archive, ArrowRight, History, RotateCcw, CheckCircle2 } from 'lucide-react'

export default function FormsPage() {
  const nav = useNavigate()
  const forms = useAppStore(s => s.forms)
  const role = useAppStore(s => s.role)
  const createForm = useAppStore(s => s.createForm)
  const createVersion = useAppStore(s => s.createVersion)
  const archiveForm = useAppStore(s => s.archiveForm)
  const publishVersion = useAppStore(s => s.publishVersion)
  const pushToast = useAppStore(s => s.pushToast)

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [historyFormId, setHistoryFormId] = useState<string | null>(null)
  const [compareLeftId, setCompareLeftId] = useState('')
  const [compareRightId, setCompareRightId] = useState('')

  const canEdit = role === 'admin'

  const rows = useMemo(
    () => forms.map(f => ({ f, v: f.versions.find(v => v.status === 'active') ?? f.versions[0] })),
    [forms]
  )

  const historyForm = useMemo(
    () => forms.find(f => f.id === historyFormId) ?? null,
    [forms, historyFormId]
  )

  const leftVersion = historyForm?.versions.find(v => v.id === compareLeftId)
  const rightVersion = historyForm?.versions.find(v => v.id === compareRightId)

  const diff = useMemo(
    () => (leftVersion && rightVersion ? diffVersions(leftVersion, rightVersion) : null),
    [leftVersion, rightVersion]
  )

  const hasDiff = Boolean(
    diff && (diff.added.length || diff.removed.length || diff.changed.length || diff.pdfChanged)
  )

  const openHistory = (formId: string) => {
    const form = forms.find(f => f.id === formId)
    if (!form) return
    const [first, second] = form.versions
    setHistoryFormId(formId)
    setCompareLeftId(first?.id ?? '')
    setCompareRightId((second ?? first)?.id ?? '')
  }

  return (
    <div className="pb-10">
      <SectionHeader
        title="Forms"
        subtitle="Templates, versions, and publish flow."
        right={
          <Button
            variant="secondary"
            disabled={!canEdit}
            title={canEdit ? 'Create new form' : 'Admins only'}
            onClick={() => {
              if (!canEdit) return
              setName('')
              setOpen(true)
            }}
          >
            <Plus size={16} /> New Form
          </Button>
        }
      />

      <div className="px-4 mt-4 sm:px-6 sm:mt-6">
        <Card>
          <CardBody>
            <div className="overflow-auto rf-scrollbar">
              <table className="w-full text-sm">
                <thead className="text-xs text-neutral-500 dark:text-neutral-400">
                  <tr className="text-left">
                    <th className="py-2">Form</th>
                    <th className="py-2 hidden sm:table-cell">Current version</th>
                    <th className="py-2 hidden sm:table-cell">Status</th>
                    <th className="py-2 hidden sm:table-cell">Fields</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ f, v }) => (
                    <tr key={f.id} className="border-t border-neutral-200 dark:border-neutral-800">
                      <td className="py-3">
                        <div className="font-medium">{f.name}</div>
                        {f.subtitle && <div className="text-xs text-neutral-500 dark:text-neutral-400">{f.subtitle}</div>}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 sm:hidden">
                          <span>{v.version}</span>
                          <span>·</span>
                          <span>{v.fieldCount} fields</span>
                        </div>
                        <div className="mt-2 sm:hidden">
                          <Badge tone={v.status === 'active' ? 'success' : v.status === 'draft' ? 'warning' : 'neutral'}>
                            {v.status}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3 hidden sm:table-cell">{v.version}</td>
                      <td className="py-3 hidden sm:table-cell">
                        <Badge tone={v.status === 'active' ? 'success' : v.status === 'draft' ? 'warning' : 'neutral'}>
                          {v.status}
                        </Badge>
                      </td>
                      <td className="py-3 hidden sm:table-cell">{v.fieldCount}</td>
                      <td className="py-3 text-right">
                        <div className="flex w-full flex-col items-stretch gap-2 sm:inline-flex sm:w-auto sm:flex-row sm:items-center">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="w-full sm:w-auto"
                            disabled={!canEdit}
                            onClick={async () => {
                              if (!canEdit) return
                              try {
                                const newV = await createVersion(f.id)
                                nav(`/builder/${f.id}?v=${newV}`)
                              } catch (err: any) {
                                pushToast({ title: 'Version failed', message: err?.message || 'Unable to create version', variant: 'danger' })
                              }
                            }}
                            title={canEdit ? 'Create new version' : 'Admins only'}
                          >
                            <GitBranchPlus size={16} /> New Version
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="w-full sm:w-auto"
                            disabled={!canEdit}
                            onClick={() => {
                              if (!canEdit) return
                              nav(`/builder/${f.id}`)
                            }}
                            title={canEdit ? 'Open builder' : 'Admins only'}
                          >
                            Open <ArrowRight size={16} />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="w-full sm:w-auto"
                            onClick={() => openHistory(f.id)}
                            title="Version history"
                          >
                            <History size={16} /> History
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-full sm:w-auto"
                            disabled={!canEdit}
                            onClick={async () => {
                              if (!canEdit) return
                              try {
                                await archiveForm(f.id)
                              } catch (err: any) {
                                pushToast({ title: 'Archive failed', message: err?.message || 'Unable to archive', variant: 'danger' })
                              }
                            }}
                            title={canEdit ? 'Archive' : 'Admins only'}
                          >
                            <Archive size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {rows.length === 0 && (
                    <tr>
                      <td className="py-10 text-center text-sm text-neutral-500 dark:text-neutral-400" colSpan={5}>
                        No forms yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Create new form">
        <div className="space-y-3">
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            You can rename it later. In the Builder you will add the PDF and fields.
          </div>
          <Input placeholder="Form name" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={!canEdit}
              title={canEdit ? 'Create form' : 'Admins only'}
              onClick={async () => {
                if (!canEdit) return
                try {
                  const id = await createForm((name || 'New Form').trim())
                  setOpen(false)
                  nav(`/builder/${id}`)
                } catch (err: any) {
                  pushToast({ title: 'Create failed', message: err?.message || 'Unable to create form', variant: 'danger' })
                }
              }}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(historyForm)} onClose={() => setHistoryFormId(null)} title="Version history" className="max-w-4xl">
        {historyForm && (
          <div className="space-y-4">
            <div>
              <div className="text-sm font-semibold">{historyForm.name}</div>
              {historyForm.subtitle && (
                <div className="text-xs text-neutral-500 dark:text-neutral-400">{historyForm.subtitle}</div>
              )}
            </div>

            <div className="overflow-auto rf-scrollbar rounded-2xl border border-neutral-200 dark:border-neutral-800">
              <table className="w-full text-sm">
                <thead className="text-xs text-neutral-500 dark:text-neutral-400">
                  <tr className="text-left">
                    <th className="py-2 px-3">Version</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Fields</th>
                    <th className="py-2 px-3">Published</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {historyForm.versions.map((v) => (
                    <tr key={v.id} className="border-t border-neutral-200 dark:border-neutral-800">
                      <td className="py-2 px-3 font-medium">{v.version}</td>
                      <td className="py-2 px-3">
                        <Badge tone={v.status === 'active' ? 'success' : v.status === 'draft' ? 'warning' : 'neutral'}>
                          {v.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">{v.fieldCount}</td>
                      <td className="py-2 px-3">{v.publishedAt ? dateTimeShort(v.publishedAt) : '—'}</td>
                      <td className="py-2 px-3 text-right">
                        {v.status === 'active' ? (
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">Active</span>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={!canEdit}
                            title={canEdit ? (v.status === 'archived' ? 'Rollback to this version' : 'Publish version') : 'Admins only'}
                            onClick={async () => {
                              if (!canEdit) return
                              try {
                                await publishVersion(historyForm.id, v.id)
                              } catch (err: any) {
                                pushToast({ title: 'Publish failed', message: err?.message || 'Unable to publish version', variant: 'danger' })
                              }
                            }}
                          >
                            {v.status === 'archived' ? <RotateCcw size={14} /> : <CheckCircle2 size={14} />}
                            {v.status === 'archived' ? 'Rollback' : 'Publish'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {historyForm.versions.length === 0 && (
                    <tr>
                      <td className="py-6 px-3 text-center text-sm text-neutral-500 dark:text-neutral-400" colSpan={5}>
                        No versions yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
              <div className="text-sm font-semibold">Compare versions</div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Base version</div>
                  <Select value={compareLeftId} onChange={(e) => setCompareLeftId(e.target.value)}>
                    {historyForm.versions.map((v) => (
                      <option key={v.id} value={v.id}>{v.version}</option>
                    ))}
                  </Select>
                  {leftVersion && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                      <Badge tone={leftVersion.status === 'active' ? 'success' : leftVersion.status === 'draft' ? 'warning' : 'neutral'}>
                        {leftVersion.status}
                      </Badge>
                      <span>{leftVersion.fieldCount} fields</span>
                      <span>Published {leftVersion.publishedAt ? dateTimeShort(leftVersion.publishedAt) : '—'}</span>
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Compare to</div>
                  <Select value={compareRightId} onChange={(e) => setCompareRightId(e.target.value)}>
                    {historyForm.versions.map((v) => (
                      <option key={v.id} value={v.id}>{v.version}</option>
                    ))}
                  </Select>
                  {rightVersion && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                      <Badge tone={rightVersion.status === 'active' ? 'success' : rightVersion.status === 'draft' ? 'warning' : 'neutral'}>
                        {rightVersion.status}
                      </Badge>
                      <span>{rightVersion.fieldCount} fields</span>
                      <span>Published {rightVersion.publishedAt ? dateTimeShort(rightVersion.publishedAt) : '—'}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4">
                {!leftVersion || !rightVersion || !diff ? (
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">Select two versions to compare.</div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge tone="success">{diff.added.length} added</Badge>
                      <Badge tone="danger">{diff.removed.length} removed</Badge>
                      <Badge tone="warning">{diff.changed.length} updated</Badge>
                      {diff.pdfChanged && <Badge tone="neutral">PDF changed</Badge>}
                    </div>

                    {!hasDiff && (
                      <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">No differences detected.</div>
                    )}

                    {hasDiff && (
                      <div className="mt-3 space-y-2 text-xs text-neutral-700 dark:text-neutral-200">
                        {diff.added.length > 0 && (
                          <div>
                            <span className="font-medium">Added:</span> {diff.added.map(fieldName).join(', ')}
                          </div>
                        )}
                        {diff.removed.length > 0 && (
                          <div>
                            <span className="font-medium">Removed:</span> {diff.removed.map(fieldName).join(', ')}
                          </div>
                        )}
                        {diff.changed.length > 0 && (
                          <div>
                            <div className="font-medium">Updated fields:</div>
                            <div className="mt-1 grid gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                              {diff.changed.map((c) => (
                                <div key={c.key}>
                                  <span className="text-neutral-800 dark:text-neutral-100">{c.label}</span>
                                  {' '}
                                  <span>({c.changes.join(', ')})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {diff.pdfChanged && (
                          <div>
                            <span className="font-medium">PDF:</span> updated between versions.
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

type VersionDiff = {
  added: Field[]
  removed: Field[]
  changed: Array<{ key: string; label: string; changes: string[] }>
  pdfChanged: boolean
}

function diffVersions(left: FormVersion, right: FormVersion): VersionDiff {
  const leftByKey = new Map(left.fields.map(f => [f.key, f]))
  const rightByKey = new Map(right.fields.map(f => [f.key, f]))
  const added: Field[] = []
  const removed: Field[] = []
  const changed: Array<{ key: string; label: string; changes: string[] }> = []

  for (const [key, field] of rightByKey) {
    const prev = leftByKey.get(key)
    if (!prev) {
      added.push(field)
      continue
    }
    const changes = diffField(prev, field)
    if (changes.length) {
      changed.push({ key, label: field.label || prev.label || key, changes })
    }
  }

  for (const [key, field] of leftByKey) {
    if (!rightByKey.has(key)) removed.push(field)
  }

  const pdfChanged = Boolean(left.pdf || right.pdf) && (left.pdf?.name !== right.pdf?.name || left.pdf?.mime !== right.pdf?.mime)

  return { added, removed, changed, pdfChanged }
}

function diffField(left: Field, right: Field) {
  const changes: string[] = []
  if (left.label !== right.label) changes.push('label')
  if (left.type !== right.type) changes.push('type')
  if (left.required !== right.required) changes.push('required')
  if ((left.hint ?? '') !== (right.hint ?? '') || (left.helpText ?? '') !== (right.helpText ?? '')) {
    changes.push('helper text')
  }

  const validationChanged =
    left.validation.kind !== right.validation.kind ||
    (left.validation.kind === 'range' &&
      right.validation.kind === 'range' &&
      (left.validation.min !== right.validation.min || left.validation.max !== right.validation.max)) ||
    (left.validation.kind === 'regex' &&
      right.validation.kind === 'regex' &&
      left.validation.pattern !== right.validation.pattern)

  if (validationChanged) changes.push('validation')

  const layoutChanged =
    left.page !== right.page ||
    left.x !== right.x ||
    left.y !== right.y ||
    left.w !== right.w ||
    left.h !== right.h

  if (layoutChanged) changes.push('layout')

  return changes
}

function fieldName(field: Field) {
  return field.label?.trim() ? field.label : field.key
}
