import React from 'react'
// Ensure React symbol is globally available for any mocked factories or modules
// that return JSX during module initialization (prevents `React is not defined`).
globalThis.React = React
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

import { MemoryRouter } from 'react-router-dom'

const mockReset = vi.fn()
vi.mock('../../src/services/authService', () => ({ authService: { resetPassword: (...args) => mockReset(...args) } }))

import ResetPassword from '../../src/components/Auth/ResetPassword'

describe('ResetPassword', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockReset.mockReset()
  })

  it('validates required fields and shows errors', async () => {
  const { container } = render(<MemoryRouter><ResetPassword /></MemoryRouter>)
  const form = container.querySelector('form')
  fireEvent.submit(form)
    // Email required
    expect(screen.getByText(/El email es requerido/i)).toBeInTheDocument()

    // Fill email but missing code
    fireEvent.change(screen.getByPlaceholderText(/tu@email.com/i), { target: { value: 'a@b.com' } })
  fireEvent.submit(form)
    expect(screen.getByText(/El código es requerido/i)).toBeInTheDocument()

    // Fill invalid code length
    fireEvent.change(screen.getByPlaceholderText(/123456/i), { target: { value: '123' } })
  fireEvent.submit(form)
    expect(screen.getByText(/El código debe tener 6 dígitos/i)).toBeInTheDocument()

    // fill code but short password
  fireEvent.change(screen.getByPlaceholderText(/123456/i), { target: { value: '123456' } })
  const pwdInputs = screen.getAllByPlaceholderText(/••••••••/i)
  // first is newPassword, second is confirmPassword
  fireEvent.change(pwdInputs[0], { target: { value: 'short' } })
  fireEvent.change(pwdInputs[1], { target: { value: 'short' } })
  fireEvent.click(screen.getByRole('button', { name: /Cambiar contraseña/i }))
    expect(screen.getByText(/La contraseña debe tener mínimo 8 caracteres/i)).toBeInTheDocument()

    // passwords mismatch
  const pwdInputs2 = screen.getAllByPlaceholderText(/••••••••/i)
  fireEvent.change(pwdInputs2[0], { target: { value: 'longpassword' } })
  fireEvent.change(pwdInputs2[1], { target: { value: 'different' } })
  fireEvent.click(screen.getByRole('button', { name: /Cambiar contraseña/i }))
    expect(screen.getByText(/Las contraseñas no coinciden/i)).toBeInTheDocument()
  })

  it('submits and shows success when resetPassword returns success', async () => {
    mockReset.mockResolvedValue({ success: true })
  render(<MemoryRouter><ResetPassword /></MemoryRouter>)
  fireEvent.change(screen.getByPlaceholderText(/tu@email.com/i), { target: { value: 'a@b.com' } })
  fireEvent.change(screen.getByPlaceholderText(/123456/i), { target: { value: '123456' } })
  const pwdFields = screen.getAllByPlaceholderText(/••••••••/i)
  fireEvent.change(pwdFields[0], { target: { value: 'StrongPass1!' } })
  // confirm
  fireEvent.change(pwdFields[1], { target: { value: 'StrongPass1!' } })

  fireEvent.click(screen.getByRole('button', { name: /Cambiar contraseña/i }))

    await waitFor(() => expect(mockReset).toHaveBeenCalled())
    expect(screen.getByText(/Contraseña cambiada exitosamente/i)).toBeInTheDocument()
  })

  it('shows error message when api returns failure', async () => {
    mockReset.mockResolvedValue({ success: false, error: 'invalid code' })
  render(<MemoryRouter><ResetPassword /></MemoryRouter>)
    fireEvent.change(screen.getByPlaceholderText(/tu@email.com/i), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText(/123456/i), { target: { value: '123456' } })
    const inputs = screen.getAllByPlaceholderText(/••••••••/i)
    fireEvent.change(inputs[0], { target: { value: 'StrongPass1!' } })
    fireEvent.change(inputs[1], { target: { value: 'StrongPass1!' } })

  fireEvent.click(screen.getByRole('button', { name: /Cambiar contraseña/i }))
    await waitFor(() => expect(mockReset).toHaveBeenCalled())
    expect(screen.getByText(/invalid code/i)).toBeInTheDocument()
  })
})
