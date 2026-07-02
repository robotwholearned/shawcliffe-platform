import SwiftUI

@main
struct ShawcliffeCustomerApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    var body: some Scene {
        WindowGroup {
            NavigationStack {
                StorefrontView()
            }
            .task {
                // Re-registers silently if already authorized; only prompts
                // the very first time. No-op if the user previously declined.
                await PushManager.shared.requestPermissionAndRegister()
            }
        }
    }
}
