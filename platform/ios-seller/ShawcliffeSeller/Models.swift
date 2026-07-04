import Foundation

enum DailyStatusValue: String, Codable, CaseIterable, Identifiable {
    case open
    case closed
    case soldOut = "sold_out"
    case backTomorrow = "back_tomorrow"
    case weatherDelay = "weather_delay"
    case openingSoon = "opening_soon"

    var id: String { rawValue }

    var label: String {
        switch self {
        case .open: return "Open"
        case .closed: return "Closed"
        case .soldOut: return "Sold Out"
        case .backTomorrow: return "Back Tomorrow"
        case .weatherDelay: return "Weather Delay"
        case .openingSoon: return "Opening Soon"
        }
    }

    var emoji: String {
        switch self {
        case .open: return "✓"
        case .closed, .soldOut: return "✕"
        case .backTomorrow: return "↺"
        case .weatherDelay: return "⛈"
        case .openingSoon: return "⏱"
        }
    }

    /// Matches ios-customer's status badge colors — used by the seller app's
    /// customer-preview tab, which shows the same badge customers see.
    var color: (r: Double, g: Double, b: Double) {
        switch self {
        case .open: return (0.13, 0.55, 0.13)
        case .closed, .soldOut: return (0.7, 0.15, 0.15)
        case .backTomorrow, .openingSoon: return (0.85, 0.55, 0.1)
        case .weatherDelay: return (0.3, 0.4, 0.6)
        }
    }
}

enum ProductStatus: String, Codable, CaseIterable {
    case available
    case low
    case soldOut = "sold_out"

    var label: String {
        switch self {
        case .available: return "✓"
        case .low: return "Low"
        case .soldOut: return "Out"
        }
    }

    /// Customer-facing wording — deliberately not `label`, which is the
    /// compact glyph the seller's own action buttons use.
    var customerLabel: String {
        switch self {
        case .available: return "Available"
        case .low: return "Low"
        case .soldOut: return "Sold Out"
        }
    }
}

struct DailyStatus: Codable, Identifiable {
    let id: String
    let clientId: String
    let date: String
    var status: DailyStatusValue
    var updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case clientId = "client_id"
        case date
        case status
        case updatedAt = "updated_at"
    }
}

struct DailyStatusInsert: Encodable {
    let client_id: String
    let date: String
    let status: String
}

struct DailyStatusUpdate: Encodable {
    let status: String
    let updated_at: String
}

struct Product: Codable, Identifiable, Equatable {
    let id: String
    let clientId: String
    var name: String
    var price: Double?
    var status: ProductStatus
    var sortOrder: Int

    enum CodingKeys: String, CodingKey {
        case id
        case clientId = "client_id"
        case name
        case price
        case status
        case sortOrder = "sort_order"
    }
}

struct ProductInsert: Encodable {
    let client_id: String
    let name: String
    let price: Double?
    let status: String
    let sort_order: Int
}

struct ProductStatusUpdate: Encodable {
    let status: String
}

struct Preorder: Codable, Identifiable {
    let id: String
    let clientId: String
    let customerId: String
    var status: String
    let notes: String?
    let createdAt: String
    let pickupWindowStart: String?
    let pickupWindowEnd: String?

    enum CodingKeys: String, CodingKey {
        case id
        case clientId = "client_id"
        case customerId = "customer_id"
        case status
        case notes
        case createdAt = "created_at"
        case pickupWindowStart = "pickup_window_start"
        case pickupWindowEnd = "pickup_window_end"
    }
}

struct PreorderStatusUpdate: Encodable {
    let status: String
}

struct Customer: Codable, Identifiable {
    let id: String
    let name: String
    let phone: String?
    let email: String?
}

struct PreorderItem: Codable {
    let preorderId: String
    let productId: String
    let quantity: Int

    enum CodingKeys: String, CodingKey {
        case preorderId = "preorder_id"
        case productId = "product_id"
        case quantity
    }
}

/// Client-side composite of a preorder with its customer and line items,
/// assembled from three separate queries (see DashboardViewModel.loadPreorders).
/// Composite FKs on `preorders`/`preorder_items` make PostgREST's automatic
/// embed resolution unreliable, so we join in Swift instead.
struct PreorderDetail: Identifiable {
    var preorder: Preorder
    let customer: Customer?
    let items: [(productName: String, quantity: Int)]

    var id: String { preorder.id }
}

struct SMSBroadcastRequest: Encodable {
    let message: String
}

struct EmailBroadcastRequest: Encodable {
    let subject: String
    let message: String
}

struct BroadcastResponse: Decodable {
    let sent: Int
    let failed: Int
    let errors: [String]?
}
