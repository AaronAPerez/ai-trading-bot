// ===============================================
// JEST SETUP FILE - Testing Utilities and Mocks
// jest.setup.cjs
// ===============================================

require('@testing-library/jest-dom')
const { TextEncoder, TextDecoder } = require('util')

// Polyfill for TextEncoder/TextDecoder
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Polyfill for ReadableStream (needed for undici fetch)
if (typeof ReadableStream === 'undefined') {
  const { ReadableStream: NodeReadableStream } = require('stream/web')
  global.ReadableStream = NodeReadableStream
}

// Mock Next.js server Request/Response for rate-limiter
global.Request = class Request {
  constructor(url, init) {
    this.url = url
    this.init = init
  }
  headers = new Map()
  method = 'GET'
  json = async () => ({})
  text = async () => ''
  clone = () => this
}

global.Response = class Response {
  constructor(body, init) {
    this.body = body
    this.init = init
  }
  headers = new Map()
  status = 200
  json = async () => ({})
  text = async () => ''
}

// Load real environment variables for tests (from .env.local or .env)
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

// Save real fetch implementation for integration tests
// Node 18+ has native fetch support, but jsdom doesn't expose it
// We need to import it explicitly
try {
  // Try to get fetch from undici (what Node.js uses internally for fetch)
  const { fetch: undiciFetch } = require('undici')
  global.realFetch = undiciFetch
  console.log('✅ Real fetch loaded from undici for integration tests')
} catch (e) {
  // If undici import fails, the global fetch won't be available either
  console.error('Failed to load undici fetch:', e.message)
  console.warn('Real fetch not available, integration tests will be skipped')
  global.realFetch = () => Promise.reject(new Error('fetch not available'))
}

// Provide fetch mock for jsdom environment
// Tests can override this mock with specific responses
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    json: async () => ({}),
    text: async () => '',
    blob: async () => new Blob(),
    arrayBuffer: async () => new ArrayBuffer(0),
    clone: function() { return this },
  })
)

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: WebSocket.OPEN,
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Suppress console errors in tests (optional)
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})