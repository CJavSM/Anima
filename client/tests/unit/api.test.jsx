import api from '../../src/config/api'

describe('api config and interceptors', () => {
  beforeEach(() => {
    // clear storage and reset location
    localStorage.clear()
    // ensure a safe default and provide a test-friendly location object
    const fakeLocation = { href: '/', pathname: '/', assign: vi.fn() }
    Object.defineProperty(window, 'location', { value: fakeLocation, writable: true, configurable: true })
  })

  it('creates axios instance with expected defaults', () => {
    expect(api).toBeTruthy()
    // baseURL should default to localhost in test env
    expect(api.defaults.baseURL).toBe('http://localhost:8000')
    expect(api.defaults.timeout).toBe(10000)

    // content-type may live under defaults.headers or defaults.headers.common depending on axios
    const contentType = (api.defaults.headers && (api.defaults.headers['Content-Type'] || api.defaults.headers.common?.['Content-Type']))
    expect(contentType).toBe('application/json')
  })

  it('request interceptor adds Authorization when token present and not auth endpoint', () => {
    localStorage.setItem('token', 't1')
    const handlers = api.interceptors.request.handlers || api.interceptors.request._handlers
    expect(handlers && handlers.length).toBeGreaterThan(0)

    const req = handlers[0].fulfilled
    const cfg = { url: '/some/resource', method: 'get', headers: {} }
    const out = req(cfg)
    expect(out.headers.Authorization).toBe('Bearer t1')
  })

  it('request interceptor does not add Authorization for auth endpoints', () => {
    localStorage.setItem('token', 't1')
    const handlers = api.interceptors.request.handlers || api.interceptors.request._handlers
    const req = handlers[0].fulfilled
    const out = req({ url: '/auth/login', headers: {} })
    expect(out.headers.Authorization).toBeUndefined()
  })

  it('request interceptor respects skipAuth flag', () => {
    localStorage.setItem('token', 't1')
    const handlers = api.interceptors.request.handlers || api.interceptors.request._handlers
    const req = handlers[0].fulfilled
    const out = req({ url: '/x', skipAuth: true, headers: {} })
    expect(out.headers.Authorization).toBeUndefined()
  })

  it('response interceptor returns response on success', () => {
    const handlers = api.interceptors.response.handlers || api.interceptors.response._handlers
    expect(handlers && handlers.length).toBeGreaterThan(0)
    const resFulfilled = handlers[0].fulfilled
    const response = { status: 200, config: { url: '/ok' }, data: { ok: true } }
    const out = resFulfilled(response)
    expect(out).toBe(response)
  })

  it('response interceptor on 401 clears localStorage and redirects to /login', async () => {
    localStorage.setItem('token', 'tok')
    localStorage.setItem('user', JSON.stringify({ id: 1 }))
    window.location.href = '/home'

    const handlers = api.interceptors.response.handlers || api.interceptors.response._handlers
    const resRejected = handlers[0].rejected

    const error = { response: { status: 401 }, config: { url: '/protected' }, message: 'unauth' }

    await expect(resRejected(error)).rejects.toBe(error)

    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
    expect(window.location.href).toContain('/login')
  })
})
