package ca.shawcliffe.tomsproduce

// Same Supabase project the web app (platform/web/.env.local) and the iOS
// customer app point at. Anon key is safe to embed client-side — RLS
// enforces access, not this key.
object Config {
    const val SUPABASE_URL = "https://ixyhkfdtzdxeaumfedpt.supabase.co"
    const val SUPABASE_ANON_KEY =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4eWhrZmR0emR4ZWF1bWZlZHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyODI0ODQsImV4cCI6MjA5NTg1ODQ4NH0.oGcT9ga-cXpVci5puqumpYW6Bvil52wyYJw7YCl-c7k"

    // Backend for signup/preorder — those write to tables anon can't insert
    // into directly (customers/preorders are service_role/staff-only per RLS),
    // so they go through the same Next.js API routes the website form uses.
    const val API_BASE_URL = "https://shawcliffe-platform.onrender.com"

    // Phase 1 model (see platform/ARCHITECTURE-MAP.md Decision 2): one app
    // build per client with its tenant baked in at compile time, rather than
    // a slug picker at runtime — `clients` is service_role_only in RLS, so
    // the app has no way to resolve a slug to a client_id on its own anyway.
    const val CLIENT_ID = "c40569c6-1324-47a9-979f-6d076c4b67fc" // Tom's Produce
    const val SLUG = "toms-produce"
}
