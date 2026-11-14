import { AlertTriangle, Cpu, FlaskConical, RefreshCw, Timer, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAiLab } from '../../hooks/useAi'

function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(value)
}

function formatUsd(value: number): string {
  return `$${value.toFixed(value < 0.01 && value > 0 ? 6 : 4)}`
}

export function AiLabPage() {
  const { data, isLoading, isError, refetch, isFetching } = useAiLab()

  return (
    <div className="flex flex-col">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            AI Lab
          </span>
        }
        subtitle="Configuración, consumo y evals de los asistentes. Solo lectura."
        actions={
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            Actualizar
          </Button>
        }
      />

      <div className="p-6 space-y-5">
        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 w-full" />
            ))}
          </div>
        )}

        {isError && (
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              No se pudo cargar el AI Lab. Verifica tus permisos de administrador.
            </div>
          </Card>
        )}

        {data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <Cpu className="h-4 w-4" /> Modelo
                </div>
                <p className="mt-2 text-sm font-semibold text-foreground break-all">{data.model}</p>
                <p className="mt-1 text-xs text-muted-foreground">Prompt {data.promptVersion}</p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <Timer className="h-4 w-4" /> Rate limit
                </div>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {data.rateLimitPerMinute}/min
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.distributedRateLimit ? 'Distribuido en Redis' : 'En memoria (fallback)'}
                </p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <Wallet className="h-4 w-4" /> Memoria P3
                </div>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {data.memoryMaxTurns} turnos
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  TTL {Math.round(data.memoryTtlSeconds / 60)} min por usuario + paciente
                </p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <FlaskConical className="h-4 w-4" /> Evals
                </div>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {data.evals.mode === 'manual' ? 'Manual' : data.evals.mode}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Umbrales v{data.evals.thresholdsVersion} · gate de release
                </p>
              </Card>
            </div>

            <Card className="overflow-hidden">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">Consumo acumulado</h2>
                <p className="text-xs text-muted-foreground">
                  Contadores Micrometer desde el último arranque del backend.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 font-medium">Feature</th>
                      <th className="px-4 py-2 text-right font-medium">Requests</th>
                      <th className="px-4 py-2 text-right font-medium">Errores</th>
                      <th className="px-4 py-2 text-right font-medium">Tokens in</th>
                      <th className="px-4 py-2 text-right font-medium">Tokens out</th>
                      <th className="px-4 py-2 text-right font-medium">Costo</th>
                      <th className="px-4 py-2 text-right font-medium">Latencia máx.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.usage.map((usage) => (
                      <tr key={usage.feature} className="border-t border-border">
                        <td className="px-4 py-2 font-medium text-foreground">{usage.feature}</td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {formatNumber(usage.requests)}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {formatNumber(usage.errors)}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {formatNumber(usage.promptTokens)}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {formatNumber(usage.completionTokens)}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {formatUsd(usage.costUsd)}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {formatNumber(usage.latencyMaxMs)} ms
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card className="overflow-hidden">
                <div className="border-b border-border px-4 py-3">
                  <h2 className="text-sm font-semibold text-foreground">Precios por modelo</h2>
                  <p className="text-xs text-muted-foreground">USD por millón de tokens.</p>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 font-medium">Modelo</th>
                      <th className="px-4 py-2 text-right font-medium">Entrada</th>
                      <th className="px-4 py-2 text-right font-medium">Salida</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pricing.map((price) => (
                      <tr key={price.model} className="border-t border-border">
                        <td className="px-4 py-2 font-medium text-foreground break-all">
                          {price.model}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {formatUsd(price.inputPerMillionUsd)}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {formatUsd(price.outputPerMillionUsd)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              <Card className="overflow-hidden">
                <div className="border-b border-border px-4 py-3">
                  <h2 className="text-sm font-semibold text-foreground">Umbrales de eval</h2>
                  <p className="text-xs text-muted-foreground">
                    Se ejecutan manualmente con <code>scripts/ai-eval.py</code>.
                  </p>
                </div>
                <div className="divide-y divide-border">
                  {Object.entries(data.evals.thresholds).map(([feature, limits]) => (
                    <div key={feature} className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{feature}</p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {Object.entries(limits).map(([name, value]) => (
                          <span key={name}>
                            {name}:{' '}
                            <span className="tabular-nums text-foreground">
                              {(value * 100).toFixed(0)}%
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card className="overflow-hidden">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">Features instrumentadas</h2>
                <p className="text-xs text-muted-foreground">
                  No se muestran prompts completos ni datos clínicos.
                </p>
              </div>
              <div className="divide-y divide-border">
                {data.features.map((feature) => (
                  <div key={feature.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{feature.name}</p>
                      <code className="text-xs text-muted-foreground">{feature.id}</code>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{feature.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <code>{feature.endpoint}</code> · prompt {feature.promptVersion}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
