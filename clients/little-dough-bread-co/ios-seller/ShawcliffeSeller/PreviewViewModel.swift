import Foundation

/// Read-only view of what the customer app / website storefront shows for
/// this seller's own client_id, so sellers can check their own storefront
/// without a separate device. Loads once per tab visit (see `load()`) rather
/// than polling like the real customer app — this is a spot-check, not a
/// live surface.
@MainActor
final class PreviewViewModel: ObservableObject {
    @Published var branding: ClientBranding?
    @Published var status: StorefrontStatus?
    @Published var location: StorefrontLocation?
    @Published var products: [Product] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let clientId: String
    private let today: String = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = .current
        return formatter.string(from: Date())
    }()

    init(clientId: String) {
        self.clientId = clientId
    }

    func load() async {
        isLoading = true
        errorMessage = nil
        async let brandingTask: Void = loadBranding()
        async let statusTask: Void = loadStatusAndLocation()
        async let productsTask: Void = loadProducts()
        _ = await (brandingTask, statusTask, productsTask)
        isLoading = false
    }

    private func loadBranding() async {
        do {
            let rows: [ClientBranding] = try await supabase
                .from("client_branding")
                .select()
                .eq("client_id", value: clientId)
                .execute()
                .value
            branding = rows.first
        } catch {
            errorMessage = "Couldn't load storefront preview."
        }
    }

    private func loadStatusAndLocation() async {
        do {
            let rows: [StorefrontStatus] = try await supabase
                .from("daily_status")
                .select()
                .eq("client_id", value: clientId)
                .eq("date", value: today)
                .execute()
                .value
            status = rows.first
            if let locationId = status?.locationId {
                let locations: [StorefrontLocation] = try await supabase
                    .from("locations")
                    .select()
                    .eq("client_id", value: clientId)
                    .eq("id", value: locationId)
                    .execute()
                    .value
                location = locations.first
            } else {
                location = nil
            }
        } catch {
            errorMessage = "Couldn't load today's status."
        }
    }

    private func loadProducts() async {
        do {
            let rows: [Product] = try await supabase
                .from("products")
                .select()
                .eq("client_id", value: clientId)
                .order("sort_order")
                .execute()
                .value
            products = rows
        } catch {
            errorMessage = "Couldn't load products."
        }
    }
}
