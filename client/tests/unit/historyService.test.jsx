import historyService from '../../src/services/historyService'

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPatch = vi.fn()
const mockDelete = vi.fn()

vi.mock('../../src/config/api', () => ({
  __esModule: true,
  default: {
    get: (...args) => mockGet(...args),
    post: (...args) => mockPost(...args),
    patch: (...args) => mockPatch(...args),
    delete: (...args) => mockDelete(...args),
    interceptors: { request: { use: () => {} }, response: { use: () => {} } }
  }
}))

describe('historyService', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  test('savePlaylist success', async () => {
    mockPost.mockResolvedValue({ data: { id: 'p1' } })
    const res = await historyService.savePlaylist({ playlist_name: 'x' })
    expect(res).toEqual({ success: true, data: { id: 'p1' } })
    expect(mockPost).toHaveBeenCalledWith('/api/history/playlists', { playlist_name: 'x' })
  })

  test('savePlaylist failure returns error message', async () => {
    mockPost.mockRejectedValue({ response: { data: { detail: 'bad' } } })
    const res = await historyService.savePlaylist({})
    expect(res).toEqual({ success: false, error: 'bad' })
  })

  test('getPlaylists builds query and returns data', async () => {
    mockGet.mockResolvedValue({ data: { items: [1,2] } })
    const res = await historyService.getPlaylists({ page: 2, page_size: 10, emotion: 'happy', is_favorite: true })
    expect(res).toEqual({ success: true, data: { items: [1,2] } })
    expect(mockGet).toHaveBeenCalled()
    const calledWith = mockGet.mock.calls[0][0]
    expect(calledWith).toMatch(/\/api\/history\/playlists\?/) 
    expect(calledWith).toContain('page=2')
    expect(calledWith).toContain('page_size=10')
    expect(calledWith).toContain('emotion=happy')
    expect(calledWith).toContain('is_favorite=true')
  })

  test('getPlaylists failure returns false', async () => {
    mockGet.mockRejectedValue({ response: { data: { detail: 'nope' } } })
    const res = await historyService.getPlaylists()
    expect(res).toEqual({ success: false, error: 'nope' })
  })

  test('getPlaylist success and failure', async () => {
    mockGet.mockResolvedValueOnce({ data: { id: 'p' } })
    let res = await historyService.getPlaylist('p')
    expect(res).toEqual({ success: true, data: { id: 'p' } })

    mockGet.mockRejectedValueOnce({ response: { data: { detail: 'missing' } } })
    res = await historyService.getPlaylist('p')
    expect(res).toEqual({ success: false, error: 'missing' })
  })

  test('updatePlaylist success and failure', async () => {
    mockPatch.mockResolvedValueOnce({ data: { id: 'p', name: 'n' } })
    let res = await historyService.updatePlaylist('p', { name: 'n' })
    expect(res).toEqual({ success: true, data: { id: 'p', name: 'n' } })

    mockPatch.mockRejectedValueOnce({ response: { data: { detail: 'err' } } })
    res = await historyService.updatePlaylist('p', {})
    expect(res).toEqual({ success: false, error: 'err' })
  })

  test('deletePlaylist success and failure', async () => {
    mockDelete.mockResolvedValueOnce({ data: { ok: true } })
    let res = await historyService.deletePlaylist('p')
    expect(res).toEqual({ success: true, data: { ok: true } })

    mockDelete.mockRejectedValueOnce({ response: { data: { detail: 'delerr' } } })
    res = await historyService.deletePlaylist('p')
    expect(res).toEqual({ success: false, error: 'delerr' })
  })

  test('getAnalyses success and failure', async () => {
    mockGet.mockResolvedValueOnce({ data: { items: [] } })
    let res = await historyService.getAnalyses({ page: 1 })
    expect(res).toEqual({ success: true, data: { items: [] } })

    mockGet.mockRejectedValueOnce({ response: { data: { detail: 'nohist' } } })
    res = await historyService.getAnalyses()
    expect(res).toEqual({ success: false, error: 'nohist' })
  })

  test('getStats success and failure', async () => {
    mockGet.mockResolvedValueOnce({ data: { total: 5 } })
    let res = await historyService.getStats()
    expect(res).toEqual({ success: true, data: { total: 5 } })

    mockGet.mockRejectedValueOnce({ response: { data: { detail: 'nostats' } } })
    res = await historyService.getStats()
    expect(res).toEqual({ success: false, error: 'nostats' })
  })
})
