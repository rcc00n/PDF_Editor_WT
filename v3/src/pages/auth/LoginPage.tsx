import { useState } from 'react'
import Button from '@/shared/ui/Button'
import Input from '@/shared/ui/Input'
import { Card, CardBody } from '@/shared/ui/Card'
import { useAppStore } from '@/shared/state/useAppStore'
import Logo from '@/shared/ui/Logo'

export default function LoginPage() {
  const login = useAppStore(s => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="min-h-screen relative overflow-hidden bg-orange-50 px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-orange-300/35 blur-3xl" />
        <div className="absolute top-1/4 -right-28 h-80 w-80 rounded-full bg-amber-300/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-orange-200/40 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-8 py-14">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-24 rounded-full border border-orange-200 bg-white flex items-center justify-center overflow-hidden">
            <Logo className="h-14 w-auto" />
          </div>
          <div className="text-sm font-semibold">Wolsey Tech Tracking System</div>
        </div>

        <Card className="w-full">
          <CardBody className="px-6 py-6 sm:px-7 sm:py-7">
            <form
              className="space-y-5"
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
                <div className="text-xs text-neutral-500 mb-2">Email</div>
                <Input className="h-11" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
              </div>
              <div>
                <div className="text-xs text-neutral-500 mb-2">Password</div>
                <Input className="h-11" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              </div>
              {error && <div className="text-sm text-red-600">{error}</div>}
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
