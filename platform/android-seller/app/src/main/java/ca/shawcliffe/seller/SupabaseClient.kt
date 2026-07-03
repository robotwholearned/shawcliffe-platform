package ca.shawcliffe.seller

import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest

val supabase = createSupabaseClient(
    supabaseUrl = Config.SUPABASE_URL,
    supabaseKey = Config.SUPABASE_ANON_KEY,
) {
    install(Auth)
    install(Postgrest)
}
