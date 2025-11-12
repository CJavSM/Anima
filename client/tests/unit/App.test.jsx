import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// expose React globally for older JSX transform
globalThis.React = React

// Mock all route components used by App to simple placeholders
vi.mock('../../src/components/LandingPage/LandingPage', () => ({ __esModule: true, default: () => <div>LandingPage</div> }))
vi.mock('../../src/components/ContactPage/ContactPage', () => ({ __esModule: true, default: () => <div>ContactPage</div> }))
vi.mock('../../src/components/Auth/Login', () => ({ __esModule: true, default: () => <div>LoginPage</div> }))
vi.mock('../../src/components/Auth/Register', () => ({ __esModule: true, default: () => <div>RegisterPage</div> }))
vi.mock('../../src/components/Auth/AuthCallback', () => ({ __esModule: true, default: () => <div>AuthCallback</div> }))
vi.mock('../../src/components/Home/Home', () => ({ __esModule: true, default: () => <div>HomePage</div> }))
vi.mock('../../src/components/Dashboard/Dashboard', () => ({ __esModule: true, default: () => <div>DashboardPage</div> }))
vi.mock('../../src/components/Profile/Profile', () => ({ __esModule: true, default: () => <div>ProfilePage</div> }))
vi.mock('../../src/components/HistoryPage/HistoryPage', () => ({ __esModule: true, default: () => <div>HistoryPage</div> }))
vi.mock('../../src/components/PlaylistsPage/PlaylistsPage', () => ({ __esModule: true, default: () => <div>PlaylistsPage</div> }))

// Provide a mockable AuthContext with AuthProvider and useAuth. Tests will set
// `globalThis.__mockAuthValue` to control the returned context value.
globalThis.__mockAuthValue = { loading: false, isAuthenticated: false }
vi.mock('../../src/context/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => globalThis.__mockAuthValue
}))

import App from '../../src/App'

describe('App routes', () => {
  afterEach(() => vi.restoreAllMocks())

  it('renders public route (register) without auth', () => {
    globalThis.__mockAuthValue = { loading: false, isAuthenticated: false }
    // set the browser URL to /register before rendering App (App includes its own Router)
    window.history.pushState({}, 'Register', '/register')
    render(<App />)
    expect(screen.getByText('RegisterPage')).toBeInTheDocument()
  })

  it('redirects to login when accessing protected /home while unauthenticated', () => {
    globalThis.__mockAuthValue = { loading: false, isAuthenticated: false }
    window.history.pushState({}, 'Home', '/home')
    render(<App />)
    // ProtectedRoute should navigate to /login which is rendered by our mocked Login component
    expect(screen.getByText('LoginPage')).toBeInTheDocument()
  })

  it('renders protected route when authenticated', () => {
    globalThis.__mockAuthValue = { loading: false, isAuthenticated: true, user: { id: 1 } }
    window.history.pushState({}, 'Home', '/home')
    render(<App />)
    expect(screen.getByText('HomePage')).toBeInTheDocument()
  })
})
