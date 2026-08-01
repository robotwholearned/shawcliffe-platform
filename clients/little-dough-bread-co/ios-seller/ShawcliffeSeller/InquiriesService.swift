import Foundation

// Reads/updates the current client's inquiries from the web backend. Mirrors
// CustomersService's Bearer-token GET pattern against /api/seller/inquiries,
// plus a PATCH for status updates (error handling mirrors BroadcastService).
enum InquiriesService {
    struct Response: Decodable {
        let inquiries: [Inquiry]
        let total: Int
        let page: Int
        let pageSize: Int
    }

    private struct StatusUpdate: Encodable {
        let status: String
    }

    private struct ErrorBody: Decodable {
        let error: String?
    }

    static func fetch(status: String? = nil, page: Int = 0) async throws -> Response {
        guard let token = try? await supabase.auth.session.accessToken else {
            throw BroadcastError.notAuthenticated
        }

        var components = URLComponents(
            url: Config.apiBaseURL.appendingPathComponent("api/seller/inquiries"),
            resolvingAgainstBaseURL: false
        )!
        var queryItems = [URLQueryItem(name: "page", value: String(page))]
        if let status, !status.isEmpty {
            queryItems.append(URLQueryItem(name: "status", value: status))
        }
        components.queryItems = queryItems

        var request = URLRequest(url: components.url!)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw BroadcastError.server("Couldn't load inquiries.")
        }
        return try JSONDecoder().decode(Response.self, from: data)
    }

    static func updateStatus(inquiryId: String, status: String) async throws {
        guard let token = try? await supabase.auth.session.accessToken else {
            throw BroadcastError.notAuthenticated
        }

        var request = URLRequest(
            url: Config.apiBaseURL.appendingPathComponent("api/seller/inquiries/\(inquiryId)")
        )
        request.httpMethod = "PATCH"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(StatusUpdate(status: status))

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw BroadcastError.server("No response from server.")
        }
        guard (200..<300).contains(http.statusCode) else {
            let message = (try? JSONDecoder().decode(ErrorBody.self, from: data))?.error
                ?? "Couldn't update inquiry (\(http.statusCode))."
            throw BroadcastError.server(message)
        }
    }
}
