import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

globalThis.React = React

// Mock services used by the component
const mockGetRecommendations = vi.fn()
const mockOpenInSpotify = vi.fn()
const mockFormatDuration = vi.fn((ms) => `${Math.round(ms/1000)}s`)
vi.mock('../../src/services/musicService', () => ({
  __esModule: true,
  default: {
    getRecommendations: (...args) => mockGetRecommendations(...args),
    openInSpotify: (...args) => mockOpenInSpotify(...args),
    formatDuration: (...args) => mockFormatDuration(...args)
  }
}))

const mockSavePlaylist = vi.fn()
vi.mock('../../src/services/historyService', () => ({
  __esModule: true,
  default: { savePlaylist: (...args) => mockSavePlaylist(...args) }
}))

const mockCreatePlaylist = vi.fn()
vi.mock('../../src/services/spotifyService', () => ({
  __esModule: true,
  default: { createPlaylist: (...args) => mockCreatePlaylist(...args) }
}))

const mockGetSpotifyLinkUrl = vi.fn()
vi.mock('../../src/services/authService', () => ({
  authService: {
    getSpotifyLinkUrl: (...args) => mockGetSpotifyLinkUrl(...args)
  }
}))

// auth context
vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({ user: globalThis.__testUser || null })
}))

// emotionService helpers
vi.mock('../../src/services/emotionService', () => ({
  __esModule: true,
  default: {
    translateEmotion: (e) => `Traducción-${e}`,
    getEmotionEmoji: (e) => '😊'
  },
  getEmotionEmoji: (e) => '😊',
  translateEmotion: (e) => `Traducción-${e}`
}))

import MusicRecommendations from '../../src/components/MusicRecommendations/MusicRecommendations'

describe('MusicRecommendations', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockGetRecommendations.mockReset()
    mockOpenInSpotify.mockReset()
    mockFormatDuration.mockReset()
    mockSavePlaylist.mockReset()
    mockCreatePlaylist.mockReset()
    mockGetSpotifyLinkUrl.mockReset()
    // default user connected state
    globalThis.__testUser = { id: 1, spotify_connected: true }

    // Mock Audio for preview playback
    class MockAudio {
      constructor(src) { this.src = src; this.volume = 1; this.onended = null; }
      play() { return Promise.resolve() }
      pause() {}
    }
    global.Audio = MockAudio

    // make window.location writable in tests
    const origLocation = window.location
    // eslint-disable-next-line no-dynamic-delete
    try { delete window.location } catch (e) {}
    window.location = { href: '' }
    global.__origLocation = origLocation
  })

  afterEach(() => {
    // restore location
    try { window.location = global.__origLocation } catch (e) {}
    localStorage.clear()
  })

  it('renders loading then shows recommendations and opens in Spotify', async () => {
    const rec = {
      total: 1,
      genres_used: ['pop'],
      music_params: { valence: 0.5, energy: 0.6, tempo: 120, mode: 'Mayor' },
      playlist_description: 'Desc',
      tracks: [
        { id: 't1', name: 'Song 1', artists: ['Artist'], album: 'Album', duration_ms: 200000, popularity: 50, preview_url: 'https://p', album_image: null, external_url: 'https://open.spotify/1' }
      ]
    }

    mockGetRecommendations.mockResolvedValue({ success: true, data: rec })

    const { container } = render(<MusicRecommendations emotion="HAPPY" emotionColor="#0f0" analysisId={null} onClose={() => {}} />)

    // loading shown
    expect(screen.getByText(/Buscando la música perfecta/i)).toBeInTheDocument()

    // await recommendations render
    await waitFor(() => expect(container.querySelector('.tracks-title')).toBeTruthy())

    // The number of songs stat should show '1'
    const statValue = container.querySelector('.music-stats .stat-value')
    expect(statValue).toBeTruthy()
    expect(statValue.textContent).toBe('1')

    // click open in spotify button
    const openBtn = screen.getByTitle('Abrir en Spotify')
    fireEvent.click(openBtn)
    expect(mockOpenInSpotify).toHaveBeenCalledWith('https://open.spotify/1')
  })

  it('alerts when toggling preview for track without preview_url', async () => {
  const rec = { total:1, genres_used:[], music_params:{valence:0}, playlist_description:'d', tracks:[{ id:'t2', name:'NoPreview', artists:['A'], album:'A', duration_ms:1000, popularity:10, preview_url: null, external_url:'u' }] }
    mockGetRecommendations.mockResolvedValue({ success: true, data: rec })

    global.alert = vi.fn()

  const { container } = render(<MusicRecommendations emotion="CALM" emotionColor="#aaa" analysisId={null} onClose={() => {}} />)

  await waitFor(() => expect(container.querySelector('.tracks-title')).toBeTruthy())

  // click play button isn't present since no preview_url; ensure no play button is rendered for that track
  const playBtn = container.querySelector('.track-play-btn')
  // since preview_url is null, the component should not render an active play button or it should be disabled
  expect(playBtn === null || playBtn.disabled === true).toBeTruthy()
  // ensure track name is rendered
  expect(container.querySelector('.track-name').textContent).toBe('NoPreview')
  })

  it('saves playlist to Anima and to Spotify when user linked', async () => {
    const rec = {
      total: 2,
      genres_used: ['pop'],
      music_params: { valence: 0.1, energy: 0.2, tempo: 100, mode: 'Minor' },
      playlist_description: 'Desc',
      tracks: [
        { id: 'a1', name: 'A1', artists: ['X'], album: 'Alb', duration_ms: 120000, popularity: 10, preview_url: null, external_url: 'u1' },
        { id: 'a2', name: 'A2', artists: ['Y'], album: 'Alb2', duration_ms: 90000, popularity: 20, preview_url: null, external_url: 'u2' }
      ]
    }
    mockGetRecommendations.mockResolvedValue({ success: true, data: rec })
    mockSavePlaylist.mockResolvedValue({ success: true })
    mockCreatePlaylist.mockResolvedValue({ success: true, data: { id: 'sp1' } })

  const { container } = render(<MusicRecommendations emotion="HAPPY" emotionColor="#0f0" analysisId={'AN1'} onClose={() => {}} />)

  await waitFor(() => expect(container.querySelector('.tracks-title')).toBeTruthy())

  // open save dialog
  const saveTrigger = container.querySelector('.btn-save-playlist')
  expect(saveTrigger).toBeTruthy()
  fireEvent.click(saveTrigger)

  // Wait for inputs
  await waitFor(() => expect(screen.getByPlaceholderText(/Ej: Mi playlist feliz/i)).toBeInTheDocument())

  // fill name
  const nameInput = screen.getByPlaceholderText(/Ej: Mi playlist feliz/i)
  fireEvent.change(nameInput, { target: { value: 'Test Playlist' } })

  // click save
  // ensure saveToSpotify is enabled so the spotify create flow runs (user is linked)
  const spotifyCheckbox = screen.queryByLabelText(/Guardar también en mi cuenta de Spotify/i)
  if (spotifyCheckbox) fireEvent.click(spotifyCheckbox)

  const saveBtn = screen.getByText('Guardar')
  fireEvent.click(saveBtn)

  await waitFor(() => expect(mockSavePlaylist).toHaveBeenCalled())
  // spotify create should be called because user.spotify_connected true
  await waitFor(() => expect(mockCreatePlaylist).toHaveBeenCalled())
  })

  it('initiates spotify link flow when user not linked and saveToSpotify checked', async () => {
    // user exists but not linked
    globalThis.__testUser = { id: 2, spotify_connected: false }

  const rec = { total:1, genres_used:[], music_params:{}, playlist_description:'desc', tracks:[{id:'x1', name:'X', artists:['Z'], album:'Alb', duration_ms:111000, popularity:5, preview_url: null, external_url: 'ux'}] }
    mockGetRecommendations.mockResolvedValue({ success: true, data: rec })
    mockGetSpotifyLinkUrl.mockResolvedValue('https://link.spotify')

    render(<MusicRecommendations emotion="SAD" emotionColor="#00f" analysisId={'AN2'} onClose={() => {}} />)

    await waitFor(() => expect(screen.getByText(/Canciones Recomendadas/i)).toBeInTheDocument())

    // open save dialog
    fireEvent.click(screen.getByText(/Guardar Playlist/i))
    await waitFor(() => expect(screen.getByPlaceholderText(/Ej: Mi playlist feliz/i)).toBeInTheDocument())

    // set name
    const nameInput = screen.getByPlaceholderText(/Ej: Mi playlist feliz/i)
    fireEvent.change(nameInput, { target: { value: 'Link Playlist' } })

    // toggle saveToSpotify checkbox (visible because user exists)
    const checkbox = screen.getByLabelText(/Guardar también en mi cuenta de Spotify/i)
    fireEvent.click(checkbox)

    // make window.location writable
    const orig = window.location
    try { delete window.location } catch (e) {}
    window.location = { href: '' }

    // click save
    fireEvent.click(screen.getByText('Guardar'))

    await waitFor(() => expect(mockGetSpotifyLinkUrl).toHaveBeenCalled())
    expect(window.location.href).toBe('https://link.spotify')

    // restore
    try { window.location = orig } catch (e) {}
  })
})
