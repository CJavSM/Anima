import React from 'react'
import { render, waitFor } from '@testing-library/react'

globalThis.React = React

// router mocks control navigate and the location.search used by the component
globalThis.__mockNavigate = vi.fn()
globalThis.__mockLocationSearch = ''
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => globalThis.__mockNavigate,
    useLocation: () => ({ search: globalThis.__mockLocationSearch })
  }
})

// authService mocks
const mockMe = vi.fn()
const mockExchange = vi.fn()
const mockLink = vi.fn()
vi.mock('../../src/services/authService', () => ({
  authService: {
    me: () => mockMe(),
    exchangeSpotifyCode: (...args) => mockExchange(...args),
    linkSpotify: (...args) => mockLink(...args)
  }
}))

// historyService & spotifyService mocked for linking flow
const mockSavePlaylist = vi.fn()
const mockCreatePlaylist = vi.fn()
vi.mock('../../src/services/historyService', () => ({ __esModule: true, default: { savePlaylist: (...a) => mockSavePlaylist(...a) } }))
vi.mock('../../src/services/spotifyService', () => ({ __esModule: true, default: { createPlaylist: (...a) => mockCreatePlaylist(...a) } }))

// Mock useAuth from context (setUser, refreshUser)
const mockSetUser = vi.fn()
const mockRefreshUser = vi.fn()
vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({ setUser: mockSetUser, refreshUser: mockRefreshUser })
}))

import AuthCallback from '../../src/components/Auth/AuthCallback'

describe('AuthCallback', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    globalThis.__mockNavigate = vi.fn()
    globalThis.__mockLocationSearch = ''
    mockMe.mockReset()
    mockExchange.mockReset()
    mockLink.mockReset()
    mockSavePlaylist.mockReset()
    mockCreatePlaylist.mockReset()
    mockSetUser.mockReset()
    mockRefreshUser.mockReset()
    // silence alerts in tests
    vi.spyOn(global, 'alert').mockImplementation(() => {})
  })

  it('processes token param: saves token, calls me, updates context and navigates to /Home', async () => {
    globalThis.__mockLocationSearch = '?token=tok123'
    mockMe.mockResolvedValue({ username: 'bob' })

    render(<AuthCallback />)

    await waitFor(() => expect(mockMe).toHaveBeenCalled())
    expect(localStorage.getItem('token')).toBe('tok123')
    expect(mockSetUser).toHaveBeenCalledWith({ username: 'bob' })
    expect(localStorage.getItem('user')).toBe(JSON.stringify({ username: 'bob' }))
    expect(globalThis.__mockNavigate).toHaveBeenCalledWith('/Home')
  })

  it('processes exchange code: exchangeSpotifyCode stores token/user and navigates', async () => {
    globalThis.__mockLocationSearch = '?code=abc123'
    mockExchange.mockResolvedValue({ access_token: 'tkn', user: { username: 'u1' } })

    render(<AuthCallback />)

    await waitFor(() => expect(mockExchange).toHaveBeenCalledWith('abc123'))
    expect(localStorage.getItem('token')).toBe('tkn')
    expect(localStorage.getItem('user')).toBe(JSON.stringify({ username: 'u1' }))
    expect(mockSetUser).toHaveBeenCalledWith({ username: 'u1' })
    expect(globalThis.__mockNavigate).toHaveBeenCalledWith('/Home')
  })

  it('handles exchange error: alerts and navigates to login', async () => {
    globalThis.__mockLocationSearch = '?code=badcode'
    mockExchange.mockRejectedValue({ response: { data: { detail: 'Bad code' } } })

    render(<AuthCallback />)

    await waitFor(() => expect(mockExchange).toHaveBeenCalled())
    expect(global.alert).toHaveBeenCalled()
    expect(globalThis.__mockNavigate).toHaveBeenCalledWith('/login')
  })

  it('handles error param: navigates to /home if token present, otherwise /login', async () => {
    // case 1: token exists
    localStorage.setItem('token', 'exist')
    globalThis.__mockLocationSearch = '?error=access_denied'
    render(<AuthCallback />)
    await waitFor(() => expect(global.alert).toHaveBeenCalled())
    expect(globalThis.__mockNavigate).toHaveBeenCalledWith('/home')

    // case 2: no token
    vi.resetAllMocks()
    localStorage.clear()
    globalThis.__mockNavigate = vi.fn()
    globalThis.__mockLocationSearch = '?error=some'
    render(<AuthCallback />)
    await waitFor(() => expect(global.alert).toHaveBeenCalled())
    expect(globalThis.__mockNavigate).toHaveBeenCalledWith('/login')
  })

  it('skips processing if the same callback was already processed (sessionStorage)', async () => {
    globalThis.__mockLocationSearch = '?code=dup'
    sessionStorage.setItem(`oauth_processed:${globalThis.__mockLocationSearch}`, '1')

    render(<AuthCallback />)

    // authService methods should not be called
    await waitFor(() => {
      expect(mockExchange).not.toHaveBeenCalled()
      expect(globalThis.__mockNavigate).not.toHaveBeenCalled()
    })
  })

  it('link state flow: calls linkSpotify, processes pending playlist, and navigates', async () => {
    // set a pending playlist to exercise the branch
    const pending = { playlist_name: 'P', tracks: [{ id: 't1' }], description: 'd' }
    localStorage.setItem('pending_playlist_save', JSON.stringify(pending))
    globalThis.__mockLocationSearch = '?code=linkcode&state=link:123'

    mockLink.mockResolvedValue({ success: true })
    mockRefreshUser.mockResolvedValue({ user: { spotify_connected: true } })
    mockSavePlaylist.mockResolvedValue({ success: true })
    mockCreatePlaylist.mockResolvedValue({ success: true })

    render(<AuthCallback />)

    await waitFor(() => expect(mockLink).toHaveBeenCalledWith('linkcode'))
    // pending should be removed after processing
    await waitFor(() => expect(localStorage.getItem('pending_playlist_save')).toBeNull())
    expect(mockSavePlaylist).toHaveBeenCalled()
    expect(mockCreatePlaylist).toHaveBeenCalled()
    expect(globalThis.__mockNavigate).toHaveBeenCalledWith('/Home')
  })
})
