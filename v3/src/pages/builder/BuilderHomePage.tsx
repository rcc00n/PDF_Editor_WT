import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SectionHeader from '@/shared/ui/SectionHeader'
import Button from '@/shared/ui/Button'
import { Card, CardBody } from '@/shared/ui/Card'
import { useAppStore } from '@/shared/state/useAppStore'
import { Plus } from 'lucide-react'

export default function BuilderHomePage() {
  const nav = useNavigate()
  const forms = useAppStore(s => s.forms)
  const role = useAppStore(s => s.role)
  const createForm = useAppStore(s => s.createForm)
  const pushToast = useAppStore(s => s.pushToast)
  const canEdit = role === 'admin'
  const firstForm = forms[0]

  useEffect(() => {
    if (firstForm) {
      nav(`/builder/${firstForm.id}`, { replace: true })
    }
  }, [firstForm, nav])

  if (firstForm) return null

  return (
    <div className="pb-10">
      <SectionHeader
        title="Builder"
        subtitle="Create and maintain form templates in one place."
        right={
          canEdit ? (
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
              <Plus size={16} /> Create New Form
            </Button>
          ) : null
        }
      />

      <div className="px-5 sm:px-7 mt-6">
        <Card>
          <CardBody className="py-8">
            <div className="text-sm font-semibold">No templates yet</div>
            <div className="text-sm text-neutral-500 mt-2">
              Start by creating your first form template.
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
