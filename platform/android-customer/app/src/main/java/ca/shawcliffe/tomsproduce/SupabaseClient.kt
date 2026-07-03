package ca.shawcliffe.tomsproduce

import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest

val supabase = createSupabaseClient(
    supabaseUrl = Config.SUPABASE_URL,
    supabaseKey = Config.SUPABASE_ANON_KEY,
) {
    install(Postgrest)
}
