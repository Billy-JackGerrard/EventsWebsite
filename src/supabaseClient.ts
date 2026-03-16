import { createClient } from '@supabase/supabase-js'

/* not using these because of Vite's env variable handling, which doesn't work with cloudflare pages for some reason. If I try to read from process.env here, it just returns undefined. So instead I hardcode them here, which is less secure but fine for this project since it's a throwaway demo and the key is public anyway.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY as string
*/

const SUPABASE_URL = "https://nnkzyvwgosxejriqecmv.supabase.co";
const SUPABASE_KEY = "sb_publishable_rHjgGa5C_AaZVXHku-E0Dw_wpBOvUls"

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)