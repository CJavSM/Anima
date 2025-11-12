const mockPost = vi.fn()
vi.mock('../../src/config/api', () => ({
  __esModule: true,
  default: { post: (...args) => mockPost(...args) }
}))

import emotionService from '../../src/services/emotionService'

describe('emotionService', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockPost.mockReset()
  })

  it('analyzeEmotion returns success and data on api success', async () => {
    mockPost.mockResolvedValue({ data: { emotions: [{ emotion: 'HAPPY', score: 0.9 }] } })
    const fakeFile = new Blob(['x'], { type: 'image/png' })
    const res = await emotionService.analyzeEmotion(fakeFile)
    expect(mockPost).toHaveBeenCalled()
    // first arg is endpoint
    expect(mockPost.mock.calls[0][0]).toBe('/api/emotions/analyze')
    // second arg should be a FormData
    expect(mockPost.mock.calls[0][1]).toEqual(expect.any(FormData))
    // third arg includes headers
    expect(mockPost.mock.calls[0][2]).toMatchObject({ headers: { 'Content-Type': 'multipart/form-data' } })

    expect(res.success).toBe(true)
    expect(res.data).toEqual({ emotions: [{ emotion: 'HAPPY', score: 0.9 }] })
  })

  it('analyzeEmotion returns error message from response.data.detail', async () => {
    mockPost.mockRejectedValue({ response: { data: { detail: 'bad' } } })
    const res = await emotionService.analyzeEmotion({})
    expect(res.success).toBe(false)
    expect(res.error).toBe('bad')
  })

  it('analyzeEmotion returns error message from response.data.error', async () => {
    mockPost.mockRejectedValue({ response: { data: { error: 'oops' } } })
    const res = await emotionService.analyzeEmotion({})
    expect(res.success).toBe(false)
    expect(res.error).toBe('oops')
  })

  it('analyzeEmotion returns generic message when no detail present', async () => {
    mockPost.mockRejectedValue({})
    const res = await emotionService.analyzeEmotion({})
    expect(res.success).toBe(false)
    expect(res.error).toBe('Error al analizar la imagen. Por favor intenta de nuevo.')
  })

  it('translateEmotion returns spanish translation or original', () => {
    expect(emotionService.translateEmotion('HAPPY')).toBe('Feliz')
    expect(emotionService.translateEmotion('UNKNOWN')).toBe('UNKNOWN')
  })

  it('getEmotionEmoji returns emoji for known emotion and default for unknown', () => {
    expect(emotionService.getEmotionEmoji('SAD')).toBe('😢')
    expect(emotionService.getEmotionEmoji('X')).toBe('😐')
  })

  it('getEmotionColor returns color for known emotion and default for unknown', () => {
    expect(emotionService.getEmotionColor('ANGRY')).toBe('#ef4444')
    expect(emotionService.getEmotionColor('X')).toBe('#6b7280')
  })
})
