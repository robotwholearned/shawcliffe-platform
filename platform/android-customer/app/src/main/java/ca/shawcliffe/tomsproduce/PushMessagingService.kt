package ca.shawcliffe.tomsproduce

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/** Bridges FCM's token-refresh callback into PushManager. Inert until a real Firebase project is configured (see README). */
class PushMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        PushManager.didReceiveDeviceToken(token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        // Foreground display of data/notification payloads isn't implemented yet —
        // out of scope until push send is verified end-to-end (see README).
    }
}
