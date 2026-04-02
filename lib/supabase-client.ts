import { createClient } from '@supabase/supabase-js'

let supabaseInstance: any = null

export function getSupabase() {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables')
    }

    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
  }

  return supabaseInstance
}

// For client-side usage in useEffect
export const supabase = {
  get auth() {
    return getSupabase().auth
  },
  from(table: string) {
    return getSupabase().from(table)
  },
}

