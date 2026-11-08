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

const {
  handleResponseError,
  refreshAccessToken,
} = await import('@/lib/axios')

const {
  clearAuthSession,
  getAuthSessionState,
  setAuthSession,
} = await import('@/features/auth/store/authSessionStore')

const adminSession = {
  accessToken: 'access-123',
  refreshToken: 'refresh-456',
  tokenType: 'Bearer' as const,
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

function refreshPayload(accessToken: string, refreshToken: string | null) {
  return {
    data: {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      role: 'ADMIN',
      userId: 'user-1',
      username: 'admin',
    },
  }
}

beforeEach(() => {
  clearAuthSession()
  mocks.post.mockReset()
  mocks.toastError.mockReset()
  mocks.instance.mockReset()
  mocks.instance.mockResolvedValue({ data: 'ok' })
})

describe('refreshAccessToken', () => {
  it('devuelve null y limpia la sesión si no hay refresh token', async () => {
    const result = await refreshAccessToken()

    expect(result).toBeNull()
    expect(mocks.post).not.toHaveBeenCalled()
  })

  it('renueva el access token y persiste el refresh token rotado', async () => {
    setAuthSession(adminSession)
    mocks.post.mockResolvedValueOnce(refreshPayload('access-2', 'refresh-2'))

    const result = await refreshAccessToken()

    expect(result).toBe('access-2')
    expect(mocks.post).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'),
      { refreshToken: 'refresh-456' },
      expect.anything(),
    )
    expect(getAuthSessionState().refreshToken).toBe('refresh-2')
  })

  it('usa el refresh token rotado en el siguiente refresh (no lo destruye)', async () => {
    setAuthSession(adminSession)
    mocks.post.mockResolvedValueOnce(refreshPayload('access-2', 'refresh-2'))
    await refreshAccessToken()

    mocks.post.mockResolvedValueOnce(refreshPayload('access-3', 'refresh-3'))
    await refreshAccessToken()

    expect(mocks.post.mock.calls[1][1]).toEqual({ refreshToken: 'refresh-2' })
    expect(getAuthSessionState().refreshToken).toBe('refresh-3')
  })

  it('conserva el refresh token anterior si el backend responde null', async () => {
    setAuthSession(adminSession)
    mocks.post.mockResolvedValueOnce(refreshPayload('access-2', null))

    await refreshAccessToken()

    expect(getAuthSessionState().accessToken).toBe('access-2')
    expect(getAuthSessionState().refreshToken).toBe('refresh-456')
  })

  it('limpia la sesión si el refresh falla', async () => {
    setAuthSession(adminSession)
    mocks.post.mockRejectedValueOnce(new Error('invalid refresh'))

    const result = await refreshAccessToken()

    expect(result).toBeNull()
    expect(getAuthSessionState().accessToken).toBeNull()
    expect(getAuthSessionState().refreshToken).toBeNull()
  })
})

describe('handleResponseError', () => {
  it('reintenta la request original con el access token renovado', async () => {
    setAuthSession(adminSession)
    mocks.post.mockResolvedValueOnce(refreshPayload('access-2', 'refresh-2'))
    const error = unauthorized('/patients')

    await handleResponseError(error)

    expect(mocks.instance).toHaveBeenCalledWith(error.config)
    expect(error.config.headers.Authorization).toBe('Bearer access-2')
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

    resolveRefresh?.(refreshPayload('access-2', 'refresh-2'))
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
