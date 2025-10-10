// DEPRECATED: Use @/lib/supabase/client instead
// This file is kept for backwards compatibility only
// Import from @/lib/supabase/client to avoid multiple client instances

import { createClient, createServerSupabaseClient as createServerClient, supabase as browserClient } from '@/lib/supabase/client'

export const supabase = browserClient
export const createServerSupabaseClient = createServerClient
export { createClient }

