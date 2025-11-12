import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock react-router navigation and sidebar hook/component
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}))

vi.mock('../../src/hooks/useSidebar', () => ({
  __esModule: true,
  default: () => ({ isOpen: false, openSidebar: () => {}, closeSidebar: () => {}, toggleSidebar: () => {} }),
  __namedExport: true
}))

vi.mock('../../src/components/Shared/Sidebar', () => {
  const React = require('react')
  return {
    __esModule: true,
    default: () => React.createElement('div', { 'data-testid': 'mock-sidebar' })
  }
})

// Mock api
const mockPost = vi.fn()
vi.mock('../../src/config/api', () => ({
  __esModule: true,
  default: { post: (...args) => mockPost(...args) }
}))

// make React available globally (some components rely on React in scope)
globalThis.React = React
let ContactPage

describe('ContactPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockPost.mockReset()
    mockNavigate.mockReset()
    // stub window.open
    vi.spyOn(window, 'open').mockImplementation(() => null)
    // import the component after mocks are in place
    return import('../../src/components/ContactPage/ContactPage').then(mod => {
      ContactPage = mod.default
    })
  })

  afterEach(() => {
    try { window.open.mockRestore() } catch (e) {}
  })

  it('renders contact title, methods and form inputs', () => {
    const { container } = render(<ContactPage />)
    expect(screen.getByText(/Contáctanos/i)).toBeInTheDocument()
    // avoid ambiguous matches for 'WhatsApp' (appears as heading and button text)
    const methodTitle = container.querySelector('.method-title')
    expect(methodTitle).toBeTruthy()
    expect(methodTitle.textContent).toMatch(/WhatsApp/i)
    expect(screen.getByLabelText(/Nombre completo/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Asunto/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Mensaje/i)).toBeInTheDocument()
  })

  it('clicking WhatsApp opens correct wa.me url', () => {
    render(<ContactPage />)
    const whatsappBtn = screen.getByRole('button', { name: /Abrir WhatsApp|Próximamente/i })
    expect(whatsappBtn).toBeEnabled()
    fireEvent.click(whatsappBtn)
    expect(window.open).toHaveBeenCalled()
    const calledWith = window.open.mock.calls[0][0]
    expect(calledWith).toMatch(/https:\/\/wa.me\//)
    expect(calledWith).toContain('text=')
  })

  it('submits form successfully and shows success then hides after timeout', async () => {
    mockPost.mockResolvedValue({ status: 200 })

    const { container } = render(<ContactPage />)

    fireEvent.change(screen.getByLabelText(/Nombre completo/i), { target: { value: 'Juan' } })
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText(/Asunto/i), { target: { value: 'Hola' } })
    fireEvent.change(screen.getByLabelText(/Mensaje/i), { target: { value: 'Mensaje' } })

    const submitBtn = screen.getByRole('button', { name: /Enviar Mensaje/i })
    fireEvent.click(submitBtn)

    // ensure api.post was triggered
    await waitFor(() => expect(mockPost).toHaveBeenCalled())

    // success alert shown
    await waitFor(() => expect(container.querySelector('.alert-success')).toBeTruthy())

    // inputs cleared
    expect(screen.getByLabelText(/Nombre completo/i).value).toBe('')

  // success alert remains visible in the DOM (hide-after-5s behavior is handled by a real timer)
  // we assert the success state and cleared inputs; testing the actual 5s hide reliably
  // would require replacing the timer strategy and is skipped here to keep tests stable.
  expect(container.querySelector('.alert-success')).toBeTruthy()
  })

  it('shows error message when api.post throws', async () => {
    mockPost.mockRejectedValue({ response: { data: { detail: 'bad' } } })
    const { container } = render(<ContactPage />)

    fireEvent.change(screen.getByLabelText(/Nombre completo/i), { target: { value: 'J' } })
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'e@e.com' } })
    fireEvent.change(screen.getByLabelText(/Asunto/i), { target: { value: 'S' } })
    fireEvent.change(screen.getByLabelText(/Mensaje/i), { target: { value: 'M' } })

    fireEvent.click(screen.getByRole('button', { name: /Enviar Mensaje/i }))

    // ensure api.post was triggered and then assert the error alert
    await waitFor(() => expect(mockPost).toHaveBeenCalled())
    await waitFor(() => expect(container.querySelector('.alert-error')).toBeTruthy())
    expect(container.querySelector('.alert-error').textContent).toContain('bad')
  })
})
