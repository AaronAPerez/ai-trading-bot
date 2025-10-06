// Demo user management for development and testing
// This generates consistent UUIDs for demo purposes

export function generateUUIDFromString(str: string): string {
  // Simple deterministic UUID generator from string
  // This ensures the same string always generates the same UUID
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Convert to hex and pad to ensure we have enough characters
  const hex = Math.abs(hash).toString(16).padStart(8, '0');

  // Create a proper 32-character hex string for UUID
  const fullHex = (hex + hex + hex + hex).substring(0, 32);

  // Format as UUID v4 with proper lengths
  return [
    fullHex.substring(0, 8),   // 8 characters
    fullHex.substring(8, 12),  // 4 characters
    '4' + fullHex.substring(13, 16), // 4 characters, version 4
    ((parseInt(fullHex.substring(16, 17), 16) & 0x3) | 0x8).toString(16) + fullHex.substring(17, 20), // 4 characters
    fullHex.substring(20, 32)  // 12 characters
  ].join('-');
}

export const DEMO_USER_ID = 'bcc6fb8b-b62c-4d28-a976-fe49614e146d'

export function getCurrentUserId(): string {
  return DEMO_USER_ID
}

export function isDemoMode(): boolean {
  return process.env.NODE_ENV === 'development' || !process.env.NEXT_PUBLIC_SUPABASE_URL;
}