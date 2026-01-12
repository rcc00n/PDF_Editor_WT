import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import SectionHeader from '@/shared/ui/SectionHeader'
import Button from '@/shared/ui/Button'
import Badge from '@/shared/ui/Badge'
import Input from '@/shared/ui/Input'
import Textarea from '@/shared/ui/Textarea'
import Select from '@/shared/ui/Select'
import { Card, CardBody } from '@/shared/ui/Card'
import { useAppStore } from '@/shared/state/useAppStore'
import type { Field, FieldType, Validation } from '@/entities/types'
import { uid } from '@/shared/lib/ids'
import { useElementSize } from '@/shared/hooks/useElementSize'
import PdfPageCanvas from '@/features/pdf/PdfPageCanvas'
import { cn } from '@/shared/ui/cn'
import { Eye, Upload, CheckCircle2, Trash2, Maximize2, Minimize2 } from 'lucide-react'

type ToolPreset = {
  id: string
  label: string
  type: FieldType
  required?: boolean
  options?: string[]
  autoValue?: Field['autoValue']
  readOnly?: boolean
  validation?: Validation
  keyBase?: string
  hint?: string
  helpText?: string
  description?: string
}

const TOOL_SECTIONS: Array<{ title?: string; tools: ToolPreset[] }> = [
  {
    tools: [
      { id: 'required_text', label: 'Required Text', type: 'text', required: true, description: 'Text input (required).' },
      { id: 'optional_text', label: 'Optional Text', type: 'text', description: 'Text input (optional).' },
      { id: 'custom_list', label: 'Customized List', type: 'select', options: ['Option 1', 'Option 2'], description: 'Dropdown with custom options.' },
      { id: 'list_yes_no', label: 'List Yes, No', type: 'select', options: ['Yes', 'No'], description: 'Dropdown with Yes/No.' },
      { id: 'list_yes_no_na', label: 'List Yes, No, or NA', type: 'select', options: ['Yes', 'No', 'NA'], description: 'Dropdown with Yes/No/NA.' },
      { id: 'checkbox', label: 'Check Box', type: 'checkbox', description: 'Single checkbox.' },
      { id: 'required_signature', label: 'Required Signature', type: 'signature', required: true, description: 'Signature block (required).' },
      { id: 'radio', label: 'Radio Buttons', type: 'radio', options: ['Option 1', 'Option 2'], description: 'Single-choice radio list.' },
      { id: 'crew_member', label: 'Crew Member', type: 'employee', description: 'Select from employees.' },
      { id: 'crew_signature', label: 'Crew Signature', type: 'signature', description: 'Signature block.' },
      { id: 'manager', label: 'Manager', type: 'employee', description: 'Select from employees.' },
      { id: 'client_name', label: 'Client Name', type: 'text', description: 'Text input for client.' },
      { id: 'current_date', label: 'Current Date', type: 'date', autoValue: 'today', readOnly: true, description: "Auto-filled with today's date." },
      { id: 'creator', label: 'Creator', type: 'text', autoValue: 'creator', readOnly: true, description: 'Auto-filled with assigned user.' },
      {
        id: 'unit_number',
        label: 'Unit #',
        type: 'numeric',
        validation: { kind: 'range', min: 0, max: 999999 },
        keyBase: 'unit_number',
        description: 'Numeric unit identifier.'
      },
      { id: 'uwi_location', label: 'UWI location', type: 'text', description: 'Text input for UWI location.' },
      { id: 'employee_list', label: 'Employee List', type: 'employee', description: 'Select from employees.' }
    ]
  },
  {
    title: 'Extras',
    tools: [
      { id: 'photo', label: 'Photo', type: 'photo', description: 'Attachment placeholder.' }
    ]
  }
]

const ALL_TOOLS = TOOL_SECTIONS.flatMap((section) => section.tools)
const TOOL_BY_ID = Object.fromEntries(ALL_TOOLS.map((tool) => [tool.id, tool])) as Record<string, ToolPreset>
const DEFAULT_TOOL_ID = ALL_TOOLS[0]?.id ?? null

const GRID_PX = 8
const MIN_FIELD_SIZE = 0.03
const DEFAULT_FONT_SIZE = 12

export default function BuilderPage() {
  const { formId = '' } = useParams()
  const location = useLocation()
  const nav = useNavigate()

  const forms = useAppStore(s => s.forms)
  const role = useAppStore(s => s.role)
  const apiEnabled = useAppStore(s => s.apiEnabled)
  const setPdf = useAppStore(s => s.setPdf)
  const setCanvasSize = useAppStore(s => s.setCanvasSize)
  const uploadPdf = useAppStore(s => s.uploadPdf)
  const publishVersion = useAppStore(s => s.publishVersion)
  const upsertField = useAppStore(s => s.upsertField)
  const deleteField = useAppStore(s => s.deleteField)
  const pushToast = useAppStore(s => s.pushToast)
  const pdfInputRef = useRef<HTMLInputElement | null>(null)

  const form = forms.find(f => f.id === formId)
  const vFromQuery = new URLSearchParams(location.search).get('v')

  const version = useMemo(() => {
    if (!form) return undefined
    if (vFromQuery) return form.versions.find(v => v.id === vFromQuery) ?? form.versions[0]
    return form.versions[0]
  }, [form, vFromQuery])

  const [activeToolId, setActiveToolId] = useState<string | null>(DEFAULT_TOOL_ID)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [numPages, setNumPages] = useState(1)
  const [propertiesOpen, setPropertiesOpen] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.innerWidth >= 1400
  })
  const [canvasFocus, setCanvasFocus] = useState(false)

  const selected = useMemo(() => version?.fields.find(f => f.id === selectedId) ?? null, [version, selectedId])
  const activeTool = activeToolId ? TOOL_BY_ID[activeToolId] : null

  const { ref: stageRef, size } = useElementSize<HTMLDivElement>()
  const stageWidthKey = Math.round(size.width)
  const grid = getGridStep(size)
  const showProperties = propertiesOpen && !canvasFocus

  useEffect(() => {
    if (!canvasFocus) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [canvasFocus])

  useEffect(() => {
    if (!canvasFocus) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCanvasFocus(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canvasFocus])

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
  const canvas = version.canvas ?? { width: 210, height: 297 }
  const fieldsOnPage = version.fields.filter((f) => f.page === page)

  const handleUpsertField = (next: Field) => {
    void upsertField(form.id, version.id, next).catch((err) => {
      pushToast({ title: 'Field update failed', message: err?.message || 'Unable to save field', variant: 'danger' })
    })
  }

  const handleDeleteField = (fieldId: string) => {
    void deleteField(form.id, version.id, fieldId).catch((err) => {
      pushToast({ title: 'Delete failed', message: err?.message || 'Unable to delete field', variant: 'danger' })
    })
  }

  const handleDuplicateField = (field: Field) => {
    const offsetX = grid.x ? grid.x * 2 : 0.02
    const offsetY = grid.y ? grid.y * 2 : 0.02
    const maxX = 1 - field.w
    const maxY = 1 - field.h
    const nextX = field.x + offsetX <= maxX ? field.x + offsetX : field.x - offsetX
    const nextY = field.y + offsetY <= maxY ? field.y + offsetY : field.y - offsetY
    const nx = clamp(snapToGrid(nextX, grid.x), 0, maxX)
    const ny = clamp(snapToGrid(nextY, grid.y), 0, maxY)
    const copy: Field = {
      ...field,
      id: uid('fld'),
      key: `${field.key}_${Math.random().toString(16).slice(2, 6)}`,
      x: nx,
      y: ny
    }
    handleUpsertField(copy)
    setSelectedId(copy.id)
  }

  return (
    <div className="pb-10">
      {canvasFocus && (
        <div
          className="fixed inset-0 z-40 bg-neutral-950/60 backdrop-blur-sm"
          onClick={() => setCanvasFocus(false)}
          aria-hidden="true"
        />
      )}
      <SectionHeader
        title="Form Builder"
        subtitle={`${form.name} · ${version.version} · ${version.fieldCount} fields`}
        right={
          <>
            <Button variant="secondary" onClick={() => nav('/field')}>
              <Eye size={16} /> Preview Field App
            </Button>

            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                if (apiEnabled) {
                  void uploadPdf(form.id, version.id, file)
                    .then(() => pushToast({ title: 'PDF uploaded', message: file.name, variant: 'success' }))
                    .catch((err) => pushToast({ title: 'Upload failed', message: err?.message || 'Unable to upload PDF', variant: 'danger' }))
                } else {
                  const reader = new FileReader()
                  reader.onload = () => {
                    const dataUrl = String(reader.result)
                    setPdf(form.id, version.id, { name: file.name, mime: file.type || 'application/pdf', dataUrl })
                    useAppStore.getState().pushToast({ title: 'PDF uploaded', message: file.name, variant: 'success' })
                  }
                  reader.readAsDataURL(file)
                }
                e.currentTarget.value = ''
              }}
            />
            <Button
              variant="secondary"
              type="button"
              onClick={() => pdfInputRef.current?.click()}
            >
              <Upload size={16} /> {pdf ? 'Replace PDF' : 'Upload PDF'}
            </Button>

            <Button
              onClick={async () => {
                try {
                  await publishVersion(form.id, version.id)
                } catch (err: any) {
                  pushToast({ title: 'Publish failed', message: err?.message || 'Unable to publish', variant: 'danger' })
                }
              }}
              disabled={version.status === 'active'}
            >
              <CheckCircle2 size={16} /> Publish
            </Button>
          </>
        }
      />

      <div
        className={cn(
          'px-4 mt-4 sm:px-6 sm:mt-6 grid gap-4 items-start',
          canvasFocus ? 'grid-cols-1' : propertiesOpen ? 'grid-cols-1 xl:grid-cols-[260px_1fr_320px]' : 'grid-cols-1 xl:grid-cols-[260px_1fr]'
        )}
      >
        {/* Tool Palette */}
        {!canvasFocus && (
          <Card>
            <CardBody>
              <div className="text-sm font-semibold">Tool Palette</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Click a tool (or drag it) onto the canvas. Click it again for Hand mode.
              </div>
              {TOOL_SECTIONS.map((section, idx) => (
                <div key={section.title ?? `tools-${idx}`} className={idx === 0 ? 'mt-3' : 'mt-4'}>
                  {section.title && (
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      {section.title}
                    </div>
                  )}
                  <div className={cn('grid grid-cols-2 gap-2', section.title ? 'mt-2' : '')}>
                    {section.tools.map((t) => (
                      <button
                        key={t.id}
                        className={cn(
                          'rf-focus rounded-2xl border px-3 py-2 text-sm font-medium transition',
                          activeToolId === t.id
                            ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                            : 'border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900'
                        )}
                        draggable
                        title={t.description ?? t.label}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/x-rf-tool', t.id)
                          e.dataTransfer.effectAllowed = 'copy'
                        }}
                        onClick={() => setActiveToolId((prev) => (prev === t.id ? null : t.id))}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs text-neutral-500 dark:text-neutral-400">Status</div>
                <Badge tone={version.status === 'active' ? 'success' : version.status === 'draft' ? 'warning' : 'neutral'}>{version.status}</Badge>
              </div>

              {!pdf && (
                <div className="mt-4">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">Canvas size (mm)</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      className="rf-focus rounded-xl border border-neutral-200 px-2 py-1 text-xs hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                      onClick={() => setCanvasSize(form.id, version.id, { width: 210, height: 297 })}
                    >
                      A4
                    </button>
                    <button
                      className="rf-focus rounded-xl border border-neutral-200 px-2 py-1 text-xs hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                      onClick={() => setCanvasSize(form.id, version.id, { width: 216, height: 279 })}
                    >
                      Letter
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-1">W</div>
                      <Input
                        type="number"
                        value={Math.round(canvas.width)}
                        onChange={(e) =>
                          setCanvasSize(form.id, version.id, {
                            width: Math.max(50, Number(e.target.value || 0)),
                            height: canvas.height
                          })
                        }
                      />
                    </div>
                    <div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-1">H</div>
                      <Input
                        type="number"
                        value={Math.round(canvas.height)}
                        onChange={(e) =>
                          setCanvasSize(form.id, version.id, {
                            width: canvas.width,
                            height: Math.max(50, Number(e.target.value || 0))
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                Tip: drag fields to reposition, triple-click to duplicate. Hand mode prevents accidental adds.
              </div>
            </CardBody>
          </Card>
        )}

        {/* Canvas */}
        <Card
          className={cn(
            canvasFocus && 'fixed inset-4 z-50 flex flex-col shadow-2xl border-neutral-200/80 dark:border-neutral-700/80'
          )}
        >
          <CardBody className={cn(canvasFocus && 'flex-1 min-h-0 overflow-auto')}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-semibold">PDF Canvas</div>
              <div className="flex flex-wrap items-center gap-2">
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
                <div className="hidden sm:block h-5 w-px bg-neutral-200 dark:bg-neutral-800" aria-hidden="true" />
                <button
                  className={cn(
                    'rf-focus rounded-xl border px-2 py-1 text-xs font-medium transition',
                    propertiesOpen
                      ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                      : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900'
                  )}
                  onClick={() => setPropertiesOpen((prev) => !prev)}
                  aria-pressed={propertiesOpen}
                  title={propertiesOpen ? 'Hide properties panel' : 'Show properties panel'}
                >
                  <span className="sm:hidden">Props</span>
                  <span className="hidden sm:inline">Properties</span>
                </button>
                <button
                  className={cn(
                    'rf-focus rounded-xl border px-2 py-1 text-xs font-medium transition flex items-center gap-2',
                    canvasFocus
                      ? 'border-blue-500 bg-blue-500/10 text-blue-700 dark:border-blue-300 dark:text-blue-200'
                      : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900'
                  )}
                  onClick={() => setCanvasFocus((prev) => !prev)}
                  aria-pressed={canvasFocus}
                  title={canvasFocus ? 'Exit full screen' : 'Full screen canvas'}
                >
                  {canvasFocus ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  <span className="hidden sm:inline">{canvasFocus ? 'Exit Full Screen' : 'Full Screen'}</span>
                </button>
              </div>
            </div>

            <div className="mt-3 relative" ref={stageRef}>
              {!pdf ? (
                <div className="relative">
                  <div
                    className="w-full rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-white/70 dark:bg-neutral-950/40 flex items-center justify-center p-6 text-center"
                    style={{ aspectRatio: `${canvas.width} / ${canvas.height}` }}
                  >
                    <div className="pointer-events-none">
                      <div className="text-sm font-medium">Upload a PDF to lock the layout</div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        You can still place fields on this blank page.
                      </div>
                    </div>
                  </div>

                  {/* Overlay */}
                  <div
                    className={cn('absolute inset-0', activeTool ? 'cursor-crosshair' : 'cursor-grab')}
                    onPointerDown={(e) => {
                      // only add when clicking empty overlay
                      if ((e.target as HTMLElement).dataset.field === '1') return
                      if (!activeTool) {
                        setSelectedId(null)
                        return
                      }
                      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
                      const x = (e.clientX - rect.left) / rect.width
                      const y = (e.clientY - rect.top) / rect.height
                      const f = newField(activeTool, x, y, page, grid)
                      handleUpsertField(f)
                      setSelectedId(f.id)
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      const toolId = e.dataTransfer.getData('application/x-rf-tool')
                      const tool = TOOL_BY_ID[toolId]
                      if (!tool) return
                      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
                      const x = (e.clientX - rect.left) / rect.width
                      const y = (e.clientY - rect.top) / rect.height
                      const f = newField(tool, x, y, page, grid)
                      handleUpsertField(f)
                      setSelectedId(f.id)
                    }}
                  >
                    {fieldsOnPage.map((f) => (
                      <FieldBox
                        key={f.id}
                        field={f}
                        selected={f.id === selectedId}
                        stage={size}
                        onSelect={() => setSelectedId(f.id)}
                        onMove={(nx, ny) => handleUpsertField({ ...f, x: nx, y: ny })}
                        onResize={(nw, nh) => handleUpsertField({ ...f, w: nw, h: nh })}
                        onDuplicate={() => handleDuplicateField(f)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <PdfPageCanvas
                    key={canvasFocus ? 'focus' : 'normal'}
                    dataUrl={pdf.dataUrl ?? pdf.url}
                    page={page}
                    refreshKey={`${propertiesOpen}-${stageWidthKey}`}
                    onMeta={(m) => setNumPages(m.numPages)}
                  />

                  {/* Overlay */}
                  <div
                    className={cn('absolute inset-0', activeTool ? 'cursor-crosshair' : 'cursor-grab')}
                    onPointerDown={(e) => {
                      // only add when clicking empty overlay
                      if ((e.target as HTMLElement).dataset.field === '1') return
                      if (!activeTool) {
                        setSelectedId(null)
                        return
                      }
                      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
                      const x = (e.clientX - rect.left) / rect.width
                      const y = (e.clientY - rect.top) / rect.height
                      const f = newField(activeTool, x, y, page, grid)
                      handleUpsertField(f)
                      setSelectedId(f.id)
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      const toolId = e.dataTransfer.getData('application/x-rf-tool')
                      const tool = TOOL_BY_ID[toolId]
                      if (!tool) return
                      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
                      const x = (e.clientX - rect.left) / rect.width
                      const y = (e.clientY - rect.top) / rect.height
                      const f = newField(tool, x, y, page, grid)
                      handleUpsertField(f)
                      setSelectedId(f.id)
                    }}
                  >
                    {fieldsOnPage.map((f) => (
                      <FieldBox
                        key={f.id}
                        field={f}
                        selected={f.id === selectedId}
                        stage={size}
                        onSelect={() => setSelectedId(f.id)}
                        onMove={(nx, ny) => handleUpsertField({ ...f, x: nx, y: ny })}
                        onResize={(nw, nh) => handleUpsertField({ ...f, w: nw, h: nh })}
                        onDuplicate={() => handleDuplicateField(f)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 text-xs text-neutral-500 dark:text-neutral-400 flex justify-between gap-3">
              <div>
                {activeTool ? (
                  <>
                    Click on canvas to add: <span className="font-medium">{activeTool.label}</span>
                  </>
                ) : (
                  <span>Hand mode: click fields to select or drag</span>
                )}
              </div>
              <div>{pdf ? pdf.name : 'No PDF'}</div>
            </div>
          </CardBody>
        </Card>

        {/* Properties */}
        {showProperties && (
          <Card>
            <CardBody>
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold">Field Properties</div>
                <div className="flex items-center gap-2">
                  <button
                    className="rf-focus rounded-xl border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
                    onClick={() => setPropertiesOpen(false)}
                    title="Hide properties panel"
                  >
                    Hide
                  </button>
                  {selected && (
                    <button
                      className="rf-focus rounded-xl p-2 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                      title="Delete field"
                      onClick={() => {
                        handleDeleteField(selected.id)
                        setSelectedId(null)
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>

              {!selected ? (
                <div className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
                  Select a field on the canvas to edit.
                </div>
              ) : (
                <FieldEditor field={selected} onChange={handleUpsertField} />
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  )
}

function FieldEditor({ field, onChange }: { field: Field; onChange: (f: Field) => void | Promise<void> }) {
  const maxW = Math.max(1 - field.x, MIN_FIELD_SIZE)
  const maxH = Math.max(1 - field.y, MIN_FIELD_SIZE)
  const fontSize = field.fontSize ?? DEFAULT_FONT_SIZE
  const supportsFontSize = field.type === 'text' || field.type === 'numeric' || field.type === 'date' || field.type === 'employee' || field.type === 'select' || field.type === 'radio'
  const supportsOptions = field.type === 'select' || field.type === 'radio'
  const supportsAutoValue = field.type === 'text' || field.type === 'date'
  const optionText = supportsOptions ? (field.options ?? []).join('\n') : ''

  return (
    <div className="mt-4 space-y-4">
      <div className="space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Basics</div>
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
          <Select
            value={field.type}
            onChange={(e) => {
              const nextType = e.target.value as FieldType
              const next = { ...field, type: nextType }
              if (nextType !== 'text' && nextType !== 'date') {
                next.autoValue = undefined
                next.readOnly = false
              }
              onChange(next)
            }}
          >
            <option value="text">Text</option>
            <option value="numeric">Numeric</option>
            <option value="checkbox">Checkbox</option>
            <option value="date">Date</option>
            <option value="signature">Signature</option>
            <option value="photo">Photo</option>
            <option value="employee">Employee list</option>
            <option value="select">List (dropdown)</option>
            <option value="radio">Radio buttons</option>
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

        {supportsAutoValue && (
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Auto-fill</div>
            <Select
              value={field.autoValue ?? 'none'}
              onChange={(e) => {
                const next = e.target.value as Field['autoValue'] | 'none'
                if (next === 'none') {
                  onChange({ ...field, autoValue: undefined, readOnly: false })
                  return
                }
                onChange({ ...field, autoValue: next, readOnly: field.readOnly ?? true })
              }}
            >
              <option value="none">None</option>
              {field.type === 'date' && <option value="today">Current date</option>}
              {field.type === 'text' && <option value="creator">Creator (assigned to)</option>}
            </Select>
          </div>
        )}

        {field.autoValue && (
          <div className="flex items-center justify-between">
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Read-only</div>
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={field.readOnly ?? false}
              onChange={(e) => onChange({ ...field, readOnly: e.target.checked })}
            />
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-neutral-200/80 pt-4 dark:border-neutral-800/80">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Validation</div>
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
      </div>

      {supportsOptions && (
        <div className="space-y-3 border-t border-neutral-200/80 pt-4 dark:border-neutral-800/80">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Options</div>
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">List items</div>
            <Textarea
              value={optionText}
              placeholder="One option per line"
              onChange={(e) => {
                const nextOptions = normalizeOptionList(e.target.value.split('\n')) ?? []
                onChange({ ...field, options: nextOptions })
              }}
            />
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">One option per line. Empty lines are ignored.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rf-focus rounded-xl border border-neutral-200 px-2 py-1 text-xs hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
              onClick={() => onChange({ ...field, options: ['Yes', 'No'] })}
            >
              Yes / No
            </button>
            <button
              type="button"
              className="rf-focus rounded-xl border border-neutral-200 px-2 py-1 text-xs hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
              onClick={() => onChange({ ...field, options: ['Yes', 'No', 'NA'] })}
            >
              Yes / No / NA
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3 border-t border-neutral-200/80 pt-4 dark:border-neutral-800/80">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Guidance</div>
        <div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Hint</div>
          <Input value={field.hint ?? ''} onChange={(e) => onChange({ ...field, hint: e.target.value })} />
        </div>

        <div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Help Text</div>
          <Textarea value={field.helpText ?? ''} onChange={(e) => onChange({ ...field, helpText: e.target.value })} />
        </div>
      </div>

      {supportsFontSize && (
        <div className="space-y-3 border-t border-neutral-200/80 pt-4 dark:border-neutral-800/80">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Typography</div>
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Font size (px)</div>
            <Input
              type="number"
              min={8}
              max={36}
              value={fontSize}
              onChange={(e) => {
                const next = Number(e.target.value || DEFAULT_FONT_SIZE)
                onChange({ ...field, fontSize: Math.min(36, Math.max(8, next)) })
              }}
            />
          </div>
        </div>
      )}

      {field.type !== 'checkbox' && (
        <div className="space-y-3 border-t border-neutral-200/80 pt-4 dark:border-neutral-800/80">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Size</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">W</div>
              <Input
                type="number"
                value={Math.round(field.w * 100)}
                onChange={(e) => onChange({ ...field, w: clamp(Number(e.target.value) / 100, MIN_FIELD_SIZE, maxW) })}
              />
            </div>
            <div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">H</div>
              <Input
                type="number"
                value={Math.round(field.h * 100)}
                onChange={(e) => onChange({ ...field, h: clamp(Number(e.target.value) / 100, MIN_FIELD_SIZE, maxH) })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FieldBox({
  field,
  selected,
  stage,
  onSelect,
  onMove,
  onResize,
  onDuplicate
}: {
  field: Field
  selected: boolean
  stage: { width: number; height: number }
  onSelect: () => void
  onMove: (x: number, y: number) => void
  onResize: (w: number, h: number) => void
  onDuplicate: () => void
}) {
  const [drag, setDrag] = useState<null | { ox: number; oy: number; pid: number }>(null)
  const [resize, setResize] = useState<null | { startX: number; startY: number; w: number; h: number; pid: number }>(null)
  const grid = getGridStep(stage)

  const style = {
    left: `${field.x * 100}%`,
    top: `${field.y * 100}%`,
    width: `${field.w * 100}%`,
    height: `${field.h * 100}%`,
    touchAction: 'none'
  } as any
  const canResize = field.type !== 'checkbox'

  return (
    <div
      data-field="1"
      className={cn(
        'absolute rounded-xl border text-[11px] flex items-center justify-center select-none cursor-move',
        selected
          ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-sm dark:border-blue-300 dark:bg-blue-100 dark:text-blue-950'
          : 'border-neutral-300 bg-white/80 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-100'
      )}
      style={style}
      onPointerDown={(e) => {
        e.stopPropagation()
        onSelect()
        ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
        setDrag({ ox: e.clientX - rect.left, oy: e.clientY - rect.top, pid: e.pointerId })
      }}
      onPointerMove={(e) => {
        if (resize && resize.pid === e.pointerId) {
          e.stopPropagation()
          const parent = (e.currentTarget.parentElement as HTMLDivElement).getBoundingClientRect()
          const dx = (e.clientX - resize.startX) / parent.width
          const dy = (e.clientY - resize.startY) / parent.height
          const maxW = 1 - field.x
          const maxH = 1 - field.y
          const nextW = clamp(snapToGrid(resize.w + dx, grid.x), MIN_FIELD_SIZE, maxW)
          const nextH = clamp(snapToGrid(resize.h + dy, grid.y), MIN_FIELD_SIZE, maxH)
          onResize(nextW, nextH)
          return
        }
        if (!drag || drag.pid !== e.pointerId) return
        e.stopPropagation()
        const parent = (e.currentTarget.parentElement as HTMLDivElement).getBoundingClientRect()
        const nx = (e.clientX - parent.left - drag.ox) / parent.width
        const ny = (e.clientY - parent.top - drag.oy) / parent.height
        const maxX = 1 - field.w
        const maxY = 1 - field.h
        onMove(
          clamp(snapToGrid(nx, grid.x), 0, maxX),
          clamp(snapToGrid(ny, grid.y), 0, maxY)
        )
      }}
      onPointerUp={(e) => {
        if (drag?.pid === e.pointerId || resize?.pid === e.pointerId) {
          e.stopPropagation()
          setDrag(null)
          setResize(null)
        }
      }}
      onPointerCancel={() => {
        setDrag(null)
        setResize(null)
      }}
      onClick={(e) => {
        if (e.detail !== 3) return
        e.stopPropagation()
        onDuplicate()
      }}
    >
      <span className="px-2 truncate">{field.label}</span>
      {canResize && (
        <div
          className={cn(
            'absolute -right-1 -bottom-1 h-3 w-3 rounded-full border border-white shadow-sm cursor-se-resize',
            selected ? 'bg-blue-500' : 'bg-neutral-400'
          )}
          onPointerDown={(e) => {
            e.stopPropagation()
            onSelect()
            const box = (e.currentTarget.parentElement as HTMLDivElement)
            box.setPointerCapture(e.pointerId)
            setResize({ startX: e.clientX, startY: e.clientY, w: field.w, h: field.h, pid: e.pointerId })
          }}
        />
      )}
    </div>
  )
}

function newField(tool: ToolPreset, x: number, y: number, page: number, grid?: { x: number; y: number }): Field {
  const sizes: Record<FieldType, { w: number; h: number }> = {
    text: { w: 0.34, h: 0.055 },
    numeric: { w: 0.26, h: 0.055 },
    checkbox: { w: 0.18, h: 0.055 },
    date: { w: 0.24, h: 0.055 },
    signature: { w: 0.50, h: 0.11 },
    photo: { w: 0.50, h: 0.09 },
    employee: { w: 0.40, h: 0.055 },
    select: { w: 0.34, h: 0.055 },
    radio: { w: 0.34, h: 0.11 }
  }

  const type = tool.type
  const wh = sizes[type]
  const maxX = 1 - wh.w
  const maxY = 1 - wh.h
  const nx = clamp(snapToGrid(x, grid?.x ?? 0), 0, maxX)
  const ny = clamp(snapToGrid(y, grid?.y ?? 0), 0, maxY)
  const label = tool.label || labelFor(type)
  const keyBase = slugifyKey(tool.keyBase ?? label || type || 'field')
  const options = normalizeOptionList(tool.options)
  return {
    id: uid('fld'),
    type,
    label,
    key: `${keyBase}_${Math.random().toString(16).slice(2, 6)}`,
    required: tool.required ?? false,
    validation: tool.validation ?? (type === 'numeric' ? { kind: 'range', min: 0, max: 300 } : { kind: 'none' }),
    fontSize: DEFAULT_FONT_SIZE,
    options: options ?? (type === 'select' || type === 'radio' ? ['Option 1', 'Option 2'] : undefined),
    autoValue: tool.autoValue,
    readOnly: tool.readOnly,
    hint: tool.hint,
    helpText: tool.helpText,
    x: nx,
    y: ny,
    page,
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
    case 'employee': return 'Employees'
    case 'select': return 'List'
    case 'radio': return 'Radio Buttons'
  }
}

function slugifyKey(value: string) {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  return cleaned || 'field'
}

function normalizeOptionList(options?: string[]) {
  if (!options) return undefined
  const trimmed = options.map((opt) => opt.trim()).filter(Boolean)
  if (trimmed.length === 0) return undefined
  return Array.from(new Set(trimmed))
}

function getGridStep(stage: { width: number; height: number }) {
  const x = stage.width ? GRID_PX / stage.width : 0
  const y = stage.height ? GRID_PX / stage.height : 0
  return { x: Math.min(x, 1), y: Math.min(y, 1) }
}

function snapToGrid(value: number, step: number) {
  if (!step) return value
  return Math.round(value / step) * step
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}
