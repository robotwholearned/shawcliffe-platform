import Foundation

@MainActor
final class NotificationLogViewModel: ObservableObject {
    @Published var entries: [NotificationLogEntry] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let clientId: String

    init(clientId: String) {
        self.clientId = clientId
    }

    func load() async {
        isLoading = true
        errorMessage = nil
        do {
            entries = try await supabase
                .from("notification_log")
                .select()
                .eq("client_id", value: clientId)
                .order("sent_at", ascending: false)
                .limit(50)
                .execute()
                .value
        } catch {
            errorMessage = "Couldn't load notification history."
        }
        isLoading = false
    }
}
