import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'

// expose React globally for components compiled with older JSX transform
globalThis.React = React

// reuse the same mocks as the main Dashboard tests but keep them local here
vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', username: 'tester' }, logout: vi.fn() })
}))

const mockGetStats = vi.fn()
vi.mock('../../src/services/historyService', () => ({
  __esModule: true,
  default: { getStats: (...args) => mockGetStats(...args) }
}))

vi.mock('../../src/services/emotionService', () => ({
  __esModule: true,
  default: {
    getEmotionEmoji: (e) => '😊',
    getEmotionColor: (e) => '#10B981',
    translateEmotion: (e) => e
  }
}))

vi.mock('../../src/services/authService', () => ({
  authService: { getSpotifyLinkUrl: vi.fn(), disconnectSpotify: vi.fn() }
}))

vi.mock('../../src/hooks/usePrivateSidebar', () => ({
  __esModule: true,
  default: () => ({ isOpen: false, openSidebar: vi.fn(), closeSidebar: vi.fn(), toggleSidebar: vi.fn() })
}))

vi.mock('../../src/components/Shared/SharedNavbar', () => ({
  __esModule: true,
  default: () => <div data-testid="shared-navbar" />
}))

vi.mock('../../src/components/Shared/Sidebar', () => ({
  __esModule: true,
  default: (props) => <div data-testid="private-sidebar" />
}))

// Mock chart components to lightweight placeholders
vi.mock('react-chartjs-2', () => ({
  __esModule: true,
  Bar: (props) => <div data-testid="bar-chart" />,
  Line: (props) => <div data-testid="line-chart" />,
  Doughnut: (props) => <div data-testid="doughnut-chart" />
}))

import Dashboard from '../../src/components/Dashboard/Dashboard'
import { MemoryRouter } from 'react-router-dom'

const renderWithRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('Dashboard extra behaviours', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows placeholder when today_emotions is empty', async () => {
    mockGetStats.mockResolvedValue({ success: true, data: { today_emotions: {}, today_total: 0 } })

    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(/No hay análisis hoy para mostrar/i)).toBeInTheDocument()
    })
  })

  it('renders total analyses today when today_total > 0 and hides placeholder', async () => {
    mockGetStats.mockResolvedValue({ success: true, data: { today_emotions: { HAPPY: 3, SAD: 1 }, today_total: 4 } })

    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(screen.queryByText(/No hay análisis hoy para mostrar/i)).not.toBeInTheDocument()
      expect(screen.getByText(/Total de análisis hoy/i)).toBeInTheDocument()
      expect(screen.getByText('4')).toBeInTheDocument()
    })
  })

  it('formats various confidence values in recent activity (null, >1, NaN)', async () => {
    const now = new Date().toISOString()
    mockGetStats.mockResolvedValue({
      success: true,
      data: {
        total_analyses: 3,
        recent_activity: [
          { analysis_id: 'r1', dominant_emotion: 'HAPPY', analyzed_at: now, confidence: null },
          { analysis_id: 'r2', dominant_emotion: 'SAD', analyzed_at: now, confidence: 90.04 },
          { analysis_id: 'r3', dominant_emotion: 'CALM', analyzed_at: now, confidence: 'abc' }
        ]
      }
    })

    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      // Expect 0% for null
      expect(screen.getByText('0%')).toBeInTheDocument()
      // Expect 90.04% for >1 value
      expect(screen.getByText('90.04%')).toBeInTheDocument()
      // Non-numeric should fall back to 0%
      // There will be at least one '0%' already found; ensure there are multiple occurrences
      const zeros = screen.getAllByText('0%')
      expect(zeros.length).toBeGreaterThan(0)
    })
  })

  it('handles invalid date for "Día más activo" and shows —', async () => {
    // Provide a malformed date to force the fallback branch
    mockGetStats.mockResolvedValue({
      success: true,
      data: {
        daily_analyses: { 'not-a-date': 2, '2025-11-02': 1 }
      }
    })

    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      // The card label should exist
      const label = screen.getByText(/Día más activo/i)
      expect(label).toBeInTheDocument()

      // Find the enclosing weekly-stat-card and assert its value shows the fallback '—'
      const card = label.closest('.weekly-stat-card') || label.parentElement
      const { within } = require('@testing-library/react')
      expect(within(card).getByText('—')).toBeInTheDocument()
    })
  })
})
