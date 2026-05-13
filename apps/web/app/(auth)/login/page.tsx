'use client'
import { useActionState } from 'react'
import { loginAction } from './actions'
import type { LoginState } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(
    loginAction,
    null
  )

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--color-primary)' }}
        >
          BMS
        </p>
        <CardTitle className="text-xl">Sign in</CardTitle>
        <CardDescription>Kgolaentle Holdings internal system</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div
              className="rounded-md px-3 py-2 text-sm"
              style={{ backgroundColor: '#fef2f2', color: 'var(--color-destructive)' }}
            >
              {state.error}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@kgolaentle.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
