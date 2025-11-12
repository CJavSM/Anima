import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

globalThis.React = React

import History from '../../src/components/HistoryPage/History'

describe('History component', () => {
  let fetchMock
  const API = 'http://localhost:8000'

  beforeEach(() => {
    fetchMock = vi.fn()
    global.fetch = fetchMock
    localStorage.setItem('token', 'tkn')
    // default confirm to true for delete flow
    global.confirm = vi.fn(() => true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('shows stats and empty analyses when no data', async () => {
    const stats = { total_analyses: 2, total_saved_playlists: 1, favorite_playlists_count: 0 }

    fetchMock.mockImplementation((url) => {
      if (url === `${API}/api/history/stats`) return Promise.resolve({ ok: true, json: async () => stats })
      if (url.startsWith(`${API}/api/history/analyses`)) return Promise.resolve({ ok: true, json: async () => ({ items: [] }) })
      return Promise.resolve({ ok: false })
    })

    const onClose = vi.fn()
    render(<History user={{}} onClose={onClose} />)

    // waits for loading to finish and empty message
    await waitFor(() => expect(screen.getByText(/No hay análisis todavía/i)).toBeInTheDocument())

    // stats are displayed
    expect(screen.getByText(String(stats.total_analyses))).toBeInTheDocument()
    expect(screen.getByText(String(stats.total_saved_playlists))).toBeInTheDocument()
  })

  it('renders an analysis card when data present', async () => {
    const stats = { total_analyses: 1 }
    const analysis = {
      analysis_id: 'A1',
      dominant_emotion: 'HAPPY',
      confidence: 88,
      analyzed_at: new Date().toISOString(),
      has_saved_playlist: true
    }

    fetchMock.mockImplementation((url) => {
      if (url === `${API}/api/history/stats`) return Promise.resolve({ ok: true, json: async () => stats })
      if (url.startsWith(`${API}/api/history/analyses`)) return Promise.resolve({ ok: true, json: async () => ({ items: [analysis] }) })
      return Promise.resolve({ ok: false })
    })

    render(<History user={{}} onClose={() => {}} />)

    await waitFor(() => expect(screen.getByText(/Confianza:/i)).toBeInTheDocument())
    expect(screen.getByText(/HAPPY/i)).toBeInTheDocument()
    expect(screen.getByText(/88%/i)).toBeInTheDocument()
    expect(screen.getByText(/Playlist guardada/i)).toBeInTheDocument()
  })

  it('switches to playlists tab and can toggle favorite and delete', async () => {
    const stats = { total_saved_playlists: 1 }
    const playlist = {
      id: 'P1',
      playlist_name: 'Mi Playlist',
      emotion: 'SAD',
      is_favorite: false,
      tracks: [1,2],
      created_at: new Date().toISOString(),
      description: 'desc'
    }

    fetchMock.mockImplementation((url, opts) => {
      // stats first
      if (url === `${API}/api/history/stats`) return Promise.resolve({ ok: true, json: async () => stats })
      // analyses fallback
      if (url.startsWith(`${API}/api/history/analyses`)) return Promise.resolve({ ok: true, json: async () => ({ items: [] }) })
      // playlists GET
      if (url.startsWith(`${API}/api/history/playlists`) && (!opts || opts.method === undefined)) return Promise.resolve({ ok: true, json: async () => ({ items: [playlist] }) })
      // PATCH favorite
      if (opts && opts.method === 'PATCH') return Promise.resolve({ ok: true })
      // DELETE playlist
      if (opts && opts.method === 'DELETE') return Promise.resolve({ ok: true })
      return Promise.resolve({ ok: false })
    })

    render(<History user={{}} onClose={() => {}} />)

  // click playlists tab (use role to avoid matching subtitle text)
  fireEvent.click(screen.getByRole('button', { name: /Playlists Guardadas/i }))

    await waitFor(() => expect(screen.getByText(/Mi Playlist/i)).toBeInTheDocument())

    // favorite button (title attribute)
    const favBtn = screen.getByTitle(/Agregar a favoritos|Quitar de favoritos/i)
    fireEvent.click(favBtn)

    // expect a PATCH to have been made
    await waitFor(() => {
      const calledPatch = fetchMock.mock.calls.some((call) => call[1] && call[1].method === 'PATCH')
      expect(calledPatch).toBe(true)
    })

    // delete button
    const delBtn = screen.getByTitle(/Eliminar playlist/i)
    fireEvent.click(delBtn)

    await waitFor(() => {
      const calledDelete = fetchMock.mock.calls.some((call) => call[1] && call[1].method === 'DELETE')
      expect(calledDelete).toBe(true)
    })
  })

  it('applies emotion filter when selecting an emotion', async () => {
    const stats = {}
    fetchMock.mockImplementation((url) => {
      if (url === `${API}/api/history/stats`) return Promise.resolve({ ok: true, json: async () => stats })
      // check that later call includes emotion=HAPPY
      if (url.includes('emotion=HAPPY')) return Promise.resolve({ ok: true, json: async () => ({ items: [] }) })
      if (url.startsWith(`${API}/api/history/analyses`)) return Promise.resolve({ ok: true, json: async () => ({ items: [] }) })
      return Promise.resolve({ ok: false })
    })

    render(<History user={{}} onClose={() => {}} />)

    // change select to HAPPY
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'HAPPY' } })

    await waitFor(() => {
      // ensure fetch was called with emotion param
      const called = fetchMock.mock.calls.some(call => call[0].includes('emotion=HAPPY'))
      expect(called).toBe(true)
    })
  })

  it('calls onClose when overlay is clicked', () => {
    fetchMock.mockImplementation(() => Promise.resolve({ ok: true, json: async () => ({}) }))
    const onClose = vi.fn()
    render(<History user={{}} onClose={onClose} />)

    fireEvent.click(document.querySelector('.history-modal-overlay'))
    expect(onClose).toHaveBeenCalled()
  })
})
