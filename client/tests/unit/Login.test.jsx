import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// expose React globally for components compiled with older JSX transform
globalThis.React = React

// mock Logo and Sidebar and useSidebar
vi.mock('../../src/components/Shared/Logo', () => ({ __esModule: true, default: () => <div data-testid="logo" /> }))
vi.mock('../../src/components/Shared/Sidebar', () => ({ __esModule: true, default: () => <div data-testid="sidebar" /> }))
vi.mock('../../src/hooks/useSidebar', () => ({ __esModule: true, default: () => ({ isOpen: false, openSidebar: vi.fn(), closeSidebar: vi.fn(), toggleSidebar: vi.fn() }) }))

// mock authService named export (use global to avoid hoisting issues)
vi.mock('../../src/services/authService', () => {
  const fn = vi.fn()
  // expose so tests can assert calls
  globalThis.__mockGetSpotifyAuthUrl = fn
  return { authService: { getSpotifyAuthUrl: fn } }
})

// mock AuthContext login
const mockLogin = vi.fn()
vi.mock('../../src/context/AuthContext', () => ({ useAuth: () => ({ login: mockLogin }) }))

// partially mock react-router-dom to spy on navigate while keeping Link behavior
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

import Login from '../../src/components/Auth/Login'

describe('Login component', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('submits form and navigates on successful login', async () => {
    mockLogin.mockResolvedValue({ success: true })

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText(/Username o Email/i), { target: { value: 'user1' } })
    fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'password123' } })

    fireEvent.click(screen.getByRole('button', { name: /Iniciar Sesión/i }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ username_or_email: 'user1', password: 'password123' })
      expect(mockNavigate).toHaveBeenCalledWith('/Home')
    })
  })

  it('shows error message on failed login', async () => {
    mockLogin.mockResolvedValue({ success: false, error: 'Credenciales inválidas' })

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText(/Username o Email/i), { target: { value: 'user1' } })
    fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'badpass' } })

    fireEvent.click(screen.getByRole('button', { name: /Iniciar Sesión/i }))

    await waitFor(() => {
      expect(screen.getByText(/Credenciales inválidas/i)).toBeInTheDocument()
    })
  })

  it('calls spotify auth and assigns window.location when clicking Spotify button', async () => {
  // the mock is exposed by the module factory as globalThis.__mockGetSpotifyAuthUrl
  const mockGetSpotifyAuthUrl = globalThis.__mockGetSpotifyAuthUrl
  mockGetSpotifyAuthUrl.mockResolvedValue('https://spotify.example/auth')
    // spy on window.location.assign - use defineProperty to avoid read-only error in jsdom
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      enumerable: true,
      value: { ...originalLocation, assign: vi.fn() }
    })

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: /Iniciar con Spotify/i }))

    await waitFor(() => {
  expect(mockGetSpotifyAuthUrl).toHaveBeenCalled()
      expect(window.location.assign).toHaveBeenCalledWith('https://spotify.example/auth')
    })

  // restore
  Object.defineProperty(window, 'location', { configurable: true, enumerable: true, value: originalLocation })
  })
})
