import { apiClient, refreshAccessToken } from '@/lib/axios'
import type {
  AiLabResponse,
  ExtractionResult,
  Icd10SuggestionResult,
  ItemSuggestionResult,
  PatientHistoryAnswer,
  RecordExtractionRequest,
} from '@/types/ai'

export async function suggestIcd10(query: string): Promise<Icd10SuggestionResult> {
  const response = await apiClient.post<Icd10SuggestionResult>('/ai/icd10/suggest', { query })
  return response.data
}

export async function extractRecord(data: RecordExtractionRequest): Promise<ExtractionResult> {
  const response = await apiClient.post<ExtractionResult>('/ai/records/extract', data)
  return response.data
}

export async function suggestItems(invoiceId: string): Promise<ItemSuggestionResult> {
  const response = await apiClient.post<ItemSuggestionResult>(
    `/ai/invoices/${invoiceId}/suggest-items`,
  )
  return response.data
}

export async function queryHistory(
  patientId: string,
  question: string,
): Promise<PatientHistoryAnswer> {
  const response = await apiClient.post<PatientHistoryAnswer>(`/ai/patients/${patientId}/query`, {
    question,
  })
  return response.data
}

export async function clearHistoryConversation(patientId: string): Promise<void> {
  await apiClient.delete(`/ai/patients/${patientId}/conversation`)
}

export async function getAiLab(): Promise<AiLabResponse> {
  const response = await apiClient.get<AiLabResponse>('/ai/lab')
  return response.data
}

export interface HistoryStreamHandlers {
  onToken: (token: string) => void
  onDone: (answer: PatientHistoryAnswer) => void
  onError: (error: Error) => void
}

interface SseEvent {
  event: string
  data: string
}

function parseSseBlock(block: string): SseEvent | null {
  let event = 'message'
  const dataLines: string[] = []

  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).replace(/^ /, ''))
    }
  }

  if (dataLines.length === 0) {
    return null
  }
  return { event, data: dataLines.join('\n') }
}

function dispatchEvent({ event, data }: SseEvent, handlers: HistoryStreamHandlers) {
  if (event === 'token') {
    handlers.onToken(data)
    return
  }
  if (event === 'done') {
    handlers.onDone(JSON.parse(data) as PatientHistoryAnswer)
    return
  }
  if (event === 'error') {
    let message = 'No se pudo completar la consulta.'
    try {
      message = (JSON.parse(data) as { message?: string }).message ?? message
    } catch {
      message = data || message
    }
    handlers.onError(new Error(message))
  }
}

async function readError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: string }
    return payload.message ?? `Error ${response.status}`
  } catch {
    return `Error ${response.status}`
  }
}

/**
 * Consume el endpoint SSE de P3. Usa fetch (no axios) para leer el cuerpo por
 * chunks; las cookies httpOnly viajan con credentials: 'include'.
 */
export async function queryHistoryStream(
  patientId: string,
  question: string,
  handlers: HistoryStreamHandlers,
): Promise<void> {
  const url = `/api/v1/ai/patients/${patientId}/query/stream`
  const request = () =>
    fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question }),
    })

  let response = await request()
  if (response.status === 401) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      response = await request()
    }
  }

  if (!response.ok || !response.body) {
    throw new Error(await readError(response))
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      buffer += decoder.decode(value, { stream: true })

      let separator = buffer.indexOf('\n\n')
      while (separator >= 0) {
        const block = buffer.slice(0, separator)
        buffer = buffer.slice(separator + 2)
        const parsed = parseSseBlock(block)
        if (parsed) {
          dispatchEvent(parsed, handlers)
        }
        separator = buffer.indexOf('\n\n')
      }
    }
  } finally {
    reader.releaseLock()
  }
}
