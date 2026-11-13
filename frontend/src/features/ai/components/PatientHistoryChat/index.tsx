import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Send, Trash2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { AiBadge, AiIcon } from '@/components/ui/ai-badge'
import { formatDate } from '@/lib/utils'
import type { PatientHistoryAnswer } from '@/types/ai'
import { clearHistoryConversation, queryHistoryStream } from '../../api/aiApi'

interface ConversationEntry {
  question: string
  answer: PatientHistoryAnswer
}

interface PatientHistoryChatProps {
  patientId: string
}

const MARKDOWN_CLASS =
  'text-sm leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-2 [&_ul]:space-y-0.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-2 [&_ol]:space-y-0.5 [&_li]:text-foreground [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:font-medium [&_h3]:text-foreground [&_h3]:mt-2 [&_h3]:mb-1 [&_strong]:font-semibold [&_strong]:text-foreground text-foreground'

export function PatientHistoryChat({ patientId }: PatientHistoryChatProps) {
  const [history, setHistory] = useState<ConversationEntry[]>([])
  const [question, setQuestion] = useState('')
  const [pendingQuestion, setPendingQuestion] = useState('')
  const [streamingAnswer, setStreamingAnswer] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [hasQueried, setHasQueried] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, streamingAnswer, isStreaming])

  async function handleSubmit() {
    const trimmed = question.trim()
    if (!trimmed || isStreaming) return

    setPendingQuestion(trimmed)
    setQuestion('')
    setStreamingAnswer('')
    setIsStreaming(true)

    try {
      await queryHistoryStream(patientId, trimmed, {
        onToken: (token) => setStreamingAnswer((prev) => prev + token),
        onDone: (answer) => {
          setHistory((prev) => [...prev, { question: trimmed, answer }])
          setHasQueried(true)
        },
        onError: (error) => {
          toast.error(error.message)
        },
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al consultar el historial.')
    } finally {
      setIsStreaming(false)
      setStreamingAnswer('')
    }
  }

  function handleClear() {
    setHistory([])
    setHasQueried(false)
    setStreamingAnswer('')
    // La memoria conversacional vive en el servidor: hay que borrarla para que la
    // siguiente pregunta no arrastre turnos anteriores.
    void clearHistoryConversation(patientId).catch(() => {
      toast.error('No se pudo limpiar la conversación en el servidor.')
    })
  }

  const loadingMessage = !hasQueried
    ? 'Indexando historial del paciente por primera vez, esto puede tardar unos segundos...'
    : 'Consultando historial...'

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <AiIcon />
          <h2 className="text-sm font-semibold text-foreground">Consultar historial</h2>
          <AiBadge />
        </div>
        {history.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive h-7 px-2"
            onClick={handleClear}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Empty placeholder */}
      {history.length === 0 && !isStreaming && (
        <p className="text-sm text-muted-foreground mb-4">
          Haz una pregunta sobre el historial clínico del paciente.
        </p>
      )}

      {/* Conversation + streaming */}
      {(history.length > 0 || isStreaming) && (
        <div className="space-y-4 mb-4 max-h-[32rem] overflow-y-auto pr-1">
          {history.map((entry, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2 shadow-sm">
                  <p className="text-sm text-primary-foreground">{entry.question}</p>
                </div>
              </div>

              <div className="rounded-xl rounded-tl-sm border border-border bg-muted/40 px-4 py-3">
                <div className={MARKDOWN_CLASS}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.answer.answer}</ReactMarkdown>
                </div>

                {entry.answer.sources.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-border">
                    <span className="text-xs text-muted-foreground">Fuentes:</span>
                    {entry.answer.sources.map((source) => (
                      <Link
                        key={source.medicalRecordId}
                        to="/medical-records/$id"
                        params={{ id: source.medicalRecordId }}
                        className="text-xs rounded-full border border-info/25 bg-info/10 text-info px-2.5 py-0.5 hover:bg-info/15 transition-colors"
                      >
                        Exp. {formatDate(source.recordDate)}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isStreaming && (
            <div className="space-y-2">
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2 opacity-60">
                  <p className="text-sm text-primary-foreground">{pendingQuestion}</p>
                </div>
              </div>
              <div className="rounded-xl rounded-tl-sm border border-border bg-muted/40 px-4 py-3 space-y-2">
                {streamingAnswer ? (
                  <div className={MARKDOWN_CLASS}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingAnswer}</ReactMarkdown>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground italic">{loadingMessage}</p>
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3.5 w-5/6" />
                    <Skeleton className="h-3.5 w-3/5" />
                  </>
                )}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 items-end">
        <Textarea
          placeholder="ej. ¿Cuáles son sus condiciones crónicas?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void handleSubmit()
            }
          }}
          rows={2}
          className="resize-none text-sm"
          disabled={isStreaming}
        />
        <Button
          size="icon"
          disabled={!question.trim() || isStreaming}
          onClick={() => void handleSubmit()}
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-1.5">
        Enter para enviar · Shift+Enter para salto de línea
      </p>
    </section>
  )
}
