import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// expose React globally for components compiled with older JSX transform
globalThis.React = React

// Provide a mock for AuthContext used by the Home component
vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'testuser', username: 'test' } })
}))

import Home from '../../src/components/Home/Home'
import emotionService from '../../src/services/emotionService'
import { MemoryRouter } from 'react-router-dom'

const renderWithRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>)

// Provide a simple FileReader mock for tests
class MockFileReader {
  constructor() {
    this.onloadend = null
    this.result = 'data:image/jpeg;base64,abc'
  }
  readAsDataURL() {
    if (this.onloadend) this.onloadend()
  }
}

describe('Home component', () => {
  beforeEach(() => {
    // reset mocks
    vi.restoreAllMocks()
    // mock FileReader
    global.FileReader = MockFileReader
    // ensure localStorage is clean
    localStorage.clear()
  })

  it('renders title and basic UI', () => {
  renderWithRouter(<Home />)
    expect(screen.getByText(/¿Cómo te sentís hoy\?/i)).toBeInTheDocument()
    expect(screen.getByText(/Elegí cómo querés capturar tu momento/i)).toBeInTheDocument()
  })

  it('shows error when selecting non-image file', async () => {
  renderWithRouter(<Home />)
    const input = screen.getByLabelText(/Subir Imagen/i) || document.querySelector('#file-upload')
    const file = new File(['text'], 'test.txt', { type: 'text/plain' })

    // fire change event
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/Por favor selecciona una imagen válida/i)).toBeInTheDocument()
    })
  })

  it('shows error when selecting image larger than 5MB', async () => {
  renderWithRouter(<Home />)
    const input = screen.getByLabelText(/Subir Imagen/i) || document.querySelector('#file-upload')
    // create a large file (~6MB)
    const large = new File([new Array(6 * 1024 * 1024).fill('a').join('')], 'big.jpg', { type: 'image/jpeg' })

    fireEvent.change(input, { target: { files: [large] } })

    await waitFor(() => {
      expect(screen.getByText(/La imagen no debe superar los 5MB/i)).toBeInTheDocument()
    })
  })

  it('analyze flow success displays result', async () => {
    // mock analyzeEmotion and helper functions
    vi.spyOn(emotionService, 'analyzeEmotion').mockResolvedValue({
      success: true,
      data: {
        dominant_emotion: { type: 'happy', confidence: 85 },
        all_emotions: { happy: 85, sad: 15 },
        analysis_id: 'A1'
      }
    })
    vi.spyOn(emotionService, 'translateEmotion').mockReturnValue('Feliz')
    vi.spyOn(emotionService, 'getEmotionEmoji').mockReturnValue('😄')
    vi.spyOn(emotionService, 'getEmotionColor').mockReturnValue('#ff0')

  renderWithRouter(<Home />)
    const input = screen.getByLabelText(/Subir Imagen/i) || document.querySelector('#file-upload')
    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })

    fireEvent.change(input, { target: { files: [file] } })

    // click analyze button after preview is set by FileReader mock
    await waitFor(() => expect(screen.getByText(/Analizar Emoción/i)).toBeInTheDocument())
    fireEvent.click(screen.getByText(/Analizar Emoción/i))

    await waitFor(() => {
      expect(screen.getByText(/Resultado del Análisis/i)).toBeInTheDocument()
      // the emotion label may appear in multiple places (badge + label). Assert at least one match
      const felizMatches = screen.getAllByText(/Feliz/)
      expect(felizMatches.length).toBeGreaterThan(0)
      expect(screen.getByText(/85%/)).toBeInTheDocument()
    })
  })

  it('startCamera permission denied sets appropriate error message', async () => {
  renderWithRouter(<Home />)

    // mock navigator.mediaDevices.getUserMedia to throw a NotAllowedError
    const mockGet = vi.fn().mockRejectedValue(Object.assign(new Error('denied'), { name: 'NotAllowedError' }))
    global.navigator.mediaDevices = { getUserMedia: mockGet }

    fireEvent.click(screen.getByText(/Abrir Cámara/i))

    await waitFor(() => {
      expect(screen.getByText(/Permisos de cámara denegados/i)).toBeInTheDocument()
    })
  })

  it('reset clears selected image and preview', async () => {
    renderWithRouter(<Home />)
    const input = screen.getByLabelText(/Subir Imagen/i) || document.querySelector('#file-upload')
    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(screen.getByText(/Analizar Emoción/i)).toBeInTheDocument())
    fireEvent.click(screen.getByText(/Cambiar Foto/i))

    await waitFor(() => {
      // after reset the analyze button should not be visible
      expect(screen.queryByText(/Analizar Emoción/i)).not.toBeInTheDocument()
    })
  })
})
