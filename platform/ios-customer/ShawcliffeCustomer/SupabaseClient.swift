import Foundation
import Supabase

enum Config {
    // Same project the web app (platform/web/.env.local) points at.
    // Anon key is safe to embed client-side — RLS enforces access, not this key.
    static let supabaseURL = URL(string: "https://ixyhkfdtzdxeaumfedpt.supabase.co")!
    static let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4eWhrZmR0emR4ZWF1bWZlZHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyODI0ODQsImV4cCI6MjA5NTg1ODQ4NH0.oGcT9ga-cXpVci5puqumpYW6Bvil52wyYJw7YCl-c7k"

    // Backend for signup/preorder — those write to tables anon can't insert
    // into directly (customers/preorders are service_role/staff-only per RLS),
    // so they go through the same Next.js API routes the website form uses.
    static let apiBaseURL = URL(string: "https://shawcliffe-platform.onrender.com")!

    // Phase 1 model (see platform/ARCHITECTURE-MAP.md Decision 2): one app
    // build per client with its tenant baked in at compile time, rather than
    // a slug picker at runtime — `clients` is service_role_only in RLS, so
    // the app has no way to resolve a slug to a client_id on its own anyway.
    // Set via project.yml's CLIENT_ID/CLIENT_SLUG Info.plist keys, which
    // Fastlane overrides per client build (see ios-customer/fastlane/Fastfile).
    static let clientId = Bundle.main.requiredInfoValue(for: "CLIENT_ID")
    static let slug = Bundle.main.requiredInfoValue(for: "CLIENT_SLUG")
}

private extension Bundle {
    func requiredInfoValue(for key: String) -> String {
        guard let value = object(forInfoDictionaryKey: key) as? String, !value.isEmpty else {
            fatalError("\(key) missing from Info.plist — check project.yml's CLIENT_* variables were set before `xcodegen generate`")
        }
        return value
    }
}

let supabase = SupabaseClient(
    supabaseURL: Config.supabaseURL,
    supabaseKey: Config.supabaseAnonKey
)
