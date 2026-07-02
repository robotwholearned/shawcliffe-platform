import Foundation

enum APIError: LocalizedError {
    case server(String)
    case reservationFull(String)

    var errorDescription: String? {
        switch self {
        case .server(let message): return message
        case .reservationFull(let product): return "Sorry, \(product) is fully reserved. Try a smaller quantity."
        }
    }
}

enum APIClient {
    static func post<Body: Encodable, Response: Decodable>(
        path: String,
        body: Body,
        as type: Response.Type
    ) async throws -> Response {
        var request = URLRequest(url: Config.apiBaseURL.appendingPathComponent(path))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError.server("No response from server.")
        }

        guard (200..<300).contains(http.statusCode) else {
            let body = try? JSONDecoder().decode(APIErrorBody.self, from: data)
            if http.statusCode == 409 {
                throw APIError.reservationFull(body?.product ?? "that item")
            }
            throw APIError.server(body?.error ?? "Something went wrong. Please try again.")
        }

        return try JSONDecoder().decode(Response.self, from: data)
    }
}

struct SignupResponse: Decodable {
    let id: String
}

struct PreorderResponse: Decodable {
    let preorder_id: String
}
