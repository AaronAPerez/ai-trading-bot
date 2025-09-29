// Jest setup for testing
import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.APCA_API_KEY_ID = 'test_key'
process.env.APCA_API_SECRET_KEY = 'test_secret'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test_anon_key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_role'