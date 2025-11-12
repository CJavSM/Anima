import React from 'react'
globalThis.React = React
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mocks
const mockGetPlaylists = vi.fn()
const mockUpdatePlaylist = vi.fn()
const mockDeletePlaylist = vi.fn()
vi.mock('../../src/services/historyService', () => ({ __esModule: true, default: { getPlaylists: (...args) => mockGetPlaylists(...args), updatePlaylist: (...args) => mockUpdatePlaylist(...args), deletePlaylist: (...args) => mockDeletePlaylist(...args) } }))

const mockGetUserPlaylists = vi.fn()
vi.mock('../../src/services/spotifyService', () => ({ __esModule: true, default: { getUserPlaylists: (...args) => mockGetUserPlaylists(...args) } }))

const mockGetSpotifyLinkUrl = vi.fn()
vi.mock('../../src/services/authService', () => ({ authService: { getSpotifyLinkUrl: (...args) => mockGetSpotifyLinkUrl(...args) } }))

vi.mock('../../src/services/emotionService', () => ({ __esModule: true, default: { getEmotionEmoji: (e) => (e === 'HAPPY' ? '😊' : '😐'), getEmotionColor: (e) => (e === 'HAPPY' ? '#0f0' : '#000'), translateEmotion: (e) => (e === 'HAPPY' ? 'Feliz' : 'Neutral') } }))

vi.mock('../../src/services/musicService', () => ({ __esModule: true, default: { formatDuration: (ms) => `${Math.floor(ms/60000)}:${String(Math.floor((ms%60000)/1000)).padStart(2,'0')}` } }))

// Mocks for Shared components and hooks
vi.mock('../../src/components/Shared/SharedNavbar', () => ({ __esModule: true, default: () => <div data-testid="shared-navbar" /> }))
vi.mock('../../src/components/Shared/Sidebar', () => ({ __esModule: true, default: ({ isOpen }) => <div data-testid="private-sidebar">{isOpen ? 'open' : 'closed'}</div> }))
vi.mock('../../src/hooks/usePrivateSidebar', () => ({ __esModule: true, default: () => ({ isOpen: false, openSidebar: vi.fn(), closeSidebar: vi.fn(), toggleSidebar: vi.fn() }) }))

// Mock AuthContext
vi.mock('../../src/context/AuthContext', () => ({ useAuth: () => ({ user: globalThis.__mockAuthUser || null }) }))

import PlaylistsPage from '../../src/components/PlaylistsPage/PlaylistsPage'

describe('PlaylistsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetPlaylists.mockReset()
    mockUpdatePlaylist.mockReset()
    mockDeletePlaylist.mockReset()
    mockGetUserPlaylists.mockReset()
    mockGetSpotifyLinkUrl.mockReset()
    globalThis.__mockAuthUser = null
  })

  it('shows empty state when no playlists', async () => {
    mockGetPlaylists.mockResolvedValue({ success: true, data: { items: [], total_pages: 1 } })
    render(<MemoryRouter><PlaylistsPage /></MemoryRouter>)

    expect(await screen.findByText(/No hay playlists guardadas/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Crear Playlist/i })).toBeInTheDocument()
  })

  it('renders playlists list and pagination and shows details on selection', async () => {
    const playlist = {
      id: 'p1',
      playlist_name: 'My List',
      is_favorite: false,
      tracks: [{ id: 't1', name: 'Song 1', duration_ms: 210000, artists: ['A'], album: 'AL', external_url: 'http://s', preview_url: null }],
      emotion: 'HAPPY',
      created_at: '2023-01-01T00:00:00Z'
    }
    mockGetPlaylists.mockResolvedValue({ success: true, data: { items: [playlist], total_pages: 2 } })

    render(<MemoryRouter><PlaylistsPage /></MemoryRouter>)

    // list loaded
    expect(await screen.findByText(/My List/i)).toBeInTheDocument()
    // pagination exists
    expect(screen.getByText(/1 \/ 2/)).toBeInTheDocument()

    // select playlist
    fireEvent.click(screen.getByText(/My List/i))
    expect(await screen.findByText(/Creada el/i)).toBeInTheDocument()
    // duration formatted
    expect(screen.getByText('3:30')).toBeInTheDocument()
  })

  it('shows spotify modal when user linked and spotifyService returns playlists', async () => {
    const user = { id: 1, spotify_connected: true }
    globalThis.__mockAuthUser = user
    mockGetPlaylists.mockResolvedValue({ success: true, data: { items: [], total_pages: 1 } })

    mockGetUserPlaylists.mockResolvedValue({ success: true, data: [{ id: 'sp1', name: 'SP', tracks_total: 5, external_url: 'http://s' }] })

    render(<MemoryRouter><PlaylistsPage /></MemoryRouter>)

    // click Ver Playlists en Spotify button
    const btn = await screen.findByText(/Ver Playlists en Spotify/i)
    fireEvent.click(btn)

    // modal should appear
    expect(await screen.findByText(/Tus playlists en Spotify/i)).toBeInTheDocument()
    expect(screen.getByText(/SP/)).toBeInTheDocument()
  })

  it('attempts to link spotify when user not linked', async () => {
    const user = { id: 2, spotify_connected: false }
    globalThis.__mockAuthUser = user
    mockGetPlaylists.mockResolvedValue({ success: true, data: { items: [], total_pages: 1 } })
    mockGetSpotifyLinkUrl.mockResolvedValue('https://spotify.example')

    const originalLocation = global.window.location
    // @ts-ignore
    delete global.window.location
    global.window.location = { href: '', assign: vi.fn() }

    render(<MemoryRouter><PlaylistsPage /></MemoryRouter>)

    const btn = await screen.findByText(/Conectar con Spotify/i)
    fireEvent.click(btn)

    await waitFor(() => expect(mockGetSpotifyLinkUrl).toHaveBeenCalled())
    expect(global.window.location.href).toBe('https://spotify.example')

    global.window.location = originalLocation
  })

  it('does not render play overlay when no preview_url and shows open-in-spotify button', async () => {
    mockGetPlaylists.mockResolvedValue({ success: true, data: { items: [{ id: 'p2', playlist_name: 'List2', is_favorite: false, tracks: [{ id: 't2', name: 'NoPrev', duration_ms: 1000, artists: ['X'], album: 'A', external_url: 'u', preview_url: null }], emotion: 'SAD', created_at: '2023-01-01T00:00:00Z' }], total_pages: 1 } })

    render(<MemoryRouter><PlaylistsPage /></MemoryRouter>)

    expect(await screen.findByText(/List2/i)).toBeInTheDocument()
    fireEvent.click(screen.getByText(/List2/i))

    // there should be no play overlay for tracks without preview
    const overlays = document.querySelectorAll('.track-play-overlay')
    expect(overlays.length).toBe(0)

    // but an 'Abrir en Spotify' button should be present
    const openBtn = document.querySelector('.track-spotify-btn-small')
    expect(openBtn).toBeTruthy()
  })

  it('plays preview when preview_url present using Audio mock', async () => {
    const playMock = vi.fn()
    const pauseMock = vi.fn()
    function MockAudio(url) {
      this.src = url
      this.play = playMock
      this.pause = pauseMock
      this.onended = null
      this.volume = 1
    }
    globalThis.Audio = MockAudio

    mockGetPlaylists.mockResolvedValue({ success: true, data: { items: [{ id: 'p3', playlist_name: 'List3', is_favorite: false, tracks: [{ id: 't3', name: 'HasPrev', duration_ms: 120000, artists: ['X'], album: 'A', external_url: 'u', preview_url: 'http://prev' }], emotion: 'CALM', created_at: '2023-01-01T00:00:00Z' }], total_pages: 1 } })

    render(<MemoryRouter><PlaylistsPage /></MemoryRouter>)

    expect(await screen.findByText(/List3/i)).toBeInTheDocument()
    fireEvent.click(screen.getByText(/List3/i))

    const overlay = document.querySelector('.track-play-overlay')
    expect(overlay).toBeTruthy()
    fireEvent.click(overlay)

    expect(playMock).toHaveBeenCalled()
    delete globalThis.Audio
  })

  it('toggles favorite and updates selected playlist star', async () => {
    const playlist = {
      id: 'p4',
      playlist_name: 'FavList',
      is_favorite: false,
      tracks: [],
      emotion: 'HAPPY',
      created_at: '2023-01-01T00:00:00Z'
    }
    mockGetPlaylists.mockResolvedValue({ success: true, data: { items: [playlist], total_pages: 1 } })
    mockUpdatePlaylist.mockResolvedValue({ success: true })

    render(<MemoryRouter><PlaylistsPage /></MemoryRouter>)

    expect(await screen.findByText(/FavList/i)).toBeInTheDocument()
    fireEvent.click(screen.getByText(/FavList/i))

    const favBtn = await screen.findByTitle(/Agregar a favoritos|Quitar de favoritos/i)
    expect(favBtn).toBeInTheDocument()

    fireEvent.click(favBtn)

    await waitFor(() => expect(mockUpdatePlaylist).toHaveBeenCalled())
    expect(favBtn.textContent).toBe('⭐')
  })

  it('deletes playlist when confirm accepted', async () => {
    const playlist = {
      id: 'p5',
      playlist_name: 'DelList',
      is_favorite: false,
      tracks: [],
      emotion: 'CALM',
      created_at: '2023-01-01T00:00:00Z'
    }
    mockGetPlaylists.mockResolvedValue({ success: true, data: { items: [playlist], total_pages: 1 } })
    mockDeletePlaylist.mockResolvedValue({ success: true })

    const confirmSpy = vi.spyOn(global, 'confirm').mockImplementation(() => true)

    render(<MemoryRouter><PlaylistsPage /></MemoryRouter>)

    expect(await screen.findByText(/DelList/i)).toBeInTheDocument()
    fireEvent.click(screen.getByText(/DelList/i))

    const delBtn = await screen.findByTitle(/Eliminar playlist/i)
    fireEvent.click(delBtn)

    await waitFor(() => expect(mockDeletePlaylist).toHaveBeenCalled())
    expect(screen.getByText(/Selecciona una playlist para ver sus detalles/i)).toBeInTheDocument()

    confirmSpy.mockRestore()
  })
})
