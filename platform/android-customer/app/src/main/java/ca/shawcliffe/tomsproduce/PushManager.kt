package ca.shawcliffe.tomsproduce

import android.content.Context
import android.content.SharedPreferences
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

/**
 * Customers don't authenticate (see platform/ARCHITECTURE-MAP.md), so there's
 * no session to hang a push token off of. Instead we persist the customer_id
 * returned by POST /api/signup locally, and only register the device token
 * with the server once both pieces exist. Mirrors ios-customer/PushManager.swift,
 * but over FCM instead of direct APNs.
 *
 * KNOWN GAP: no Firebase project/google-services.json exists yet (see
 * README), so FirebaseMessaging.getInstance() throws until one is added —
 * every call here is best-effort and silently no-ops on failure, same as the
 * iOS app's "retries next launch" behaviour. The server's
 * POST /api/push/register and /api/broadcast/push also only handle
 * customers.apns_token today; sending this as an FCM token there is a no-op
 * until the server is updated to store/send via customers.fcm_token too.
 */
object PushManager {
    private const val PREFS_NAME = "shawcliffe.push"
    private const val CUSTOMER_ID_KEY = "customerId"

    private lateinit var prefs: SharedPreferences
    private var deviceToken: String? = null
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    fun init(context: Context) {
        prefs = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    var customerId: String?
        get() = prefs.getString(CUSTOMER_ID_KEY, null)
        set(value) = prefs.edit().putString(CUSTOMER_ID_KEY, value).apply()

    /** Call on every app launch — refreshes the token if Firebase is configured; no-ops otherwise. */
    suspend fun requestPermissionAndRegister() {
        try {
            val token = FirebaseMessaging.getInstance().token.await()
            didReceiveDeviceToken(token)
        } catch (e: Exception) {
            // Firebase not configured, or user hasn't granted POST_NOTIFICATIONS yet.
        }
    }

    fun didReceiveDeviceToken(token: String) {
        deviceToken = token
        registerIfPossible()
    }

    /** Call after a successful signup, since that's the only moment the app learns its own customer_id. */
    fun didCompleteSignup(customerId: String) {
        this.customerId = customerId
        registerIfPossible()
    }

    private fun registerIfPossible() {
        val token = deviceToken ?: return
        val id = customerId ?: return
        scope.launch {
            try {
                APIClient.post<PushRegisterRequest, PushRegisterResponse>(
                    "api/push/register",
                    PushRegisterRequest(Config.CLIENT_ID, id, token),
                )
            } catch (e: Exception) {
                // Best-effort — deviceToken/customerId persist, so this retries next launch.
            }
        }
    }
}
