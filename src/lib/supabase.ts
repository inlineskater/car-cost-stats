import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Not using the Database generic — hooks cast results to domain types explicitly.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
