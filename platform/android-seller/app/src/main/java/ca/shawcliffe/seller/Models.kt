package ca.shawcliffe.seller

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

enum class DailyStatusValue(val value: String, val label: String, val emoji: String) {
    OPEN("open", "Open", "✓"),
    CLOSED("closed", "Closed", "✕"),
    SOLD_OUT("sold_out", "Sold Out", "✕"),
    BACK_TOMORROW("back_tomorrow", "Back Tomorrow", "↺"),
    WEATHER_DELAY("weather_delay", "Weather Delay", "⛈"),
    OPENING_SOON("opening_soon", "Opening Soon", "⏱");

    companion object {
        fun fromValue(value: String): DailyStatusValue? = entries.find { it.value == value }
    }
}

enum class ProductStatus(val value: String, val label: String) {
    AVAILABLE("available", "✓"),
    LOW("low", "Low"),
    SOLD_OUT("sold_out", "Out");

    companion object {
        fun fromValue(value: String): ProductStatus = entries.find { it.value == value } ?: AVAILABLE
    }
}

@Serializable
data class DailyStatus(
    val id: String,
    @SerialName("client_id") val clientId: String,
    val date: String,
    val status: String,
    @SerialName("updated_at") val updatedAt: String? = null,
)

@Serializable
data class DailyStatusInsert(
    @SerialName("client_id") val clientId: String,
    val date: String,
    val status: String,
)

@Serializable
data class DailyStatusUpdate(
    val status: String,
    @SerialName("updated_at") val updatedAt: String,
)

@Serializable
data class Product(
    val id: String,
    @SerialName("client_id") val clientId: String,
    val name: String,
    val price: Double? = null,
    val status: String,
    @SerialName("sort_order") val sortOrder: Int,
)

@Serializable
data class ProductInsert(
    @SerialName("client_id") val clientId: String,
    val name: String,
    val price: Double?,
    val status: String,
    @SerialName("sort_order") val sortOrder: Int,
)

@Serializable
data class ProductStatusUpdate(val status: String)

@Serializable
data class Preorder(
    val id: String,
    @SerialName("client_id") val clientId: String,
    @SerialName("customer_id") val customerId: String,
    val status: String,
    val notes: String? = null,
    @SerialName("created_at") val createdAt: String,
    @SerialName("pickup_window_start") val pickupWindowStart: String? = null,
    @SerialName("pickup_window_end") val pickupWindowEnd: String? = null,
)

@Serializable
data class PreorderStatusUpdate(val status: String)

@Serializable
data class Customer(
    val id: String,
    val name: String,
    val phone: String? = null,
    val email: String? = null,
    // Below are only populated via CustomersService (GET /api/seller/customers);
    // the preorders join in DashboardViewModel selects just id/name/phone/email,
    // so these default for that call site.
    @SerialName("sms_consent") val smsConsent: Boolean = false,
    @SerialName("email_consent") val emailConsent: Boolean = false,
    @SerialName("push_consent") val pushConsent: Boolean = false,
    @SerialName("whatsapp_consent") val whatsappConsent: Boolean = false,
    @SerialName("signup_source") val signupSource: String? = null,
    @SerialName("product_interests") val productInterests: List<String> = emptyList(),
    @SerialName("consent_timestamp") val consentTimestamp: String? = null,
)

@Serializable
data class PreorderItem(
    @SerialName("preorder_id") val preorderId: String,
    @SerialName("product_id") val productId: String,
    val quantity: Int,
)

/**
 * Client-side composite of a preorder with its customer and line items,
 * assembled from three separate queries (see DashboardViewModel.loadPreorders).
 * Composite FKs on preorders/preorder_items make PostgREST's automatic embed
 * resolution unreliable, so we join in Kotlin instead — mirrors the iOS app.
 */
data class PreorderDetail(
    var preorder: Preorder,
    val customer: Customer?,
    val items: List<Pair<String, Int>>,
) {
    val id: String get() = preorder.id
}

@Serializable
data class SMSBroadcastRequest(val message: String, val test: Boolean = false)

@Serializable
data class EmailBroadcastRequest(val subject: String, val message: String, val test: Boolean = false)

@Serializable
data class BroadcastResponse(
    val sent: Int = 0,
    val failed: Int = 0,
    val errors: List<String>? = null,
)

data class TestSendResult(val channel: String, val ok: Boolean, val message: String)

@Serializable
data class NotificationLogEntry(
    val id: String,
    val channel: String,
    @SerialName("message_preview") val messagePreview: String? = null,
    val status: String,
    @SerialName("sent_at") val sentAt: String,
)
