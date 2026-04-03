import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { LoaderCircle, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  LoginFormSchema,
  type LoginFormValues,
} from '../../api/authApi'
import { useLogin } from '../../hooks/useAuth'

const DEFAULT_VALUES: LoginFormValues = {
  username: '',
  password: '',
}

export function LoginPage() {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const search = useSearch({ from: '/login' })
  const navigate = useNavigate()

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginFormSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const login = useLogin()

  async function onSubmit(values: LoginFormValues) {
    setSubmitError(null)

    try {
      await login.mutateAsync(values)

      const target =
        search.redirect && search.redirect.startsWith('/')
          ? search.redirect
          : '/'

      await navigate({ to: target })
    } catch {
      setSubmitError('No se pudo iniciar sesión. Verifica tus credenciales.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-white p-6 shadow-sm">
        <div className="mb-5">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h1 className="mt-3 text-xl font-semibold text-slate-900">Acceso al sistema</h1>
          <p className="mt-1 text-sm text-slate-500">
            Inicia sesión para continuar en Facturación Médica.
          </p>
          <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Roles disponibles en contrato: <span className="font-medium">ADMIN</span>,{' '}
            <span className="font-medium">DOCTOR</span>,{' '}
            <span className="font-medium">RECEPTIONIST</span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usuario</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="username" placeholder="usuario" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      autoComplete="current-password"
                      placeholder="********"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {submitError && (
              <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {submitError}
              </p>
            )}

            <Button className="w-full" type="submit" disabled={login.isPending}>
              {login.isPending ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Ingresando...
                </>
              ) : (
                'Ingresar'
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}
