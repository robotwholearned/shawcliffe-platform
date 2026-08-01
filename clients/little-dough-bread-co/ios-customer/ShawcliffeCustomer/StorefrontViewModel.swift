import Foundation

@MainActor
final class StorefrontViewModel: ObservableObject {
    @Published var branding: ClientBranding?
    @Published var status: DailyStatus?
    @Published var location: Location?
    @Published var products: [Product] = []
    @Published var enabledComponents: [String] = []
    @Published var isLoading = true
    @Published var errorMessage: String?

    private let clientId = Config.clientId
    private var pollTask: Task<Void, Never>?
    private let today: String = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = .current
        return formatter.string(from: Date())
    }()

    func start() async {
        await loadAll()
        isLoading = false
        startPolling()
    }

    func stop() {
        pollTask?.cancel()
        pollTask = nil
    }

    private func startPolling() {
        pollTask?.cancel()
        pollTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 5_000_000_000)
                if Task.isCancelled { break }
                await loadStatus()
                await loadProducts()
            }
        }
    }

    private func loadAll() async {
        async let brandingTask: Void = loadBranding()
        async let statusTask: Void = loadStatus()
        async let productsTask: Void = loadProducts()
        async let componentsTask: Void = loadComponents()
        _ = await (brandingTask, statusTask, productsTask, componentsTask)
    }

    private func loadComponents() async {
        do {
            let url = Config.apiBaseURL.appendingPathComponent("api/client/\(clientId)/components")
            let (data, _) = try await URLSession.shared.data(from: url)
            enabledComponents = try JSONDecoder().decode(EnabledComponentsResponse.self, from: data).enabled_components
        } catch {
            // Fail closed — status tracker just stays hidden.
            enabledComponents = []
            print("Failed to load enabled components: \(error)")
        }
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
            errorMessage = "Couldn't load storefront."
        }
    }

    private func loadStatus() async {
        do {
            let rows: [DailyStatus] = try await supabase
                .from("daily_status")
                .select()
                .eq("client_id", value: clientId)
                .eq("date", value: today)
                .execute()
                .value
            status = rows.first
            if let locationId = status?.locationId {
                await loadLocation(id: locationId)
            } else {
                location = nil
            }
        } catch {
            // Keep showing last-known status rather than clobbering it with an error.
        }
    }

    private func loadLocation(id: String) async {
        do {
            let rows: [Location] = try await supabase
                .from("locations")
                .select()
                .eq("client_id", value: clientId)
                .eq("id", value: id)
                .execute()
                .value
            location = rows.first
        } catch {
            // Non-critical — leave last-known location in place.
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
            // Non-critical — leave last-known products in place.
        }
    }
}
