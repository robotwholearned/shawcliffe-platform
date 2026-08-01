import Foundation

// Reads the current client's properties from the web backend. Mirrors
// VehiclesService's Bearer-token GET pattern against /api/seller/properties.
enum PropertiesService {
    struct Response: Decodable {
        let properties: [Property]
        let total: Int
        let page: Int
        let pageSize: Int
    }

    static func fetch(page: Int = 0) async throws -> Response {
        guard let token = try? await supabase.auth.session.accessToken else {
            throw BroadcastError.notAuthenticated
        }

        var components = URLComponents(
            url: Config.apiBaseURL.appendingPathComponent("api/seller/properties"),
            resolvingAgainstBaseURL: false
        )!
        components.queryItems = [URLQueryItem(name: "page", value: String(page))]

        var request = URLRequest(url: components.url!)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw BroadcastError.server("Couldn't load properties.")
        }
        return try JSONDecoder().decode(Response.self, from: data)
    }
}
