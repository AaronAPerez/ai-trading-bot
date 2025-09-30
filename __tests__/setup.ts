// Jest setup for testing
import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// Polyfill for Next.js server components
global.TextEncoder = TextEncoder as typeof global.TextEncoder 
global.TextDecoder = TextDecoder as typeof global.TextDecoder

// Mock Next.js server Request/Response
global.Request = class Request {
  constructor(public url: string, public init?: RequestInit) {}
  headers = new Map()
  method = 'GET'
  json = async () => ({})
  text = async () => ''
  clone = () => this
} as any

global.Response = class Response {
  constructor(public body?: BodyInit | null, public init?: ResponseInit) {}
  headers = new Map()
  status = 200
  json = async () => ({})
  text = async () => ''
} as any

// Load real environment variables for tests
// Tests should use .env.local or .env.test with real credentials
require('dotenv').config({ path: '.env.local' })