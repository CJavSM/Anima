import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

globalThis.React = React

// Mock the authService used by the context
const mockGetStoredUser = vi.fn()
const mockLogin = vi.fn()
const mockRegister = vi.fn()
const mockMe = vi.fn()
const mockLogout = vi.fn()

vi.mock('../../src/services/authService', () => ({
  authService: {
    getStoredUser: () => mockGetStoredUser(),
    login: (...args) => mockLogin(...args),
    register: (...args) => mockRegister(...args),
    me: (...args) => mockMe(...args),
    logout: () => mockLogout()
  }
}))

import { AuthProvider, useAuth } from '../../src/context/AuthContext'

function Consumer() {
  const { user, login, register, logout, refreshUser, setUser, isAuthenticated, loading } = useAuth()
  return (
    <div>
      <div>USER:{user?.username ?? 'null'}</div>
      <div>AUTH:{String(isAuthenticated)}</div>
      <div>LOADING:{String(loading)}</div>
      <button onClick={async () => { window.__last = await login({ username_or_email: 'u', password: 'p' }) }}>do-login</button>
      <button onClick={async () => { window.__last = await register({ username: 'u' }) }}>do-register</button>
      <button onClick={async () => { window.__last = await refreshUser() }}>do-refresh</button>
      <button onClick={() => { logout(); window.__last = { loggedOut: true } }}>do-logout</button>
      <button onClick={() => { setUser({ username: 'setuser' }); window.__last = { set: true } }}>do-setuser</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
    delete window.__last
  })

  it('reads stored user on mount', async () => {
    mockGetStoredUser.mockReturnValue({ username: 'stored' })

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/USER:stored/)).toBeInTheDocument()
      expect(screen.getByText(/AUTH:true/)).toBeInTheDocument()
      expect(screen.getByText(/LOADING:false/)).toBeInTheDocument()
    })
  })

  it('login success updates user', async () => {
    mockGetStoredUser.mockReturnValue(null)
    mockLogin.mockResolvedValue({ user: { username: 'alice' } })

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    )

    fireEvent.click(screen.getByText('do-login'))
    await waitFor(() => {
      expect(window.__last).toEqual({ success: true, data: { user: { username: 'alice' } } })
    })

    expect(screen.getByText(/USER:alice/)).toBeInTheDocument()
    expect(screen.getByText(/AUTH:true/)).toBeInTheDocument()
  })

  it('login failure returns generic error', async () => {
    mockGetStoredUser.mockReturnValue(null)
    mockLogin.mockRejectedValue(new Error('bad'))

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    )

    fireEvent.click(screen.getByText('do-login'))
    await waitFor(() => {
      expect(window.__last).toEqual({ success: false, error: 'Error al iniciar sesión' })
    })

    expect(screen.getByText(/USER:null/)).toBeInTheDocument()
    expect(screen.getByText(/AUTH:false/)).toBeInTheDocument()
  })

  it('register success returns success', async () => {
    mockGetStoredUser.mockReturnValue(null)
    mockRegister.mockResolvedValue({ id: 1 })

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    )

    fireEvent.click(screen.getByText('do-register'))
    await waitFor(() => {
      expect(window.__last).toEqual({ success: true, data: { id: 1 } })
    })
  })

  it('refreshUser sets user on success and returns the user', async () => {
    mockGetStoredUser.mockReturnValue(null)
    mockMe.mockResolvedValue({ username: 'meuser' })

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    )

    fireEvent.click(screen.getByText('do-refresh'))
    await waitFor(() => {
      expect(window.__last).toEqual({ success: true, user: { username: 'meuser' } })
    })

    expect(screen.getByText(/USER:meuser/)).toBeInTheDocument()
  })

  it('logout clears user and calls authService.logout', async () => {
    mockGetStoredUser.mockReturnValue({ username: 'x' })
    mockLogout.mockImplementation(() => {})

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    )

    await waitFor(() => expect(screen.getByText(/USER:x/)).toBeInTheDocument())
    fireEvent.click(screen.getByText('do-logout'))
    await waitFor(() => expect(window.__last).toEqual({ loggedOut: true }))
    expect(screen.getByText(/USER:null/)).toBeInTheDocument()
  })

  it('setUser writes to localStorage when provided', async () => {
    mockGetStoredUser.mockReturnValue(null)

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    )

    fireEvent.click(screen.getByText('do-setuser'))
    await waitFor(() => expect(window.__last).toEqual({ set: true }))
    expect(JSON.parse(localStorage.getItem('user'))).toEqual({ username: 'setuser' })
  })
})
