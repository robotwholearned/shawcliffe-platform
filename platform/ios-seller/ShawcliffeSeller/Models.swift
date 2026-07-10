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

    var systemImage: String {
        switch self {
        case .open: return "checkmark.circle.fill"
        case .closed, .soldOut: return "xmark.circle.fill"
        case .backTomorrow: return "arrow.counterclockwise"
        case .weatherDelay: return "cloud.rain.fill"
        case .openingSoon: return "clock.fill"
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
        case .available: return "Available"
        case .low: return "Low"
        case .soldOut: return "Out"
        }
    }

    var systemImage: String {
        switch self {
        case .available: return "checkmark"
        case .low: return "exclamationmark.triangle"
        case .soldOut: return "xmark.circle"
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
    var test: Bool = false
}

struct EmailBroadcastRequest: Encodable {
    let subject: String
    let message: String
    var test: Bool = false
}

struct BroadcastResponse: Decodable {
    let sent: Int
    let failed: Int
    let errors: [String]?
}

struct TestSendResult {
    let channel: String
    let ok: Bool
    let message: String
}

struct NotificationLogEntry: Codable, Identifiable {
    let id: String
    let channel: String
    let messagePreview: String?
    let status: String
    let sentAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case channel
        case messagePreview = "message_preview"
        case status
        case sentAt = "sent_at"
    }
}

// Optional beyond id/name/phone/email because DashboardViewModel's preorder
// lookup selects only those four columns — a non-optional field would throw
// a decoding error on that narrower response.
struct Customer: Codable, Identifiable {
    let id: String
    let name: String
    let phone: String?
    let email: String?
    let smsConsent: Bool?
    let emailConsent: Bool?
    let pushConsent: Bool?
    let whatsappConsent: Bool?
    let signupSource: String?
    let productInterests: [String]?
    let consentTimestamp: String?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case phone
        case email
        case smsConsent = "sms_consent"
        case emailConsent = "email_consent"
        case pushConsent = "push_consent"
        case whatsappConsent = "whatsapp_consent"
        case signupSource = "signup_source"
        case productInterests = "product_interests"
        case consentTimestamp = "consent_timestamp"
    }
}

struct InquiryCustomer: Codable {
    let name: String
    let phone: String?
    let email: String?
}

struct InquiryVehicle: Codable {
    let make: String?
    let model: String?
    let year: Int?
    let vin: String?
    let plate: String?
    let mileage: Int?
}

struct Inquiry: Codable, Identifiable {
    let id: String
    let serviceCategory: String?
    let jobLocation: String?
    let urgency: String?
    let description: String?
    let photoUrls: [String]
    let preferredContactMethod: String?
    let status: String
    let createdAt: String
    let customer: InquiryCustomer?
    let vehicle: InquiryVehicle?

    enum CodingKeys: String, CodingKey {
        case id
        case serviceCategory = "service_category"
        case jobLocation = "job_location"
        case urgency
        case description
        case photoUrls = "photo_urls"
        case preferredContactMethod = "preferred_contact_method"
        case status
        case createdAt = "created_at"
        case customer
        case vehicle
    }
}

struct BookingCustomer: Codable {
    let name: String
    let phone: String?
    let email: String?
}

struct Booking: Codable, Identifiable {
    let id: String
    let service: String?
    let requestedDate: String?
    let requestedTime: String?
    let notes: String?
    let status: String
    let createdAt: String
    let customer: BookingCustomer?

    enum CodingKeys: String, CodingKey {
        case id
        case service
        case requestedDate = "requested_date"
        case requestedTime = "requested_time"
        case notes
        case status
        case createdAt = "created_at"
        case customer
    }
}

struct VehicleCustomer: Codable {
    let name: String
    let phone: String?
    let email: String?
}

struct Vehicle: Codable, Identifiable {
    let id: String
    let make: String?
    let model: String?
    let year: Int?
    let vin: String?
    let plate: String?
    let mileage: Int?
    let notes: String?
    let createdAt: String
    let customer: VehicleCustomer?

    enum CodingKeys: String, CodingKey {
        case id, make, model, year, vin, plate, mileage, notes
        case createdAt = "created_at"
        case customer
    }
}

struct DocumentSubmissionCustomer: Codable {
    let name: String
    let phone: String?
    let email: String?
}

struct DocumentSubmissionChecklistItem: Codable {
    let title: String
}

struct DocumentSubmission: Codable, Identifiable {
    let id: String
    let fileUrl: String
    let submittedAt: String
    let customer: DocumentSubmissionCustomer?
    let checklistItem: DocumentSubmissionChecklistItem?

    enum CodingKeys: String, CodingKey {
        case id
        case fileUrl = "file_url"
        case submittedAt = "submitted_at"
        case customer
        case checklistItem = "checklist_item"
    }
}
