// src/lib/supabase/init-database.ts
import { createClient } from '@supabase/supabase-js'

export const initializeUserDatabase = async (user) => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  // Create initial profile
  const { error } = await supabase
    .from('profiles')
    .insert({
      user_id: user.id,
      email: user.email,
      role: 'user'
    })

  // Create initial bot metrics
  await supabase
    .from('bot_metrics')
    .insert({
      user_id: user.id,
      is_running: false,
      uptime: 0
    })
}