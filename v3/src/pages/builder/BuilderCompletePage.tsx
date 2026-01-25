import { useMemo } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, ArrowRight, PencilRuler, Smartphone } from 'lucide-react'
import SectionHeader from '@/shared/ui/SectionHeader'
import Button from '@/shared/ui/Button'
import { Card, CardBody } from '@/shared/ui/Card'
import Badge from '@/shared/ui/Badge'
import { useAppStore } from '@/shared/state/useAppStore'

export default function BuilderCompletePage() {
  const { formId = '' } = useParams()
  const nav = useNavigate()
  const location = useLocation()
  const forms = useAppStore(s => s.forms)

  const form = forms.find((f) => f.id === formId)
  const params = new URLSearchParams(location.search)
  const versionId = params.get('v')
  const next = params.get('next')

  const version = useMemo(() => {
    if (!form) return null
    if (versionId) {
      return form.versions.find((v) => v.id === versionId) ?? form.versions[0]
    }
    return form.versions.find((v) => v.status === 'active') ?? form.versions[0]
  }, [form, versionId])

  if (!form || !version) {
    return (
      <div className="p-6">
        <div className="text-sm text-neutral-500">Form not found.</div>
        <div className="mt-3">
          <Button variant="secondary" onClick={() => nav('/builder')}>
            Back to Builder
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-10">
      <SectionHeader
        title="Form published"
        subtitle={`${form.name} · ${version.version}`}
        right={
          <Button variant="ghost" onClick={() => nav(`/builder/${form.id}`)}>
            Back to Builder
          </Button>
        }
      />

      <div className="px-4 mt-4 sm:px-6 sm:mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardBody className="py-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="h-14 w-14 rounded-2xl border border-orange-200 bg-orange-50 flex items-center justify-center text-orange-600">
                <CheckCircle2 size={26} />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-semibold">Ready for the field team</div>
                <div className="text-sm text-neutral-500">
                  The template is live and visible in the Field App.
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
                <div className="text-xs text-orange-700/70">Form</div>
                <div className="mt-1 font-semibold truncate">{form.name}</div>
                <div className="text-xs text-neutral-500 truncate">{form.subtitle ?? 'Template'}</div>
              </div>
              <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
                <div className="text-xs text-orange-700/70">Version</div>
                <div className="mt-1 font-semibold">{version.version}</div>
                <div className="mt-1">
                  <Badge tone="success">{version.status}</Badge>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="py-8">
            <div className="text-sm font-semibold">Next steps</div>
            <div className="mt-4 flex flex-col gap-3">
              {next && (
                <Button onClick={() => nav(next)}>
                  Continue <ArrowRight size={16} />
                </Button>
              )}
              <Button variant="secondary" onClick={() => nav('/field')}>
                <Smartphone size={16} /> Open Field App
              </Button>
              <Button variant="ghost" onClick={() => nav(`/builder/${form.id}`)}>
                <PencilRuler size={16} /> Edit this form
              </Button>
              <Link to="/builder" className="text-sm text-orange-700 hover:underline">
                Go to builder home
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
