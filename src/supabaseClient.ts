import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://nnkzyvwgosxejriqecmv.supabase.co'
const SUPABASE_KEY = 'sb_publishable_rHjgGa5C_AaZVXHku-E0Dw_wpBOvUls'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)