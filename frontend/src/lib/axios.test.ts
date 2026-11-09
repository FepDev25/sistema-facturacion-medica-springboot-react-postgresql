import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const instance = vi.fn() as ReturnType<typeof vi.fn> & {
    interceptors: {
      request: { use: ReturnType<typeof vi.fn> }
      response: { use: ReturnType<typeof vi.fn> }
    }
  }
  instance.interceptors = {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  }

  return {
    instance,
    post: vi.fn(),
    toastError: vi.fn(),
  }
})

vi.mock('axios', () => ({
  default: {
    create: () => mocks.instance,
    post: mocks.post,
  },
}))

vi.mock('sonner', () => ({
  toast: { error: mocks.toastError },
}))

const { handleResponseError, refreshAccessToken } = await import('@/lib/axios')

const { clearAuthSession, getAuthSessionState, setAuthSession } =
  await import('@/features/auth/store/authSessionStore')

const adminSession = {
  role: 'ADMIN' as const,
  userId: 'user-1',
  username: 'admin',
}

function unauthorized(url = '/patients') {
  return {
    config: { url, headers: {} as Record<string, string> },
    response: { status: 401, data: {} },
  }
}

function sessionPayload() {
  return {
    data: {
      role: 'ADMIN',
      userId: 'user-1',
      username: 'admin',
    },
  }
}

beforeEach(() => {
  clearAuthSession()
  window.localStorage.clear()
  mocks.post.mockReset()
  mocks.toastError.mockReset()
  mocks.instance.mockReset()
  mocks.instance.mockResolvedValue({ data: 'ok' })
})

describe('refreshAccessToken', () => {
  it('devuelve false y limpia la sesión si no está autenticado', async () => {
    const result = await refreshAccessToken()

    expect(result).toBe(false)
    expect(mocks.post).not.toHaveBeenCalled()
  })

  it('renueva la sesión usando la cookie httpOnly', async () => {
    setAuthSession(adminSession)
    mocks.post.mockResolvedValueOnce(sessionPayload())

    const result = await refreshAccessToken()

    expect(result).toBe(true)
    expect(mocks.post).toHaveBeenCalledWith(expect.stringContaining('/auth/refresh'), undefined, {
      withCredentials: true,
    })
    expect(getAuthSessionState().authenticated).toBe(true)
  })

  it('no repite el refresh si otra pestaña acaba de rotar la cookie', async () => {
    setAuthSession(adminSession)
    window.localStorage.setItem('sfm.auth.last-refresh', String(Date.now()))

    const result = await refreshAccessToken()

    expect(result).toBe(true)
    expect(mocks.post).not.toHaveBeenCalled()
  })

  it('ignora marcas de refresh futuras o inválidas', async () => {
    setAuthSession(adminSession)
    window.localStorage.setItem('sfm.auth.last-refresh', String(Date.now() + 60_000))
    mocks.post.mockResolvedValueOnce(sessionPayload())

    const result = await refreshAccessToken()

    expect(result).toBe(true)
    expect(mocks.post).toHaveBeenCalledTimes(1)
  })

  it('limpia la sesión si el refresh falla', async () => {
    setAuthSession(adminSession)
    mocks.post.mockRejectedValueOnce(new Error('invalid refresh'))

    const result = await refreshAccessToken()

    expect(result).toBe(false)
    expect(getAuthSessionState().authenticated).toBe(false)
  })
})

describe('handleResponseError', () => {
  it('reintenta la request original tras renovar la cookie', async () => {
    setAuthSession(adminSession)
    mocks.post.mockResolvedValueOnce(sessionPayload())
    const error = unauthorized('/patients')

    await handleResponseError(error)

    expect(mocks.instance).toHaveBeenCalledWith(error.config)
    expect(error.config.headers.Authorization).toBeUndefined()
  })

  it('refresca una sola vez cuando varias requests reciben 401 en paralelo', async () => {
    setAuthSession(adminSession)

    let resolveRefresh: ((value: unknown) => void) | undefined
    mocks.post.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRefresh = resolve
      }),
    )

    const first = handleResponseError(unauthorized('/patients'))
    const second = handleResponseError(unauthorized('/invoices'))

    resolveRefresh?.(sessionPayload())
    await Promise.all([first, second])

    expect(mocks.post).toHaveBeenCalledTimes(1)
  })

  it('no reintenta si la request ya se reintentó una vez', async () => {
    setAuthSession(adminSession)
    const error = unauthorized()
    ;(error.config as Record<string, unknown>)._retry = true

    await expect(handleResponseError(error)).rejects.toBe(error)
    expect(mocks.post).not.toHaveBeenCalled()
  })

  it('no muestra toast de permisos si el 403 no es de autorización', async () => {
    const error = {
      config: { url: '/patients', headers: {} },
      response: { status: 403, data: { message: 'Operación inválida' } },
    }

    await expect(handleResponseError(error)).rejects.toBe(error)
    expect(mocks.toastError).toHaveBeenCalledWith('Operación inválida')
  })
})
