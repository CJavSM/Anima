import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// expose React globally for components compiled with older JSX transform
globalThis.React = React

// Provide a mock for the sidebar hook used by LandingPage
vi.mock('../../src/hooks/useSidebar', () => ({
  __esModule: true,
  default: () => ({
    isOpen: false,
    openSidebar: vi.fn(),
    closeSidebar: vi.fn(),
    toggleSidebar: vi.fn()
  })
}))

// Mock useNavigate while preserving other react-router-dom exports
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

// Mock the Sidebar component (it uses router hooks internally) to avoid Router context in this unit test
vi.mock('../../src/components/Shared/Sidebar', () => ({ __esModule: true, default: () => <div data-testid="sidebar-mock" /> }))

import LandingPage from '../../src/components/LandingPage/LandingPage'

describe('LandingPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // reset navigate mock
    mockNavigate.mockReset()
    // ensure clean DOM localStorage
    localStorage.clear()
  })

  it('renders hero content and CTA buttons and navigates on click', async () => {
    render(<LandingPage />)

    // hero title exists (may appear in multiple nodes)
    const matches = screen.getAllByText(/Música que refleja/i)
    expect(matches.length).toBeGreaterThan(0)

    // CTA buttons navigate to expected routes
    const comenzar = screen.getByText(/Comenzar Ahora/i)
    fireEvent.click(comenzar)
    expect(mockNavigate).toHaveBeenCalledWith('/register')

    const contacto = screen.getByText(/¿Tienes preguntas\? Contáctanos/i)
    fireEvent.click(contacto)
    expect(mockNavigate).toHaveBeenCalledWith('/contact')
  })

  it('logo and navbar buttons call navigate appropriately', () => {
    const { container } = render(<LandingPage />)

    // clicking the navbar brand container should navigate home
    const brand = container.querySelector('.navbar-brand')
    expect(brand).toBeInTheDocument()
    fireEvent.click(brand)
    expect(mockNavigate).toHaveBeenCalledWith('/')

    // Iniciar Sesión button
    const loginBtn = screen.getByText(/Iniciar Sesión/i)
    fireEvent.click(loginBtn)
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  it('features become active on hover and deactivate on leave', async () => {
    render(<LandingPage />)

    // find a feature title and its card
    const title = screen.getByText(/Análisis de Emoción/i)
    const card = title.closest('.feature-card')
    expect(card).toBeInTheDocument()

    // hover enters (use mouseOver/mouseOut for best compatibility)
    fireEvent.mouseOver(card)
    await waitFor(() => expect(card.classList.contains('active')).toBe(true))

    // hover leave
    fireEvent.mouseOut(card)
    await waitFor(() => expect(card.classList.contains('active')).toBe(false))
  })

  it('adds scrolled class to navbar when window scrollY > 50', async () => {
    render(<LandingPage />)

    // set scrollY and dispatch scroll event
    Object.defineProperty(window, 'scrollY', { value: 100, writable: true })
    fireEvent(window, new Event('scroll'))

    const nav = document.querySelector('.landing-navbar')
    await waitFor(() => expect(nav.className).toMatch(/scrolled/))
  })

  it('updates parallax orb transform on mouse move', async () => {
    render(<LandingPage />)

    // dispatch mousemove with client coordinates
    fireEvent.mouseMove(window, { clientX: 200, clientY: 100 })

    const orb = document.querySelector('.gradient-orb.orb-1')
    await waitFor(() => {
      expect(orb).toBeInTheDocument()
      expect(orb.style.transform).toBeTruthy()
      expect(orb.style.transform).toContain('translate(')
    })
  })
})
