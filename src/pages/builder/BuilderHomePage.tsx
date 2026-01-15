import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SectionHeader from '@/shared/ui/SectionHeader'
import Button from '@/shared/ui/Button'
import Input from '@/shared/ui/Input'
import Badge from '@/shared/ui/Badge'
import { Card, CardBody } from '@/shared/ui/Card'
import { useAppStore } from '@/shared/state/useAppStore'
import { ArrowRight, GitBranchPlus, Plus } from 'lucide-react'

export default function BuilderHomePage() {
  const nav = useNavigate()
  const forms = useAppStore(s => s.forms)
  const role = useAppStore(s => s.role)
  const createForm = useAppStore(s => s.createForm)
  const createVersion = useAppStore(s => s.createVersion)
  const pushToast = useAppStore(s => s.pushToast)
  const canEdit = role === 'admin'
  const [query, setQuery] = useState('')

  const rows = useMemo(
    () =>
      forms.map(form => ({
        form,
        version: form.versions.find(v => v.status === 'active') ?? form.versions[0]
      })),
    [forms]
  )

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(({ form, version }) => {
      const haystack = [
        form.name,
        form.subtitle ?? '',
        form.id,
        version.version,
        version.status,
        String(version.fieldCount)
      ]
      return haystack.some(value => value.toLowerCase().includes(q))
    })
  }, [query, rows])

  const hasForms = rows.length > 0

  return (
    <div className="pb-10">
      <SectionHeader
        title="Builder"
        subtitle="Templates and versions ready for editing."
        right={
          hasForms || canEdit ? (
            <>
              {hasForms && (
                <div className="w-full sm:w-64">
                  <Input
                    type="search"
                    placeholder="Search templates"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                  />
                </div>
              )}
              {canEdit ? (
                <Button
                  onClick={async () => {
                    try {
                      const id = await createForm('New Form')
                      nav(`/builder/${id}`)
                    } catch (err: any) {
                      pushToast({
                        title: 'Create failed',
                        message: err?.message || 'Unable to create form',
                        variant: 'danger'
                      })
                    }
                  }}
                >
                  <Plus size={16} /> New Form
                </Button>
              ) : null}
            </>
          ) : null
        }
      />

      <div className="px-5 sm:px-7 mt-6">
        <Card>
          <CardBody className={hasForms ? '' : 'py-8'}>
            {!hasForms ? (
              <>
                <div className="text-sm font-semibold">No templates yet</div>
                <div className="text-sm text-neutral-500 mt-2">
                  Start by creating your first form template.
                </div>
              </>
            ) : (
              <div className="overflow-auto rf-scrollbar">
                <table className="w-full text-sm">
                  <thead className="text-xs text-neutral-500">
                    <tr className="text-left">
                      <th className="py-2">Template</th>
                      <th className="py-2 hidden sm:table-cell">Current version</th>
                      <th className="py-2 hidden sm:table-cell">Status</th>
                      <th className="py-2 hidden md:table-cell">Fields</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map(({ form, version }) => (
                      <tr
                        key={form.id}
                        className="border-t border-neutral-200 cursor-pointer transition-colors hover:bg-orange-50/40 focus-within:bg-orange-50/40"
                        role="button"
                        tabIndex={0}
                        onClick={() => nav(`/builder/${form.id}`)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            nav(`/builder/${form.id}`)
                          }
                        }}
                      >
                        <td className="py-3">
                          <div className="font-medium">{form.name}</div>
                          {form.subtitle && (
                            <div className="text-xs text-neutral-500">{form.subtitle}</div>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500 sm:hidden">
                            <span>{version.version}</span>
                            <span>·</span>
                            <span>{version.fieldCount} fields</span>
                          </div>
                          <div className="mt-2 sm:hidden">
                            <Badge tone={statusTone(version.status)}>{version.status}</Badge>
                          </div>
                        </td>
                        <td className="py-3 hidden sm:table-cell">{version.version}</td>
                        <td className="py-3 hidden sm:table-cell">
                          <Badge tone={statusTone(version.status)}>{version.status}</Badge>
                        </td>
                        <td className="py-3 hidden md:table-cell">{version.fieldCount}</td>
                        <td className="py-3 text-right">
                          <div className="flex w-full flex-col items-stretch gap-2 sm:inline-flex sm:w-auto sm:flex-row sm:items-center">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="w-full sm:w-auto"
                              disabled={!canEdit}
                              onClick={async e => {
                                e.stopPropagation()
                                if (!canEdit) return
                                try {
                                  const newV = await createVersion(form.id)
                                  nav(`/builder/${form.id}?v=${newV}`)
                                } catch (err: any) {
                                  pushToast({
                                    title: 'Version failed',
                                    message: err?.message || 'Unable to create version',
                                    variant: 'danger'
                                  })
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
                              onClick={e => {
                                e.stopPropagation()
                                nav(`/builder/${form.id}`)
                              }}
                            >
                              Open <ArrowRight size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredRows.length === 0 && (
                      <tr>
                        <td
                          className="py-10 text-center text-sm text-neutral-500"
                          colSpan={5}
                        >
                          {query.trim()
                            ? 'No templates match that search'
                            : 'No templates yet'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

function statusTone(status: string): 'success' | 'warning' | 'neutral' {
  return status === 'active' ? 'success' : status === 'draft' ? 'warning' : 'neutral'
}
