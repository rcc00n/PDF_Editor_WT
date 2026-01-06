import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SectionHeader from '@/shared/ui/SectionHeader'
import Button from '@/shared/ui/Button'
import { Card, CardBody } from '@/shared/ui/Card'
import Badge from '@/shared/ui/Badge'
import Modal from '@/shared/ui/Modal'
import Input from '@/shared/ui/Input'
import { useAppStore } from '@/shared/state/useAppStore'
import { Plus, GitBranchPlus, Archive, ArrowRight } from 'lucide-react'

export default function FormsPage() {
  const nav = useNavigate()
  const forms = useAppStore(s => s.forms)
  const createForm = useAppStore(s => s.createForm)
  const createVersion = useAppStore(s => s.createVersion)
  const archiveForm = useAppStore(s => s.archiveForm)

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')

  const rows = useMemo(() => forms.map(f => ({ f, v: f.versions[0] })), [forms])

  return (
    <div className="pb-10">
      <SectionHeader
        title="Forms"
        subtitle="Templates, versions, and publish flow."
        right={
          <Button variant="secondary" onClick={() => { setName(''); setOpen(true) }}>
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
                            onClick={() => {
                              const newV = createVersion(f.id)
                              nav(`/builder/${f.id}?v=${newV}`)
                            }}
                            title="Create new version"
                          >
                            <GitBranchPlus size={16} /> New Version
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="w-full sm:w-auto"
                            onClick={() => nav(`/builder/${f.id}`)}
                          >
                            Open <ArrowRight size={16} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-full sm:w-auto"
                            onClick={() => archiveForm(f.id)}
                            title="Archive"
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
              onClick={() => {
                const id = createForm((name || 'New Form').trim())
                setOpen(false)
                nav(`/builder/${id}`)
              }}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
