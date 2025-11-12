import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

globalThis.React = React

// provide a reusable mockNavigate so component-level useNavigate() calls succeed
globalThis.__mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => globalThis.__mockNavigate }
})

// Mock Logo/Sidebar and useSidebar to keep the component lightweight
vi.mock('../../src/components/Shared/Logo', () => ({ __esModule: true, default: () => <div data-testid="logo" /> }))
vi.mock('../../src/components/Shared/Sidebar', () => ({ __esModule: true, default: () => <div data-testid="sidebar" /> }))
vi.mock('../../src/hooks/useSidebar', () => ({ __esModule: true, default: () => ({ isOpen: false, openSidebar: vi.fn(), closeSidebar: vi.fn(), toggleSidebar: vi.fn() }) }))

// Mock authService.getSpotifyAuthUrl used by the Spotify button
vi.mock('../../src/services/authService', () => ({ authService: { getSpotifyAuthUrl: vi.fn().mockResolvedValue('https://spotify.example') } }))

// Provide AuthContext mock that reads the register mock from globalThis.__mockRegister
globalThis.__mockRegister = undefined
vi.mock('../../src/context/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ register: globalThis.__mockRegister || vi.fn() })
}))

describe('Register component', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    delete globalThis.__mockRegister
    globalThis.__mockNavigate = vi.fn()
  })

  it('shows password mismatch error', async () => {
    const mockRegister = vi.fn()
    globalThis.__mockRegister = mockRegister

    const { default: Register } = await import('../../src/components/Auth/Register')

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    )

  fireEvent.change(screen.getByLabelText('Contraseña *'), { target: { value: 'pass1' } })
  fireEvent.change(screen.getByLabelText('Confirmar Contraseña *'), { target: { value: 'pass2' } })

  // target the primary submit button (type=submit) to avoid matching the
  // secondary "Registrarse con Spotify" button which also contains the word
  const registerButtons = screen.getAllByRole('button', { name: /Registrarse/i })
  const submitBtn = registerButtons.find(btn => btn.getAttribute('type') === 'submit')
  // ensure we actually submit the form (click sometimes doesn't trigger submit in this env)
  fireEvent.submit(submitBtn.form)
  // debug DOM to investigate why the error banner may not appear in CI runs
  // (left temporarily to aid diagnosis)
  // screen.debug()

  expect(await screen.findByText(/Las contraseñas no coinciden/i)).toBeInTheDocument()
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('calls register and shows success message on success', async () => {
    const mockRegister = vi.fn().mockResolvedValue({ success: true })
    globalThis.__mockRegister = mockRegister

    const { default: Register } = await import('../../src/components/Auth/Register')

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    )

  fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'a@b.com' } })
  fireEvent.change(screen.getByLabelText('Username *'), { target: { value: 'user1' } })
  fireEvent.change(screen.getByLabelText('Contraseña *'), { target: { value: 'Password1!' } })
  fireEvent.change(screen.getByLabelText('Confirmar Contraseña *'), { target: { value: 'Password1!' } })

  // click the main submit button (type=submit) rather than the spotify variant
  const registerBtns = screen.getAllByRole('button', { name: /Registrarse/i })
  const mainSubmit = registerBtns.find(b => b.getAttribute('type') === 'submit')
  // ensure we actually submit the form for the success path as well
  fireEvent.submit(mainSubmit.form)

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalled()
    })

    expect(screen.getByText(/¡Usuario registrado exitosamente!/i)).toBeInTheDocument()
  })
})
