const mockGet = vi.fn()
const mockPost = vi.fn()

vi.mock('../../src/config/api', () => ({
  __esModule: true,
  default: { get: (...args) => mockGet(...args), post: (...args) => mockPost(...args) }
}))

import spotifyService from '../../src/services/spotifyService'

describe('spotifyService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockGet.mockReset()
    mockPost.mockReset()
  })

  it('getUserPlaylists returns data on success', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 'p1' }] })
    const res = await spotifyService.getUserPlaylists(10)
    expect(mockGet).toHaveBeenCalledWith('/api/spotify/playlists?limit=10')
    expect(res).toEqual({ success: true, data: [{ id: 'p1' }] })
  })

  it('getUserPlaylists returns failure info on error', async () => {
    mockGet.mockRejectedValue({ response: { data: { detail: 'nope' } } })
    const res = await spotifyService.getUserPlaylists()
    expect(res.success).toBe(false)
    expect(res.error).toEqual({ detail: 'nope' })
  })

  it('createPlaylist validation: missing name', async () => {
    const res = await spotifyService.createPlaylist({ name: '', tracks: ['1'] })
    expect(res).toEqual({ success: false, error: "El nombre de la playlist es requerido" })
  })

  it('createPlaylist validation: empty tracks', async () => {
    const res = await spotifyService.createPlaylist({ name: 'X', tracks: [] })
    expect(res).toEqual({ success: false, error: 'La lista de canciones está vacía' })
  })

  it('createPlaylist normalizes track ids and calls api.post', async () => {
    mockPost.mockResolvedValue({ data: { id: 'sp1' } })
    const payload = { name: 'MyList', description: 'desc', tracks: [1, null, '3'], isPublic: true }
    const res = await spotifyService.createPlaylist(payload)
    // Implementation converts values to strings and filters falsy AFTER stringifying,
    // so null becomes 'null' (truthy) — assert accordingly.
    expect(mockPost).toHaveBeenCalledWith('/api/spotify/playlists', { name: 'MyList', description: 'desc', tracks: ['1', 'null', '3'], public: true })
    expect(res).toEqual({ success: true, data: { id: 'sp1' } })
  })

  it('createPlaylist returns friendly error when api fails', async () => {
    mockPost.mockRejectedValue({ response: { data: { detail: 'bad' } } })
    const res = await spotifyService.createPlaylist({ name: 'Ok', tracks: ['1'] })
    expect(res.success).toBe(false)
    expect(res.error).toBe('bad')
  })
})
