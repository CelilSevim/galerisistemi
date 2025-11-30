import { createClient } from '@supabase/supabase-js'

// Eğer Vercel'den link gelmezse veya hatalıysa, bu sahte linki kullan (Build çökmesin diye)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseKey)