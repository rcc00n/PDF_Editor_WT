import { useState } from 'react'
import Button from '@/shared/ui/Button'
import Input from '@/shared/ui/Input'
import { Card, CardBody, CardHeader, CardSub, CardTitle } from '@/shared/ui/Card'
import { useAppStore } from '@/shared/state/useAppStore'

export default function LoginPage() {
  const login = useAppStore(s => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>RelayForms</CardTitle>
          <CardSub>Sign in to continue</CardSub>
        </CardHeader>
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
  )
}
