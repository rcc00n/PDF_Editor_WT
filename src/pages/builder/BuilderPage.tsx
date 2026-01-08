import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import SectionHeader from '@/shared/ui/SectionHeader'
import Button from '@/shared/ui/Button'
import Badge from '@/shared/ui/Badge'
import Input from '@/shared/ui/Input'
import Textarea from '@/shared/ui/Textarea'
import Select from '@/shared/ui/Select'
import { Card, CardBody } from '@/shared/ui/Card'
import { useAppStore } from '@/shared/state/useAppStore'
import type { Field, FieldType } from '@/entities/types'
import { uid } from '@/shared/lib/ids'
import { useElementSize } from '@/shared/hooks/useElementSize'
import PdfPageCanvas from '@/features/pdf/PdfPageCanvas'
import { cn } from '@/shared/ui/cn'
import { Eye, Upload, CheckCircle2, Trash2 } from 'lucide-react'

const tools: Array<{ type: FieldType; label: string }> = [
  { type: 'text', label: 'Text' },
  { type: 'numeric', label: 'Numeric' },
  { type: 'checkbox', label: 'Checkbox' },
  { type: 'date', label: 'Date' },
  { type: 'signature', label: 'Signature' },
  { type: 'photo', label: 'Photo' }
]

export default function BuilderPage() {
  const { formId = '' } = useParams()
  const location = useLocation()
  const nav = useNavigate()

  const forms = useAppStore(s => s.forms)
  const role = useAppStore(s => s.role)
  const setPdf = useAppStore(s => s.setPdf)
  const publishVersion = useAppStore(s => s.publishVersion)
  const upsertField = useAppStore(s => s.upsertField)
  const deleteField = useAppStore(s => s.deleteField)

  const form = forms.find(f => f.id === formId)
  const vFromQuery = new URLSearchParams(location.search).get('v')

  const version = useMemo(() => {
    if (!form) return undefined
    if (vFromQuery) return form.versions.find(v => v.id === vFromQuery) ?? form.versions[0]
    return form.versions[0]
  }, [form, vFromQuery])

  const [activeTool, setActiveTool] = useState<FieldType>('text')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [numPages, setNumPages] = useState(1)

  const selected = useMemo(() => version?.fields.find(f => f.id === selectedId) ?? null, [version, selectedId])

  const { ref: stageRef, size } = useElementSize<HTMLDivElement>()

  if (role !== 'admin') {
    return (
      <div className="p-6">
        <div className="text-sm text-neutral-500 dark:text-neutral-400">
          Worker accounts only fill ready forms. Switch to Admin to edit templates.
        </div>
        <div className="mt-3">
          <Button variant="secondary" onClick={() => nav('/field')}>Go to Field App</Button>
        </div>
      </div>
    )
  }

  if (!form || !version) {
    return (
      <div className="p-6">
        <div className="text-sm text-neutral-500 dark:text-neutral-400">Form not found.</div>
      </div>
    )
  }

  const pdf = version.pdf

  return (
    <div className="pb-10">
      <SectionHeader
        title="Form Builder"
        subtitle={`${form.name} · ${version.version} · ${version.fieldCount} fields`}
        right={
          <>
            <Button variant="secondary" onClick={() => nav('/field')}>
              <Eye size={16} /> Preview Field App
            </Button>

            <label className="inline-flex">
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = () => {
                    const dataUrl = String(reader.result)
                    setPdf(form.id, version.id, { name: file.name, mime: file.type || 'application/pdf', dataUrl })
                    useAppStore.getState().pushToast({ title: 'PDF uploaded', message: file.name, variant: 'success' })
                  }
                  reader.readAsDataURL(file)
                }}
              />
              <Button variant="secondary">
                <Upload size={16} /> {pdf ? 'Replace PDF' : 'Upload PDF'}
              </Button>
            </label>

            <Button
              onClick={() => publishVersion(form.id, version.id)}
              disabled={version.status === 'active'}
            >
              <CheckCircle2 size={16} /> Publish
            </Button>
          </>
        }
      />

      <div className="px-4 mt-4 sm:px-6 sm:mt-6 grid grid-cols-1 xl:grid-cols-[260px_1fr_320px] gap-4 items-start">
        {/* Tool Palette */}
        <Card>
          <CardBody>
            <div className="text-sm font-semibold">Tool Palette</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Click a tool, then click on the canvas.
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {tools.map((t) => (
                <button
                  key={t.type}
                  className={cn(
                    'rf-focus rounded-2xl border px-3 py-2 text-sm font-medium transition',
                    activeTool === t.type
                      ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                      : 'border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900'
                  )}
                  onClick={() => setActiveTool(t.type)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-neutral-500 dark:text-neutral-400">Status</div>
              <Badge tone={version.status === 'active' ? 'success' : version.status === 'draft' ? 'warning' : 'neutral'}>{version.status}</Badge>
            </div>

            <div className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
              Tip: drag fields to reposition. All changes are saved in the browser (demo).
            </div>
          </CardBody>
        </Card>

        {/* Canvas */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">PDF Canvas</div>
              <div className="flex items-center gap-2">
                <button
                  className="rf-focus rounded-xl px-2 py-1 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ←
                </button>
                <div className="text-sm">
                  Page {page} / {numPages}
                </div>
                <button
                  className="rf-focus rounded-xl px-2 py-1 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  onClick={() => setPage((p) => Math.min(numPages, p + 1))}
                >
                  →
                </button>
              </div>
            </div>

            <div className="mt-3 relative" ref={stageRef}>
              {!pdf ? (
                <div className="rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 p-10 text-center">
                  <div className="text-sm font-medium">Upload a PDF to start</div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Then map structured fields onto the locked layout.
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <PdfPageCanvas
                    dataUrl={pdf.dataUrl}
                    page={page}
                    onMeta={(m) => setNumPages(m.numPages)}
                  />

                  {/* Overlay */}
                  <div
                    className="absolute inset-0"
                    onMouseDown={(e) => {
                      // only add when clicking empty overlay
                      if ((e.target as HTMLElement).dataset.field === '1') return
                      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
                      const x = (e.clientX - rect.left) / rect.width
                      const y = (e.clientY - rect.top) / rect.height
                      const f = newField(activeTool, x, y, page)
                      upsertField(form.id, version.id, f)
                      setSelectedId(f.id)
                    }}
                  >
                    {version.fields
                      .filter((f) => f.page === page)
                      .map((f) => (
                        <FieldBox
                          key={f.id}
                          field={f}
                          selected={f.id === selectedId}
                          stage={size}
                          onSelect={() => setSelectedId(f.id)}
                          onMove={(nx, ny) => {
                            upsertField(form.id, version.id, { ...f, x: nx, y: ny })
                          }}
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 text-xs text-neutral-500 dark:text-neutral-400 flex justify-between gap-3">
              <div>Click on canvas to add: <span className="font-medium">{activeTool}</span></div>
              <div>{pdf ? pdf.name : 'No PDF'}</div>
            </div>
          </CardBody>
        </Card>

        {/* Properties */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Field Properties</div>
              {selected && (
                <button
                  className="rf-focus rounded-xl p-2 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  title="Delete field"
                  onClick={() => {
                    deleteField(form.id, version.id, selected.id)
                    setSelectedId(null)
                  }}
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            {!selected ? (
              <div className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
                Select a field on the canvas to edit.
              </div>
            ) : (
              <FieldEditor
                field={selected}
                onChange={(next) => upsertField(form.id, version.id, next)}
              />
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

function FieldEditor({ field, onChange }: { field: Field; onChange: (f: Field) => void }) {
  return (
    <div className="mt-4 space-y-3">
      <div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Label</div>
        <Input value={field.label} onChange={(e) => onChange({ ...field, label: e.target.value })} />
      </div>

      <div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Field Key</div>
        <Input value={field.key} onChange={(e) => onChange({ ...field, key: e.target.value.replace(/\s+/g, '_') })} />
        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">Used in storage/export.</div>
      </div>

      <div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Type</div>
        <Select value={field.type} onChange={(e) => onChange({ ...field, type: e.target.value as any })}>
          <option value="text">Text</option>
          <option value="numeric">Numeric</option>
          <option value="checkbox">Checkbox</option>
          <option value="date">Date</option>
          <option value="signature">Signature</option>
          <option value="photo">Photo</option>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-neutral-500 dark:text-neutral-400">Required</div>
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={field.required}
          onChange={(e) => onChange({ ...field, required: e.target.checked })}
        />
      </div>

      <div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Validation</div>
        {field.type === 'numeric' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="min"
              value={field.validation.kind === 'range' ? field.validation.min : 0}
              onChange={(e) =>
                onChange({
                  ...field,
                  validation: { kind: 'range', min: Number(e.target.value || 0), max: field.validation.kind === 'range' ? field.validation.max : 300 }
                })
              }
            />
            <Input
              type="number"
              placeholder="max"
              value={field.validation.kind === 'range' ? field.validation.max : 300}
              onChange={(e) =>
                onChange({
                  ...field,
                  validation: { kind: 'range', min: field.validation.kind === 'range' ? field.validation.min : 0, max: Number(e.target.value || 0) }
                })
              }
            />
          </div>
        ) : (
          <Select
            value={field.validation.kind}
            onChange={(e) =>
              onChange({
                ...field,
                validation: e.target.value === 'none' ? { kind: 'none' } : { kind: 'regex', pattern: '' }
              })
            }
          >
            <option value="none">None</option>
            <option value="regex">Regex</option>
          </Select>
        )}
      </div>

      <div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Hint</div>
        <Input value={field.hint ?? ''} onChange={(e) => onChange({ ...field, hint: e.target.value })} />
      </div>

      <div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Help Text</div>
        <Textarea value={field.helpText ?? ''} onChange={(e) => onChange({ ...field, helpText: e.target.value })} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">W</div>
          <Input type="number" value={Math.round(field.w * 100)} onChange={(e) => onChange({ ...field, w: clamp01(Number(e.target.value) / 100) })} />
        </div>
        <div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">H</div>
          <Input type="number" value={Math.round(field.h * 100)} onChange={(e) => onChange({ ...field, h: clamp01(Number(e.target.value) / 100) })} />
        </div>
      </div>
    </div>
  )
}

function FieldBox({
  field,
  selected,
  stage,
  onSelect,
  onMove
}: {
  field: Field
  selected: boolean
  stage: { width: number; height: number }
  onSelect: () => void
  onMove: (x: number, y: number) => void
}) {
  const [drag, setDrag] = useState<null | { ox: number; oy: number }>(null)

  const style = {
    left: `${field.x * 100}%`,
    top: `${field.y * 100}%`,
    width: `${field.w * 100}%`,
    height: `${field.h * 100}%`
  } as any

  return (
    <div
      data-field="1"
      className={cn(
        'absolute rounded-xl border text-[11px] flex items-center justify-center select-none cursor-move',
        selected
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-neutral-300 bg-white/60 dark:border-neutral-700 dark:bg-neutral-950/40'
      )}
      style={style}
      onMouseDown={(e) => {
        e.stopPropagation()
        onSelect()
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
        setDrag({ ox: e.clientX - rect.left, oy: e.clientY - rect.top })
      }}
      onMouseMove={(e) => {
        if (!drag) return
        e.stopPropagation()
        const parent = (e.currentTarget.parentElement as HTMLDivElement).getBoundingClientRect()
        const nx = (e.clientX - parent.left - drag.ox) / parent.width
        const ny = (e.clientY - parent.top - drag.oy) / parent.height
        onMove(clamp01(nx), clamp01(ny))
      }}
      onMouseUp={(e) => {
        if (drag) e.stopPropagation()
        setDrag(null)
      }}
      onMouseLeave={() => setDrag(null)}
    >
      <span className="px-2 truncate">{field.label}</span>
    </div>
  )
}

function newField(type: FieldType, x: number, y: number, page: number): Field {
  const base = { x: clamp01(x), y: clamp01(y), page }
  const sizes: Record<FieldType, { w: number; h: number }> = {
    text: { w: 0.34, h: 0.055 },
    numeric: { w: 0.26, h: 0.055 },
    checkbox: { w: 0.18, h: 0.055 },
    date: { w: 0.24, h: 0.055 },
    signature: { w: 0.50, h: 0.11 },
    photo: { w: 0.50, h: 0.09 }
  }

  const wh = sizes[type]
  return {
    id: uid('fld'),
    type,
    label: labelFor(type),
    key: `${type}_${Math.random().toString(16).slice(2, 6)}`,
    required: false,
    validation: type === 'numeric' ? { kind: 'range', min: 0, max: 300 } : { kind: 'none' },
    ...base,
    w: wh.w,
    h: wh.h
  }
}

function labelFor(type: FieldType) {
  switch (type) {
    case 'text': return 'Text'
    case 'numeric': return 'Numeric'
    case 'checkbox': return 'Checkbox'
    case 'date': return 'Date'
    case 'signature': return 'Signature'
    case 'photo': return 'Photo'
  }
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}
