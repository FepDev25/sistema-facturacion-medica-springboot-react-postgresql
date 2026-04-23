import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Send, Sparkles, Trash2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'
import type { PatientHistoryAnswer } from '@/types/ai'
import { useQueryHistory } from '../../hooks/useAi'

interface ConversationEntry {
  question: string
  answer: PatientHistoryAnswer
}

interface PatientHistoryChatProps {
  patientId: string
}

export function PatientHistoryChat({ patientId }: PatientHistoryChatProps) {
  const [history, setHistory] = useState<ConversationEntry[]>([])
  const [question, setQuestion] = useState('')
  const [pendingQuestion, setPendingQuestion] = useState('')
  const [hasQueried, setHasQueried] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const queryHistory = useQueryHistory()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, queryHistory.isPending])

  function handleSubmit() {
    const trimmed = question.trim()
    if (!trimmed || queryHistory.isPending) return

    setPendingQuestion(trimmed)
    setQuestion('')

    queryHistory.mutate(
      { patientId, question: trimmed },
      {
        onSuccess: (data) => {
          setHistory((prev) => [...prev, { question: trimmed, answer: data }])
          setHasQueried(true)
        },
      },
    )
  }

  const loadingMessage = !hasQueried
    ? 'Indexando historial del paciente por primera vez, esto puede tardar unos segundos...'
    : 'Consultando historial...'

  return (
    <section className="rounded-md border border-border bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">Consultar historial con IA</h2>
        </div>
        {history.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="text-slate-500 hover:text-red-600 h-7 px-2"
            onClick={() => {
              setHistory([])
              setHasQueried(false)
            }}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Empty placeholder */}
      {history.length === 0 && !queryHistory.isPending && (
        <p className="text-sm text-slate-400 mb-4 italic">
          Haz una pregunta sobre el historial clínico del paciente.
        </p>
      )}

      {/* Conversation + loading */}
      {(history.length > 0 || queryHistory.isPending) && (
        <div className="space-y-4 mb-4 max-h-[32rem] overflow-y-auto pr-1">
          {history.map((entry, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-lg bg-slate-100 px-3 py-2">
                  <p className="text-sm text-slate-800">{entry.question}</p>
                </div>
              </div>

              <div className="rounded-md border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="text-sm leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-2 [&_ul]:space-y-0.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-2 [&_ol]:space-y-0.5 [&_li]:text-slate-700 [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:font-medium [&_h3]:text-slate-800 [&_h3]:mt-2 [&_h3]:mb-1 [&_strong]:font-semibold [&_strong]:text-slate-900 text-slate-700">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {entry.answer.answer}
                  </ReactMarkdown>
                </div>

                {entry.answer.sources.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-slate-200">
                    <span className="text-xs text-slate-500">Fuentes:</span>
                    {entry.answer.sources.map((source) => (
                      <Link
                        key={source.medicalRecordId}
                        to="/medical-records/$id"
                        params={{ id: source.medicalRecordId }}
                        className="text-xs rounded-full border border-blue-200 bg-blue-50 text-blue-700 px-2.5 py-0.5 hover:bg-blue-100 transition-colors"
                      >
                        Exp. {formatDate(source.recordDate)}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {queryHistory.isPending && (
            <div className="space-y-2">
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-lg bg-slate-100 px-3 py-2 opacity-60">
                  <p className="text-sm text-slate-800">{pendingQuestion}</p>
                </div>
              </div>
              <div className="rounded-md border border-slate-100 bg-slate-50 px-4 py-3 space-y-2">
                <p className="text-xs text-slate-400 italic">{loadingMessage}</p>
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-5/6" />
                <Skeleton className="h-3.5 w-3/5" />
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
              handleSubmit()
            }
          }}
          rows={2}
          className="resize-none text-sm"
          disabled={queryHistory.isPending}
        />
        <Button
          size="icon"
          disabled={!question.trim() || queryHistory.isPending}
          onClick={handleSubmit}
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-slate-400 mt-1.5">Enter para enviar · Shift+Enter para salto de línea</p>
    </section>
  )
}
