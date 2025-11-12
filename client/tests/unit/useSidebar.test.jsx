import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import useSidebar from '../../src/hooks/useSidebar'

// Small test harness component for the hook
function TestHarness() {
  const { isOpen, openSidebar, closeSidebar, toggleSidebar } = useSidebar()
  return (
    <div>
      <span data-testid="sidebar-state">{isOpen ? 'open' : 'closed'}</span>
      <button onClick={openSidebar}>open</button>
      <button onClick={closeSidebar}>close</button>
      <button onClick={toggleSidebar}>toggle</button>
    </div>
  )
}

describe('useSidebar hook', () => {
  it('starts closed and openSidebar opens it', () => {
    render(<TestHarness />)
    expect(screen.getByTestId('sidebar-state').textContent).toBe('closed')
    fireEvent.click(screen.getByText('open'))
    expect(screen.getByTestId('sidebar-state').textContent).toBe('open')
  })

  it('closeSidebar closes it', () => {
    render(<TestHarness />)
    // open first
    fireEvent.click(screen.getByText('open'))
    expect(screen.getByTestId('sidebar-state').textContent).toBe('open')
    fireEvent.click(screen.getByText('close'))
    expect(screen.getByTestId('sidebar-state').textContent).toBe('closed')
  })

  it('toggleSidebar toggles state', () => {
    render(<TestHarness />)
    expect(screen.getByTestId('sidebar-state').textContent).toBe('closed')
    fireEvent.click(screen.getByText('toggle'))
    expect(screen.getByTestId('sidebar-state').textContent).toBe('open')
    fireEvent.click(screen.getByText('toggle'))
    expect(screen.getByTestId('sidebar-state').textContent).toBe('closed')
  })
})
