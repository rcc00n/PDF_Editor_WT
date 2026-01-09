import { useState } from 'react'
import Button from '@/shared/ui/Button'
import Input from '@/shared/ui/Input'
import { Card, CardBody } from '@/shared/ui/Card'
import { useAppStore } from '@/shared/state/useAppStore'
import { Sparkles } from 'lucide-react'

export default function LoginPage() {
  const login = useAppStore(s => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="min-h-screen relative overflow-hidden bg-neutral-50 dark:bg-neutral-950 px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute top-1/4 -right-28 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-emerald-400/15 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-6 py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <div className="h-full w-full bg-gradient-to-br from-cyan-400/80 via-blue-500/70 to-fuchsia-500/70 text-white flex items-center justify-center">
              <Sparkles size={22} />
            </div>
          </div>
          <div className="text-sm font-semibold">RelayForms</div>
        </div>

        <Card className="w-full">
          <CardBody>
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault()
                setError(null)
                setLoading(true)
                try {
                  await login(email.trim(), password)
                } catch (err: any) {
                  setError(err?.message || 'Sign in failed')
                } finally {
                  setLoading(false)
                }
              }}
            >
              <div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Email</div>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
              </div>
              <div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Password</div>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              </div>
              {error && <div className="text-sm text-red-600 dark:text-red-300">{error}</div>}
              <Button type="submit" className="w-full" disabled={!email || !password || loading}>
                {loading ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
