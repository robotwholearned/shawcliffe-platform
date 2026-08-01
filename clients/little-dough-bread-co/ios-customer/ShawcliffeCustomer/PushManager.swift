import Foundation
import UIKit
import UserNotifications

/// Customers don't authenticate (see platform/ARCHITECTURE-MAP.md), so there's
/// no session to hang a push token off of. Instead we persist the customer_id
/// returned by POST /api/signup locally, and only register the device token
/// with the server once both pieces exist.
@MainActor
final class PushManager: ObservableObject {
    static let shared = PushManager()

    private let customerIdKey = "shawcliffe.customerId"
    private var deviceToken: String?

    private init() {}

    var customerId: String? {
        get { UserDefaults.standard.string(forKey: customerIdKey) }
        set { UserDefaults.standard.setValue(newValue, forKey: customerIdKey) }
    }

    /// Call on every app launch. Prompts only the first time; on subsequent
    /// launches this silently re-registers (refreshing the token) if the
    /// user already granted permission, and does nothing if they declined.
    func requestPermissionAndRegister() async {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()

        switch settings.authorizationStatus {
        case .authorized, .provisional:
            UIApplication.shared.registerForRemoteNotifications()
        case .notDetermined:
            do {
                let granted = try await center.requestAuthorization(options: [.alert, .sound, .badge])
                if granted {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            } catch {
                // User can still enable later from Settings.
            }
        case .denied, .ephemeral:
            break
        @unknown default:
            break
        }
    }

    func didReceiveDeviceToken(_ tokenData: Data) {
        deviceToken = tokenData.map { String(format: "%02x", $0) }.joined()
        Task { await registerIfPossible() }
    }

    /// Call after a successful signup, since that's the only moment the app
    /// learns its own customer_id.
    func didCompleteSignup(customerId: String) {
        self.customerId = customerId
        Task { await registerIfPossible() }
    }

    private func registerIfPossible() async {
        guard let deviceToken, let customerId else { return }
        do {
            _ = try await APIClient.post(
                path: "api/push/register",
                body: PushRegisterRequest(client_id: Config.clientId, customer_id: customerId, token: deviceToken),
                as: PushRegisterResponse.self
            )
        } catch {
            // Best-effort — deviceToken/customerId persist, so this retries next launch.
        }
    }
}
