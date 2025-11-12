import React from 'react'
// Ensure React symbol is globally available for any mocked factories or modules
// that return JSX during module initialization (prevents `React is not defined`).
globalThis.React = React
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

import { MemoryRouter } from 'react-router-dom'

const mockRequest = vi.fn()
vi.mock('../../src/services/authService', () => ({ authService: { requestPasswordReset: (...args) => mockRequest(...args) } }))

import ForgotPassword from '../../src/components/Auth/ForgotPassword'

describe('ForgotPassword', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockRequest.mockReset()
  })

  it('shows validation error when email empty', async () => {
  const { container } = render(<MemoryRouter><ForgotPassword /></MemoryRouter>)
    const form = container.querySelector('form')
    fireEvent.submit(form)
    expect(screen.getByText(/Por favor ingresa tu email/i)).toBeInTheDocument()
  })

  it('shows success UI when requestPasswordReset returns success', async () => {
    mockRequest.mockResolvedValue({ success: true })
  render(<MemoryRouter><ForgotPassword /></MemoryRouter>)

    const input = screen.getByPlaceholderText(/Ingresa tu email/i)
    fireEvent.change(input, { target: { value: 'a@b.com' } })

  fireEvent.click(screen.getByRole('button', { name: /Enviar código/i }))

    await waitFor(() => expect(mockRequest).toHaveBeenCalledWith('a@b.com'))

    // success UI shows 'Código enviado' badge or 'Revisa tu email'
    expect(screen.getByText(/Revisa tu email/i)).toBeInTheDocument()
    expect(screen.getByText(/Código enviado/i)).toBeInTheDocument()
  })

  it('shows error when service returns failure', async () => {
    mockRequest.mockResolvedValue({ success: false, error: 'no user' })
  render(<MemoryRouter><ForgotPassword /></MemoryRouter>)

    fireEvent.change(screen.getByPlaceholderText(/Ingresa tu email/i), { target: { value: 'a@b.com' } })
  fireEvent.click(screen.getByRole('button', { name: /Enviar código/i }))

    await waitFor(() => expect(mockRequest).toHaveBeenCalled())
    expect(screen.getByText(/no user/i)).toBeInTheDocument()
  })

  it('handles thrown error from service', async () => {
    mockRequest.mockRejectedValue(new Error('network'))
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>)
    fireEvent.change(screen.getByPlaceholderText(/Ingresa tu email/i), { target: { value: 'a@b.com' } })
    fireEvent.click(screen.getByRole('button', { name: /Enviar código/i }))
    await waitFor(() => expect(mockRequest).toHaveBeenCalled())
    // service throws with message 'network' so we accept that or the generic message
    expect(screen.getByText(/network|Error inesperado/i)).toBeInTheDocument()
  })
})
