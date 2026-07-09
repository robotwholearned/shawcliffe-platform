import Foundation

// Reads the current client's enabled components from the web backend.
// clients.enabled_components is service_role_only, so the app can't SELECT it
// directly — GET /api/seller/components returns it, authed with the Bearer token
// (same pattern as BroadcastService). Loaded into AuthViewModel.enabledComponents.
enum ComponentsService {
    private struct Response: Decodable {
        let enabled_components: [String]
    }

    static func fetch() async throws -> [String] {
        guard let token = try? await supabase.auth.session.accessToken else {
            throw BroadcastError.notAuthenticated
        }

        var request = URLRequest(url: Config.apiBaseURL.appendingPathComponent("api/seller/components"))
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw BroadcastError.server("Couldn't load enabled components.")
        }
        return try JSONDecoder().decode(Response.self, from: data).enabled_components
    }
}
