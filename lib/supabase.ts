import { createClient } from '@supabase/supabase-js'

// AYARLARLA UĞRAŞMAYA SON. ADRESİ VE ANAHTARI DİREKT BURAYA YAZIYORUZ.
// Bu sayede Netlify'ın ayarları okuyup okumaması umurumuzda değil.

const supabaseUrl = 'https://pirpimzjidsolvclwuaj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpcnBpbXpqaWRzb2x2Y2x3dWFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MTk4MjgsImV4cCI6MjA3OTk5NTgyOH0.7cSkItmvI4nk4JT-6JT8xAD2yUlLiPhZ2uSiwCx90r8'

export const supabase = createClient(supabaseUrl, supabaseKey)