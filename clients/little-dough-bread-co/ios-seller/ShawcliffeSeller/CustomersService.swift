import Foundation

// Reads the current client's customers from the web backend (paginated,
// searchable). Mirrors ComponentsService's auth pattern — GET with a Bearer
// token — against /api/seller/customers, which is gated server-side on the
// customer_database component.
enum CustomersService {
    struct Response: Decodable {
        let customers: [Customer]
        let total: Int
        let page: Int
        let pageSize: Int
    }

    static func fetch(query: String? = nil, page: Int = 0) async throws -> Response {
        guard let token = try? await supabase.auth.session.accessToken else {
            throw BroadcastError.notAuthenticated
        }

        var components = URLComponents(
            url: Config.apiBaseURL.appendingPathComponent("api/seller/customers"),
            resolvingAgainstBaseURL: false
        )!
        var queryItems = [URLQueryItem(name: "page", value: String(page))]
        if let query, !query.isEmpty {
            queryItems.append(URLQueryItem(name: "q", value: query))
        }
        components.queryItems = queryItems

        var request = URLRequest(url: components.url!)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw BroadcastError.server("Couldn't load customers.")
        }
        return try JSONDecoder().decode(Response.self, from: data)
    }

    private struct ErrorBody: Decodable {
        let error: String?
    }

    static func requestReview(customerId: String) async throws {
        guard let token = try? await supabase.auth.session.accessToken else {
            throw BroadcastError.notAuthenticated
        }

        var request = URLRequest(
            url: Config.apiBaseURL.appendingPathComponent("api/seller/customers/\(customerId)/request-review")
        )
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw BroadcastError.server("No response from server.")
        }
        guard (200..<300).contains(http.statusCode) else {
            let message = (try? JSONDecoder().decode(ErrorBody.self, from: data))?.error
                ?? "Couldn't send review request (\(http.statusCode))."
            throw BroadcastError.server(message)
        }
    }
}
