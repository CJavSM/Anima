import '@testing-library/jest-dom'

// provide a minimal mock for matchMedia if components use it
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = () => ({
    matches: false,
    addListener: () => {},
    removeListener: () => {}
  })
}
