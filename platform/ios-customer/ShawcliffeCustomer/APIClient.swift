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

    static func uploadPhoto(path: String, clientId: String, fileData: Data, mimeType: String) async throws -> String {
        let boundary = UUID().uuidString
        var request = URLRequest(url: Config.apiBaseURL.appendingPathComponent(path))
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"client_id\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(clientId)\r\n".data(using: .utf8)!)
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"photo.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
        body.append(fileData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError.server("No response from server.")
        }
        guard (200..<300).contains(http.statusCode) else {
            let body = try? JSONDecoder().decode(APIErrorBody.self, from: data)
            throw APIError.server(body?.error ?? "Photo upload failed. Please try again.")
        }
        return try JSONDecoder().decode(PhotoUploadResponse.self, from: data).url
    }

    // General-purpose multipart submit (text fields + one file) — used by the
    // Document Checklist form, which needs more fields than uploadPhoto's
    // fixed client_id/file shape.
    static func submitMultipart<Response: Decodable>(
        path: String,
        fields: [String: String],
        fileFieldName: String,
        filename: String,
        fileData: Data,
        mimeType: String,
        as type: Response.Type
    ) async throws -> Response {
        let boundary = UUID().uuidString
        var request = URLRequest(url: Config.apiBaseURL.appendingPathComponent(path))
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        for (name, value) in fields {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(value)\r\n".data(using: .utf8)!)
        }
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"\(fileFieldName)\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
        body.append(fileData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError.server("No response from server.")
        }
        guard (200..<300).contains(http.statusCode) else {
            let errorBody = try? JSONDecoder().decode(APIErrorBody.self, from: data)
            throw APIError.server(errorBody?.error ?? "Upload failed. Please try again.")
        }
        return try JSONDecoder().decode(Response.self, from: data)
    }
}

struct PhotoUploadResponse: Decodable {
    let url: String
}

struct SignupResponse: Decodable {
    let id: String
}

struct PreorderResponse: Decodable {
    let preorder_id: String
}

struct InquiryResponse: Decodable {
    let inquiry_id: String
}

struct BookingResponse: Decodable {
    let booking_id: String
}

struct DocumentSubmissionResponse: Decodable {
    let submission_id: String
    let url: String
}
