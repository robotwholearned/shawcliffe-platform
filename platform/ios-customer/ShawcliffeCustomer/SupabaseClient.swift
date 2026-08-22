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
    // Read from the CLIENT_ID/CLIENT_SLUG Info.plist keys baked into the Xcode
    // project; Fastlane overrides them per client build (see ios-customer/fastlane/Fastfile).
    // In DEBUG, a scheme's environment variables (Edit Scheme → Run → Arguments)
    // override them, so you can pick a demo client and hit ▶ without a per-client
    // build. Release builds ignore the env and use the baked-in Info.plist values.
    // ponytail: demo-only mutable globals. `var` (not `let`) so the demo picker
    // can switch clients at runtime; production builds set them once at launch
    // from the baked-in Info.plist values and never touch them again.
    static var clientId = debugOverride("CLIENT_ID") ?? Bundle.main.requiredInfoValue(for: "CLIENT_ID")
    static var slug = debugOverride("CLIENT_SLUG") ?? Bundle.main.requiredInfoValue(for: "CLIENT_SLUG")

    // Demo mode shows an in-app picker of all demo businesses instead of a single
    // baked-in storefront. DEBUG env `DEMO_MODE` (truthy) or the Info.plist
    // DEMO_MODE key == "YES" (set via the $(DEMO_MODE) build setting, YES only in
    // the TestFlight demo archive). Off → unchanged single-client behaviour.
    static var isDemo: Bool = {
        if let env = debugOverride("DEMO_MODE"),
           ["1", "yes", "true"].contains(env.lowercased()) {
            return true
        }
        return (Bundle.main.object(forInfoDictionaryKey: "DEMO_MODE") as? String) == "YES"
    }()

    /// Demo picker taps this to switch the active client. Call on the main thread.
    // ponytail: mutates the globals above — fine, demo-only, single-user device.
    static func selectDemoClient(id: String, slug: String) {
        clientId = id
        self.slug = slug
    }

    private static func debugOverride(_ key: String) -> String? {
        #if DEBUG
        guard let value = ProcessInfo.processInfo.environment[key], !value.isEmpty else { return nil }
        return value
        #else
        return nil
        #endif
    }
}

private extension Bundle {
    func requiredInfoValue(for key: String) -> String {
        guard let value = object(forInfoDictionaryKey: key) as? String, !value.isEmpty else {
            fatalError("\(key) missing from Info.plist — set the CLIENT_* keys in the Xcode project's build settings")
        }
        return value
    }
}

let supabase = SupabaseClient(
    supabaseURL: Config.supabaseURL,
    supabaseKey: Config.supabaseAnonKey,
    // Opt into supabase-swift's fixed initial-session behaviour (PR #822) to
    // silence the deprecation warning on launch. This app is anon-only (no login),
    // so it has no bearing on behaviour — it just quiets the console notice.
    options: SupabaseClientOptions(
        auth: SupabaseClientOptions.AuthOptions(emitLocalSessionAsInitialSession: true)
    )
)
