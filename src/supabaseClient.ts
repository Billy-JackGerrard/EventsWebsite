import { createClient } from '@supabase/supabase-js'

/* Commented out because cloudlfare pages can't seem to read these
even though they;re set in the environment variables

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY as string
*/

const SUPABASE_URL = "https://nnkzyvwgosxejriqecmv.supabase.co"
const SUPABASE_KEY = "sb_publishable_rHjgGa5C_AaZVXHku-E0Dw_wpBOvUls"


export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)