import Foundation
import Supabase

enum Config {
    // Same project the web app (platform/web/.env.local) points at.
    // Anon key is safe to embed client-side — RLS enforces access, not this key.
    static let supabaseURL = URL(string: "https://ixyhkfdtzdxeaumfedpt.supabase.co")!
    static let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4eWhrZmR0emR4ZWF1bWZlZHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyODI0ODQsImV4cCI6MjA5NTg1ODQ4NH0.oGcT9ga-cXpVci5puqumpYW6Bvil52wyYJw7YCl-c7k"

    // Backend for routes that need server-side secrets (Twilio, Resend).
    // Same deployment the web app calls its own /api routes on.
    static let apiBaseURL = URL(string: "https://shawcliffe-platform.onrender.com")!
}

let supabase = SupabaseClient(
    supabaseURL: Config.supabaseURL,
    supabaseKey: Config.supabaseAnonKey
)
