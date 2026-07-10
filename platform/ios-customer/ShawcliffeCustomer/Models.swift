import Foundation

enum FontTheme: String, Codable {
    case modernSans = "modern_sans"
    case farmhouse
    case classicSerif = "classic_serif"
    case minimal
    case rustic
}

enum DailyStatusValue: String, Codable {
    case open
    case closed
    case soldOut = "sold_out"
    case backTomorrow = "back_tomorrow"
    case weatherDelay = "weather_delay"
    case openingSoon = "opening_soon"

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

    var color: (r: Double, g: Double, b: Double) {
        switch self {
        case .open: return (0.13, 0.55, 0.13)
        case .closed, .soldOut: return (0.7, 0.15, 0.15)
        case .backTomorrow, .openingSoon: return (0.85, 0.55, 0.1)
        case .weatherDelay: return (0.3, 0.4, 0.6)
        }
    }
}

enum ProductStatus: String, Codable {
    case available
    case low
    case soldOut = "sold_out"
}

struct ClientBranding: Codable {
    let clientId: String
    var primaryColor: String
    var secondaryColor: String?
    var accentColor: String?
    var fontTheme: FontTheme
    var logoUrl: String?
    var appName: String?
    var tagline: String?
    var heroPhotoUrls: [String]

    enum CodingKeys: String, CodingKey {
        case clientId = "client_id"
        case primaryColor = "primary_color"
        case secondaryColor = "secondary_color"
        case accentColor = "accent_color"
        case fontTheme = "font_theme"
        case logoUrl = "logo_url"
        case appName = "app_name"
        case tagline
        case heroPhotoUrls = "hero_photo_urls"
    }
}

struct Location: Codable, Identifiable {
    let clientId: String
    let id: String
    let displayName: String
    let address: String?
    let mapUrl: String?
    let parkingNotes: String?

    enum CodingKeys: String, CodingKey {
        case clientId = "client_id"
        case id
        case displayName = "display_name"
        case address
        case mapUrl = "map_url"
        case parkingNotes = "parking_notes"
    }
}

struct DailyStatus: Codable {
    let clientId: String
    let id: String
    let date: String
    var status: DailyStatusValue
    var hoursOpen: String?
    var hoursClose: String?
    var locationId: String?
    var customMessage: String?

    enum CodingKeys: String, CodingKey {
        case clientId = "client_id"
        case id
        case date
        case status
        case hoursOpen = "hours_open"
        case hoursClose = "hours_close"
        case locationId = "location_id"
        case customMessage = "custom_message"
    }
}

struct Product: Codable, Identifiable, Equatable {
    let clientId: String
    let id: String
    var name: String
    var price: Double?
    var status: ProductStatus
    var sortOrder: Int

    enum CodingKeys: String, CodingKey {
        case clientId = "client_id"
        case id
        case name
        case price
        case status
        case sortOrder = "sort_order"
    }
}

struct SignupRequest: Encodable {
    let client_id: String
    let name: String
    let phone: String?
    let email: String?
    let sms_consent: Bool
    let email_consent: Bool
    let signup_source: String
}

struct PreorderItemRequest: Encodable {
    let product_id: String
    let quantity: Int
}

struct PreorderRequest: Encodable {
    let client_id: String
    let customer_name: String
    let customer_phone: String?
    let customer_email: String?
    let items: [PreorderItemRequest]
    let notes: String?
}

struct InquiryRequest: Encodable {
    let client_id: String
    let name: String
    let phone: String?
    let email: String?
    let sms_consent: Bool
    let email_consent: Bool
    let signup_source: String
    let service_category: String?
    let job_location: String?
    let urgency: String?
    let description: String?
    let preferred_contact_method: String?
    let photo_urls: [String]
    let vehicle_make: String?
    let vehicle_model: String?
    let vehicle_year: Int?
    let vehicle_vin: String?
    let vehicle_plate: String?
    let vehicle_mileage: Int?
    let vehicle_notes: String?
    let property_address: String?
    let property_gate_code: String?
    let property_parking_instructions: String?
    let property_pets_on_site: String?
    let property_access_notes: String?
    let property_preferred_service_day: String?
    let property_lawn_size: String?
    let property_snow_removal_areas: String?
    let property_cleaning_instructions: String?
    let property_safety_notes: String?
}

struct BookingRequest: Encodable {
    let client_id: String
    let name: String
    let phone: String?
    let email: String?
    let sms_consent: Bool
    let email_consent: Bool
    let signup_source: String
    let service: String?
    let requested_date: String?
    let requested_time: String?
    let notes: String?
    let pet_name: String?
    let pet_breed: String?
    let pet_size: String?
    let pet_age: String?
    let pet_allergies: String?
    let pet_behavior_notes: String?
    let pet_grooming_preferences: String?
    let pet_vaccination_info: String?
    let pet_emergency_contact: String?
    let pet_care_instructions: String?
}

struct DocumentChecklistItem: Codable, Identifiable {
    let clientId: String
    let id: String
    let title: String
    let description: String?
    let required: Bool
    let needsUpload: Bool
    let sortOrder: Int

    enum CodingKeys: String, CodingKey {
        case clientId = "client_id"
        case id
        case title
        case description
        case required
        case needsUpload = "needs_upload"
        case sortOrder = "sort_order"
    }
}

struct APIErrorBody: Decodable {
    let error: String?
    let product: String?
}

struct EnabledComponentsResponse: Decodable {
    let enabled_components: [String]
}

struct PushRegisterRequest: Encodable {
    let client_id: String
    let customer_id: String
    let token: String
    let platform = "ios"
    // Every build so far is a Simulator/dev build under Shawcliffe's single
    // Apple Developer account (no TestFlight/App Store submission yet) — the
    // real distinguishing signal is the app's aps-environment entitlement,
    // not this hardcoded value. Revisit once Fastlane/TestFlight exist.
    let environment = "sandbox"
}

struct PushRegisterResponse: Decodable {
    let ok: Bool
}
