import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'

// expose React globally for components compiled with older JSX transform
globalThis.React = React

// Mock AuthContext
vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', username: 'tester' } })
}))

// Mock historyService default export with getStats and getAnalyses
const mockGetStats = vi.fn()
const mockGetAnalyses = vi.fn()
vi.mock('../../src/services/historyService', () => ({
  __esModule: true,
  default: {
    getStats: (...args) => mockGetStats(...args),
    getAnalyses: (...args) => mockGetAnalyses(...args)
  }
}))

// Mock emotionService default export
vi.mock('../../src/services/emotionService', () => ({
  __esModule: true,
  default: {
    getEmotionEmoji: (e) => '😊',
    getEmotionColor: (e) => '#10B981',
    translateEmotion: (e) => e
  }
}))

// Mock shared components and hooks
vi.mock('../../src/components/Shared/SharedNavbar', () => ({ __esModule: true, default: () => <div data-testid="shared-navbar" /> }))
vi.mock('../../src/components/Shared/Sidebar', () => ({ __esModule: true, default: () => <div data-testid="private-sidebar" /> }))
vi.mock('../../src/hooks/usePrivateSidebar', () => ({ __esModule: true, default: () => ({ isOpen: false, openSidebar: vi.fn(), closeSidebar: vi.fn(), toggleSidebar: vi.fn() }) }))

import HistoryPage from '../../src/components/HistoryPage/HistoryPage'
import { MemoryRouter } from 'react-router-dom'

const renderWithRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('HistoryPage component', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders stats and an analysis item when data is returned', async () => {
    mockGetStats.mockResolvedValue({ success: true, data: { total_analyses: 3, total_saved_playlists: 1, favorite_playlists_count: 0, most_common_emotion: 'HAPPY' } })

    mockGetAnalyses.mockResolvedValue({ success: true, data: { items: [
      {
        analysis_id: 'X1',
        dominant_emotion: 'HAPPY',
        confidence: 90,
        has_saved_playlist: true,
        analyzed_at: new Date().toISOString(),
        emotion_details: { HAPPY: 90, SAD: 10 },
        photo_metadata: { faces_detected: 1 }
      }
    ], total_pages: 1 } })

    renderWithRouter(<HistoryPage />)

    // wait for stats to appear
    await waitFor(() => {
      expect(screen.getByText(/Total de Análisis/i)).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    // analysis item should render (there may be multiple places showing the emotion label)
    const happyMatches = screen.getAllByText(/HAPPY/)
    expect(happyMatches.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/90%/)).toBeInTheDocument()
  })
})
