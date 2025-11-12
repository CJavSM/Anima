const mockGet = vi.fn()
vi.mock('../../src/config/api', () => ({ __esModule: true, default: { get: (...args) => mockGet(...args) } }))

// import the real module (it will internally use the mocked api.get)
import musicService from '../../src/services/musicService'

describe('musicService', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGet.mockReset()
  })

  it('getRecommendations returns success and calls api.get with params', async () => {
    mockGet.mockResolvedValue({ data: { total: 1, tracks: [] } })
    const res = await musicService.getRecommendations('HAPPY', 10)
    expect(mockGet).toHaveBeenCalled()
    // endpoint should include emotion
    expect(mockGet.mock.calls[0][0]).toBe('/api/music/recommendations/HAPPY')
    // params should include limit
    expect(mockGet.mock.calls[0][1]).toMatchObject({ params: { limit: 10 } })

    expect(res.success).toBe(true)
    expect(res.data).toEqual({ total: 1, tracks: [] })
  })

  it('getRecommendations returns cancelled flag when aborted', async () => {
    const err = { code: 'ERR_CANCELED' }
    mockGet.mockRejectedValue(err)
    const res = await musicService.getRecommendations('SAD')
    expect(res.cancelled).toBe(true)
    expect(res.success).toBe(false)
  })

  it('getRecommendations returns error message from response.data.detail', async () => {
    mockGet.mockRejectedValue({ response: { data: { detail: 'nope' } } })
    const res = await musicService.getRecommendations('ANGRY')
    expect(res.success).toBe(false)
    expect(res.error).toBe('nope')
  })

  it('getRecommendations returns generic error when none provided', async () => {
    mockGet.mockRejectedValue({})
    const res = await musicService.getRecommendations('CALM')
    expect(res.success).toBe(false)
    expect(res.error).toBe('Error al obtener recomendaciones musicales.')
  })

  it('formatDuration converts ms to mm:ss', () => {
    expect(musicService.formatDuration(90000)).toBe('1:30')
    expect(musicService.formatDuration(61000)).toBe('1:01')
    expect(musicService.formatDuration(0)).toBe('0:00')
  })

  it('openInSpotify uses window.open', () => {
    const spy = vi.spyOn(window, 'open').mockImplementation(() => {})
    musicService.openInSpotify('https://test')
    expect(spy).toHaveBeenCalledWith('https://test', '_blank')
    spy.mockRestore()
  })
})
