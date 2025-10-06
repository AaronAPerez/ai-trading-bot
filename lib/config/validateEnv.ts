export function validateProductionEnv() {
  const required = [
    'APCA_API_KEY_ID',
    'APCA_API_SECRET_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXTAUTH_SECRET',
    'NEXT_PUBLIC_SENTRY_DSN',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate Alpaca API keys format
  if (!process.env.APCA_API_KEY_ID?.startsWith('PK')) {
    throw new Error('Invalid Alpaca API key format');
  }

  console.log('✅ All required environment variables validated');
}