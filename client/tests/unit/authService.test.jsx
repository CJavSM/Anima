import { authService } from '../../src/services/authService'

// Mock the underlying api module used by authService
const mockPost = vi.fn()
const mockGet = vi.fn()
const mockPatch = vi.fn()

vi.mock('../../src/config/api', () => ({
  __esModule: true,
  default: {
    post: (...args) => mockPost(...args),
    get: (...args) => mockGet(...args),
    patch: (...args) => mockPatch(...args),
    defaults: { baseURL: 'http://test' },
    interceptors: { request: { use: () => {} }, response: { use: () => {} } }
  }
}))

describe('authService', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
  })

  test('login success saves session and returns data', async () => {
    mockPost.mockResolvedValue({ data: { access_token: 'tok', user: { username: 'u1' } } })

    const res = await authService.login({ username_or_email: 'u', password: 'p' })

    expect(res).toEqual({ access_token: 'tok', user: { username: 'u1' } })
    expect(localStorage.getItem('token')).toBe('tok')
    expect(JSON.parse(localStorage.getItem('user'))).toEqual({ username: 'u1' })
    expect(mockPost).toHaveBeenCalledWith('/api/auth/login', { username_or_email: 'u', password: 'p' })
  })

  test('login 401 throws friendly message', async () => {
    const err = { response: { status: 401, data: { detail: 'Bad creds' } } }
    mockPost.mockRejectedValue(err)

    await expect(authService.login({ username_or_email: 'x', password: 'y' })).rejects.toThrow('Bad creds')
  })

  test('register success returns data', async () => {
    mockPost.mockResolvedValue({ data: { id: 5 } })

    const res = await authService.register({ username: 'u' })
    expect(res).toEqual({ id: 5 })
    expect(mockPost).toHaveBeenCalledWith('/api/auth/register', { username: 'u' })
  })

  test('register 400 with array detail throws combined message', async () => {
    const detail = [{ msg: 'A' }, { msg: 'B' }]
    const err = { response: { status: 400, data: { detail } } }
    mockPost.mockRejectedValue(err)

    await expect(authService.register({})).rejects.toThrow('A, B')
  })

  test('me returns user data', async () => {
    mockGet.mockResolvedValue({ data: { username: 'me' } })
    const data = await authService.me()
    expect(data).toEqual({ username: 'me' })
    expect(mockGet).toHaveBeenCalledWith('/api/auth/me')
  })

  test('getSpotifyAuthUrl returns authorization_url', async () => {
    mockGet.mockResolvedValue({ data: { authorization_url: 'https://s' } })
    const url = await authService.getSpotifyAuthUrl()
    expect(url).toBe('https://s')
    expect(mockGet).toHaveBeenCalledWith('/api/auth/spotify/login', { skipAuth: true })
  })

  test('exchangeSpotifyCode saves token and user', async () => {
    mockPost.mockResolvedValue({ data: { access_token: 'TOK', user: { username: 'u2' } } })
    const res = await authService.exchangeSpotifyCode('code123')
    expect(res).toEqual({ access_token: 'TOK', user: { username: 'u2' } })
    expect(localStorage.getItem('token')).toBe('TOK')
    expect(JSON.parse(localStorage.getItem('user'))).toEqual({ username: 'u2' })
  })

  test('logout clears session', () => {
    localStorage.setItem('token', 'x')
    localStorage.setItem('user', JSON.stringify({ username: 'u' }))
    authService.logout()
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
  })

  test('register 400 with string detail throws detail message', async () => {
    const err = { response: { status: 400, data: { detail: 'Email exists' } } }
    mockPost.mockRejectedValue(err)
    await expect(authService.register({})).rejects.toThrow('Email exists')
  })

  test('getSpotifyLinkUrl throws when backend returns error', async () => {
    mockGet.mockResolvedValue({ data: { error: 'nope' } })
    await expect(authService.getSpotifyLinkUrl()).rejects.toThrow('nope')
  })

  test('linkSpotify saves session and returns data', async () => {
    mockPost.mockResolvedValue({ data: { access_token: 'LAT', user: { username: 'lu' } } })
    const res = await authService.linkSpotify('code123')
    expect(res).toEqual({ access_token: 'LAT', user: { username: 'lu' } })
    expect(localStorage.getItem('token')).toBe('LAT')
  })

  test('disconnectSpotify returns data on success', async () => {
    mockPost.mockResolvedValue({ data: { disconnected: true } })
    const res = await authService.disconnectSpotify()
    expect(res).toEqual({ disconnected: true })
    expect(mockPost).toHaveBeenCalledWith('/api/auth/spotify/disconnect')
  })

  test('updateProfile stores user and handles localStorage errors', async () => {
    mockPatch.mockResolvedValue({ data: { username: 'updated' } })
    // make localStorage.setItem throw to exercise the catch
    const orig = localStorage.setItem
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('fail') })
    const res = await authService.updateProfile({ username: 'updated' })
    expect(res).toEqual({ username: 'updated' })
    // restore
    localStorage.setItem = orig
  })

  test('getStoredUser returns null on parse error', () => {
    localStorage.setItem('user', '{notjson')
    const u = authService.getStoredUser()
    expect(u).toBeNull()
  })

  test('requestPasswordReset handles various error responses', async () => {
    // 404
    mockPost.mockRejectedValueOnce({ response: { status: 404 } })
    let r = await authService.requestPasswordReset('a@b')
    expect(r.success).toBe(false)
    expect(r.error).toMatch(/No existe una cuenta/) 

    // 400 with Spotify detail
    mockPost.mockRejectedValueOnce({ response: { status: 400, data: { detail: 'Cuenta con Spotify' } } })
    r = await authService.requestPasswordReset('s@b')
    expect(r.error).toMatch(/solo puede acceder con Spotify/)

    // network
    mockPost.mockRejectedValueOnce({ code: 'ERR_NETWORK' })
    r = await authService.requestPasswordReset('n@b')
    expect(r.error).toMatch(/No se pudo conectar/)

    // 500
    mockPost.mockRejectedValueOnce({ response: { status: 500 } })
    r = await authService.requestPasswordReset('x@b')
    expect(r.error).toMatch(/Error del servidor/)
  })

  test('resetPassword handles validation and network errors', async () => {
    // success
    mockPost.mockResolvedValueOnce({ data: { ok: true } })
    let r = await authService.resetPassword({ email: 'a', code: '1', new_password: 'P@ssw0rd' })
    expect(r.success).toBe(true)

    // 400 with 'código' message
    mockPost.mockRejectedValueOnce({ response: { status: 400, data: { detail: 'código inválido' } } })
    r = await authService.resetPassword({ email: 'a', code: '1', new_password: 'P' })
    expect(r.success).toBe(false)
    expect(r.error).toMatch(/incorrecto o ha expirado/)

    // 422 with array detail
    mockPost.mockRejectedValueOnce({ response: { status: 422, data: { detail: [{ msg: 'm1' }, { msg: 'm2' }] } } })
    r = await authService.resetPassword({ email: 'a', code: '1', new_password: 'P' })
    expect(r.error).toMatch(/Error de validación: m1, m2/)

    // network
    mockPost.mockRejectedValueOnce({ code: 'ERR_NETWORK' })
    r = await authService.resetPassword({ email: 'a', code: '1', new_password: 'P' })
    expect(r.error).toMatch(/No se pudo conectar/)
  })
})
