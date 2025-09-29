// components/__tests__/BotControlPanel.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BotControlPanel } from '../trading/BotControlPanel'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
)

describe('BotControlPanel', () => {
  it('renders start button when bot is stopped', () => {
    render(<BotControlPanel />, { wrapper })
    
    expect(screen.getByText(/start bot/i)).toBeInTheDocument()
  })

  it('starts bot when start button is clicked', async () => {
    render(<BotControlPanel />, { wrapper })
    
    const startButton = screen.getByText(/start bot/i)
    fireEvent.click(startButton)
    
    await waitFor(() => {
      expect(screen.getByText(/stop bot/i)).toBeInTheDocument()
    })
  })

  it('displays bot configuration form', () => {
    render(<BotControlPanel />, { wrapper })
    
    expect(screen.getByLabelText(/trading mode/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confidence threshold/i)).toBeInTheDocument()
  })

  it('validates configuration before starting', async () => {
    render(<BotControlPanel />, { wrapper })
    
    // Try to start with invalid config
    const confidenceInput = screen.getByLabelText(/confidence threshold/i)
    fireEvent.change(confidenceInput, { target: { value: '150' } }) // Invalid: > 100
    
    const startButton = screen.getByText(/start bot/i)
    fireEvent.click(startButton)
    
    await waitFor(() => {
      expect(screen.getByText(/invalid configuration/i)).toBeInTheDocument()
    })
  })
})