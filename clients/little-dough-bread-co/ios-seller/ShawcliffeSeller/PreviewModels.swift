import Foundation

/// Read-only shapes for the "Preview" tab, which shows the seller what their
/// customers see. Mirrors ios-customer's storefront models; kept separate
/// from the seller's own `DailyStatus` (which only carries the fields the
/// status toggle writes) since this needs the fuller display-oriented column set.
struct ClientBranding: Codable {
    let clientId: String
    var primaryColor: String?
    var logoUrl: String?
    var appName: String?
    var tagline: String?

    enum CodingKeys: String, CodingKey {
        case clientId = "client_id"
        case primaryColor = "primary_color"
        case logoUrl = "logo_url"
        case appName = "app_name"
        case tagline
    }
}

struct StorefrontLocation: Codable, Identifiable {
    let clientId: String
    let id: String
    let displayName: String
    let address: String?
    let parkingNotes: String?

    enum CodingKeys: String, CodingKey {
        case clientId = "client_id"
        case id
        case displayName = "display_name"
        case address
        case parkingNotes = "parking_notes"
    }
}

struct StorefrontStatus: Codable {
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
