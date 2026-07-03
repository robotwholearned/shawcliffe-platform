package ca.shawcliffe.seller

// Same Supabase project the web app (platform/web/.env.local) and the iOS
// seller app (platform/ios-seller/ShawcliffeSeller/SupabaseClient.swift)
// point at. Anon key is safe to embed client-side — RLS enforces access,
// not this key.
object Config {
    const val SUPABASE_URL = "https://ixyhkfdtzdxeaumfedpt.supabase.co"
    const val SUPABASE_ANON_KEY =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4eWhrZmR0emR4ZWF1bWZlZHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyODI0ODQsImV4cCI6MjA5NTg1ODQ4NH0.oGcT9ga-cXpVci5puqumpYW6Bvil52wyYJw7YCl-c7k"

    // Backend for routes that need server-side secrets (Twilio, Resend).
    // Same deployment the web app and iOS app call.
    const val API_BASE_URL = "https://shawcliffe-platform.onrender.com"
}
