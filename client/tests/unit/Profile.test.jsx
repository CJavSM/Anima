import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

globalThis.React = React

// Mock hooks and shared components that rely on Router context
vi.mock('../../src/hooks/usePrivateSidebar', () => ({ __esModule: true, default: () => ({ isOpen: false, openSidebar: vi.fn(), closeSidebar: vi.fn(), toggleSidebar: vi.fn() }) }))
vi.mock('../../src/components/Shared/Sidebar', () => ({ __esModule: true, default: () => <div data-testid="sidebar-mock" /> }))
vi.mock('../../src/components/Shared/SharedNavbar', () => ({ __esModule: true, default: () => <div data-testid="navbar-mock" /> }))

// mock react-router-dom useNavigate to avoid Router context errors
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})
// Mock authService (named export)
const mockUpdateProfile = vi.fn()
const mockDisconnectSpotify = vi.fn()
const mockMe = vi.fn()
const mockGetSpotifyLinkUrl = vi.fn()
vi.mock('../../src/services/authService', () => ({
  authService: {
    updateProfile: (...args) => mockUpdateProfile(...args),
    disconnectSpotify: (...args) => mockDisconnectSpotify(...args),
    me: (...args) => mockMe(...args),
    getSpotifyLinkUrl: (...args) => mockGetSpotifyLinkUrl(...args)
  }
}))

// Mock useAuth from context
const mockSetUser = vi.fn()
const mockLogout = vi.fn()
vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: globalThis.__testUser || {
      username: 'jdoe',
      first_name: 'John',
      last_name: 'Doe',
      email: 'jdoe@example.com',
      is_verified: true,
      spotify_connected: false,
      profile_picture: null
    },
    logout: mockLogout,
    setUser: mockSetUser
  })
}))

import Profile from '../../src/components/Profile/Profile'

describe('Profile component', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // re-register mocks after restore
    mockUpdateProfile.mockReset()
    mockDisconnectSpotify.mockReset()
    mockMe.mockReset()
    mockGetSpotifyLinkUrl.mockReset()
    mockSetUser.mockReset()
    mockLogout.mockReset()
    // default test user
    globalThis.__testUser = {
      username: 'jdoe',
      first_name: 'John',
      last_name: 'Doe',
      email: 'jdoe@example.com',
      is_verified: true,
      spotify_connected: false,
      profile_picture: null
    }
    // mock alert to avoid noisy dialogs
    global.alert = vi.fn()
  })

  it('renders user info and initials when no avatar', () => {
    render(<Profile />)
    expect(screen.getByText('Tu Perfil')).toBeInTheDocument()
    // initials from first name J
    expect(screen.getByText('J')).toBeInTheDocument()
    expect(screen.getByText('@jdoe')).toBeInTheDocument()
    expect(screen.getByText('jdoe@example.com')).toBeInTheDocument()
  })

  it('shows client-side validation error for invalid username', async () => {
    render(<Profile />)

    fireEvent.click(screen.getByText(/Editar perfil/i))

    const usernameInput = screen.getByDisplayValue('jdoe')
    // invalid username with space
    fireEvent.change(usernameInput, { target: { value: 'bad user' } })

    fireEvent.click(screen.getByText('Guardar'))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/El nombre de usuario sólo puede contener/i)).toBeInTheDocument()
    })
  })

  it('calls authService.updateProfile and setUser on successful save', async () => {
    const updatedUser = { ...globalThis.__testUser, first_name: 'Jane', username: 'jane' }
    mockUpdateProfile.mockResolvedValue(updatedUser)

    render(<Profile />)

    fireEvent.click(screen.getByText(/Editar perfil/i))
    const firstNameInput = screen.getByDisplayValue('John')
    fireEvent.change(firstNameInput, { target: { value: 'Jane' } })
    const usernameInput = screen.getByDisplayValue('jdoe')
    fireEvent.change(usernameInput, { target: { value: 'jane' } })

    fireEvent.click(screen.getByText('Guardar'))

    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalled())
    await waitFor(() => expect(mockSetUser).toHaveBeenCalledWith(updatedUser))
    expect(screen.getByRole('status')).toHaveTextContent(/Perfil guardado correctamente|Perfil actualizado localmente/)
  })

  it('initiates spotify connect by setting window.location.href', async () => {
    const url = 'https://spotify.example/connect'
    mockGetSpotifyLinkUrl.mockResolvedValue(url)

    // make user not connected
    globalThis.__testUser.spotify_connected = false
    render(<Profile />)

    // make window.location.href writable
    const originalLocation = window.location
    // @ts-ignore
    delete window.location
    // @ts-ignore
    window.location = { href: '' }

    fireEvent.click(screen.getByText(/Conectar con Spotify/i))

    await waitFor(() => expect(window.location.href).toBe(url))

    // restore
    // @ts-ignore
    window.location = originalLocation
  })

  it('disconnects spotify, refreshes user and calls setUser', async () => {
    // user connected
    globalThis.__testUser.spotify_connected = true
    const refreshed = { ...globalThis.__testUser, spotify_connected: false }
    mockDisconnectSpotify.mockResolvedValue({ ok: true })
    mockMe.mockResolvedValue(refreshed)

    render(<Profile />)

    const desvincularBtn = screen.getByText(/Desvincular/i)
    fireEvent.click(desvincularBtn)

    await waitFor(() => expect(mockDisconnectSpotify).toHaveBeenCalled())
    await waitFor(() => expect(mockMe).toHaveBeenCalled())
    await waitFor(() => expect(mockSetUser).toHaveBeenCalledWith(refreshed))
    expect(global.alert).toHaveBeenCalledWith('Spotify desvinculado correctamente.')
  })
})
