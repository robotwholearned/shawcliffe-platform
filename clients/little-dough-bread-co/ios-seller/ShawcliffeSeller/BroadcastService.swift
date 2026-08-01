import Foundation

enum BroadcastError: LocalizedError {
    case notAuthenticated
    case server(String)

    var errorDescription: String? {
        switch self {
        case .notAuthenticated: return "You're not signed in."
        case .server(let message): return message
        }
    }
}

private struct BroadcastErrorBody: Decodable {
    let error: String?
}

/// Calls the Next.js `/api/broadcast/*` routes on the deployed web backend.
/// Those routes hold the Twilio/Resend secrets, so the app never talks to
/// those providers directly — it authenticates with a Bearer access token
/// instead of the cookie session the web app uses (see getAuthedUser in
/// platform/web/src/lib/supabase/server.ts).
enum BroadcastService {
    static func send<Body: Encodable>(path: String, body: Body) async throws -> BroadcastResponse {
        guard let token = try? await supabase.auth.session.accessToken else {
            throw BroadcastError.notAuthenticated
        }

        var request = URLRequest(url: Config.apiBaseURL.appendingPathComponent(path))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw BroadcastError.server("No response from server.")
        }
        guard (200..<300).contains(http.statusCode) else {
            let message = (try? JSONDecoder().decode(BroadcastErrorBody.self, from: data))?.error
                ?? "Request failed (\(http.statusCode))."
            throw BroadcastError.server(message)
        }
        return try JSONDecoder().decode(BroadcastResponse.self, from: data)
    }
}
