import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'

// expose React globally for components compiled with older JSX transform
globalThis.React = React

// Mock AuthContext to provide a user
vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', username: 'tester' }, logout: vi.fn() })
}))

// Mock services used by Dashboard
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

// Mock sidebar hook and shared components
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

// Mock react-chartjs-2 chart components to lightweight placeholders
vi.mock('react-chartjs-2', () => ({
  __esModule: true,
  Bar: (props) => <div data-testid="bar-chart" />,
  Line: (props) => <div data-testid="line-chart" />,
  Doughnut: (props) => <div data-testid="doughnut-chart" />
}))

import Dashboard from '../../src/components/Dashboard/Dashboard'
import { MemoryRouter } from 'react-router-dom'

const renderWithRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('Dashboard component', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows loading then renders stats and charts when data available', async () => {
    // prepare mock data
    mockGetStats.mockResolvedValue({
      success: true,
      data: {
        total_analyses: 5,
        total_saved_playlists: 2,
        most_common_emotion: 'HAPPY',
        daily_analyses: { '2025-11-01': 1, '2025-11-02': 2 },
        sentiment_by_day: [{ date: '2025-11-01', positive: 1, negative: 0 }],
        emotions_breakdown: { HAPPY: 3, SAD: 2 },
        weekly_emotions: { HAPPY: 3 },
        positive_count: 3,
        negative_count: 2,
        recent_activity: [
          { analysis_id: 'A1', dominant_emotion: 'HAPPY', analyzed_at: new Date().toISOString(), confidence: 0.85 }
        ]
      }
    })

    renderWithRouter(<Dashboard />)

    // wait for stats to render
    await waitFor(() => {
      expect(screen.getByText(/Análisis realizados/i)).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    // charts should be rendered (we mocked them) — use getAllByTestId for duplicates
    expect(screen.getAllByTestId('line-chart').length).toBeGreaterThan(0)
    expect(screen.getAllByTestId('bar-chart').length).toBeGreaterThan(0)
    expect(screen.getAllByTestId('doughnut-chart').length).toBeGreaterThan(0)
  })
})
