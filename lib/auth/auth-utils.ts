/**
 * Authentication Utilities
 * Centralized auth helpers for the AI Trading Bot
 * 
 * @author AI Trading Bot Team
 * @version 1.0.0
 */

/**
 * Generate deterministic UUID from string
 * Used for demo/development mode
 */
function generateUUIDFromString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }

  // Convert to hex and pad
  const hex = Math.abs(hash).toString(16).padStart(8, '0')
  const fullHex = (hex + hex + hex + hex).substring(0, 32)

  // Format as UUID v4
  return [
    fullHex.substring(0, 8),
    fullHex.substring(8, 12),
    '4' + fullHex.substring(13, 16),
    ((parseInt(fullHex.substring(16, 17), 16) & 0x3) | 0x8).toString(16) + fullHex.substring(17, 20),
    fullHex.substring(20, 32)
  ].join('-')
}

// Demo user ID for development
export const DEMO_USER_ID = generateUUIDFromString('demo-user-123')

/**
 * Get current user ID
 * In production, this would get from auth context/session
 * For now, returns demo user ID
 */
export function getCurrentUserId(): string {
  // TODO: Replace with actual auth in production
  // Example: 
  // const session = await getServerSession()
  // return session?.user?.id || DEMO_USER_ID
  
  return DEMO_USER_ID
}

/**
 * Check if app is in demo/development mode
 */
export function isDemoMode(): boolean {
  return process.env.NODE_ENV === 'development' || 
         process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
}

/**
 * Get user email (mock for now)
 */
export function getUserEmail(): string {
  // TODO: Replace with actual auth
  return 'demo@tradingbot.com'
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  // TODO: Replace with actual auth check
  return true
}