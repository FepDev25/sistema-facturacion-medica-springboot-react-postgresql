import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Activity, Check, LoaderCircle, ShieldCheck, Sparkles } from 'lucide-react'
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

const HIGHLIGHTS = [
  { icon: Activity, text: 'Expediente clínico y facturación en un solo flujo' },
  { icon: Sparkles, text: '4 asistentes de IA: códigos CIE-10, extracción clínica y más' },
  { icon: Check, text: 'Control de seguros, pagos y auditoría' },
]

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
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex bg-[linear-gradient(150deg,oklch(0.52_0.14_205)_0%,oklch(0.40_0.12_222)_100%)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-white/10 blur-2xl"
        />

        <div className="relative flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div className="leading-tight">
            <p className="text-xs uppercase tracking-[0.2em] text-white/70">Sistema</p>
            <p className="text-lg font-semibold">Facturación Médica</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Gestión clínica y facturación, con IA integrada.
          </h2>
          <p className="mt-3 text-sm text-white/80">
            Plataforma para administrar pacientes, citas, expedientes y cobranza desde un único
            panel.
          </p>

          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-white/90">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/15">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/60">
          © {new Date().getFullYear()} Sistema de Facturación Médica
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-sm">
          <div className="mb-7">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary lg:hidden">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground lg:mt-0">
              Acceso al sistema
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Inicia sesión para continuar en Facturación Médica.
            </p>
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
    </div>
  )
}
