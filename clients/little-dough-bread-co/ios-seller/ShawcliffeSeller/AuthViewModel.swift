import Foundation
import Supabase

@MainActor
final class AuthViewModel: ObservableObject {
    @Published var isAuthenticated = false
    @Published var clientId: String?
    @Published var role: String?
    // Enabled component keys for this client (Tier 0 gating). Loaded once auth
    // succeeds; gate UI with enabledComponents.contains(ComponentKeys.someKey).
    @Published var enabledComponents: [String] = []
    @Published var errorMessage: String?
    @Published var isLoading = false
    @Published var isRestoringSession = true

    init() {
        Task { await restoreSession() }
    }

    func restoreSession() async {
        defer { isRestoringSession = false }
        do {
            let session = try await supabase.auth.session
            apply(session: session)
        } catch {
            isAuthenticated = false
        }
    }

    func signIn(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        do {
            let session = try await supabase.auth.signIn(email: email, password: password)
            apply(session: session)
        } catch {
            errorMessage = "Invalid email or password"
        }
        isLoading = false
    }

    func signOut() async {
        try? await supabase.auth.signOut()
        isAuthenticated = false
        clientId = nil
        role = nil
        enabledComponents = []
    }

    func loadEnabledComponents() async {
        do {
            enabledComponents = try await ComponentsService.fetch()
        } catch {
            print("Failed to load enabled components: \(error)")
            enabledComponents = []
        }
    }

    private func apply(session: Session) {
        let metadata = session.user.appMetadata
        if case let .string(cid)? = metadata["client_id"] {
            clientId = cid
        } else {
            clientId = nil
        }
        if case let .string(r)? = metadata["role"] {
            role = r
        } else {
            role = nil
        }

        if clientId == nil {
            errorMessage = "No client assigned to this account. Ask your Shawcliffe admin to set it up."
            isAuthenticated = false
        } else if role != "client_staff" {
            errorMessage = "This account is not a seller account."
            isAuthenticated = false
        } else {
            isAuthenticated = true
            Task { await loadEnabledComponents() }
        }
    }
}
