import SwiftUI

@main
struct ShawcliffeSellerApp: App {
    @StateObject private var auth = AuthViewModel()

    var body: some Scene {
        WindowGroup {
            Group {
                if auth.isAuthenticated, let clientId = auth.clientId {
                    DashboardView(clientId: clientId)
                } else {
                    LoginView()
                }
            }
            .environmentObject(auth)
        }
    }
}
