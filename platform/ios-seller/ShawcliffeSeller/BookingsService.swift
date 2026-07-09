import Foundation

// Reads/updates the current client's bookings from the web backend. Mirrors
// InquiriesService's Bearer-token GET pattern against /api/seller/bookings,
// plus a PATCH for status updates.
enum BookingsService {
    struct Response: Decodable {
        let bookings: [Booking]
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
            url: Config.apiBaseURL.appendingPathComponent("api/seller/bookings"),
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
            throw BroadcastError.server("Couldn't load bookings.")
        }
        return try JSONDecoder().decode(Response.self, from: data)
    }

    static func updateStatus(bookingId: String, status: String) async throws {
        guard let token = try? await supabase.auth.session.accessToken else {
            throw BroadcastError.notAuthenticated
        }

        var request = URLRequest(
            url: Config.apiBaseURL.appendingPathComponent("api/seller/bookings/\(bookingId)")
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
                ?? "Couldn't update booking (\(http.statusCode))."
            throw BroadcastError.server(message)
        }
    }
}
