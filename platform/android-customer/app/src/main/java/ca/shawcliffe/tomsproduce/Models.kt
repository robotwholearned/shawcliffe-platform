package ca.shawcliffe.tomsproduce

import androidx.compose.ui.graphics.Color
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

enum class DailyStatusValue(val value: String, val label: String, val color: Color) {
    OPEN("open", "Open", Color(0xFF218C21)),
    CLOSED("closed", "Closed", Color(0xFFB32626)),
    SOLD_OUT("sold_out", "Sold Out", Color(0xFFB32626)),
    BACK_TOMORROW("back_tomorrow", "Back Tomorrow", Color(0xFFD98C1A)),
    WEATHER_DELAY("weather_delay", "Weather Delay", Color(0xFF4D6699)),
    OPENING_SOON("opening_soon", "Opening Soon", Color(0xFFD98C1A));

    companion object {
        fun fromValue(value: String?): DailyStatusValue? = entries.find { it.value == value }
    }
}

enum class ProductStatus(val value: String, val label: String) {
    AVAILABLE("available", "Available"),
    LOW("low", "Low"),
    SOLD_OUT("sold_out", "Sold Out");

    companion object {
        fun fromValue(value: String): ProductStatus = entries.find { it.value == value } ?: AVAILABLE
    }
}

@Serializable
data class ClientBranding(
    @SerialName("client_id") val clientId: String,
    @SerialName("primary_color") val primaryColor: String,
    @SerialName("secondary_color") val secondaryColor: String? = null,
    @SerialName("accent_color") val accentColor: String? = null,
    @SerialName("font_theme") val fontTheme: String = "modern_sans",
    @SerialName("logo_url") val logoUrl: String? = null,
    @SerialName("app_name") val appName: String? = null,
    val tagline: String? = null,
    @SerialName("hero_photo_urls") val heroPhotoUrls: List<String> = emptyList(),
)

@Serializable
data class Location(
    @SerialName("client_id") val clientId: String,
    val id: String,
    @SerialName("display_name") val displayName: String,
    val address: String? = null,
    @SerialName("map_url") val mapUrl: String? = null,
    @SerialName("parking_notes") val parkingNotes: String? = null,
)

@Serializable
data class DailyStatus(
    @SerialName("client_id") val clientId: String,
    val id: String,
    val date: String,
    val status: String,
    @SerialName("hours_open") val hoursOpen: String? = null,
    @SerialName("hours_close") val hoursClose: String? = null,
    @SerialName("location_id") val locationId: String? = null,
    @SerialName("custom_message") val customMessage: String? = null,
)

@Serializable
data class Product(
    @SerialName("client_id") val clientId: String,
    val id: String,
    val name: String,
    val price: Double? = null,
    val status: String,
    @SerialName("sort_order") val sortOrder: Int,
)

@Serializable
data class SignupRequest(
    val client_id: String,
    val name: String,
    val phone: String?,
    val email: String?,
    val sms_consent: Boolean,
    val email_consent: Boolean,
    val signup_source: String,
)

@Serializable
data class PreorderItemRequest(val product_id: String, val quantity: Int)

@Serializable
data class PreorderRequest(
    val client_id: String,
    val customer_name: String,
    val customer_phone: String?,
    val customer_email: String?,
    val items: List<PreorderItemRequest>,
    val notes: String?,
)

@Serializable
data class ApiErrorBody(val error: String? = null, val product: String? = null)

@Serializable
data class PushRegisterRequest(
    val client_id: String,
    val customer_id: String,
    val token: String,
    val platform: String = "android",
)

@Serializable
data class PushRegisterResponse(val ok: Boolean = false)

@Serializable
data class SignupResponse(val id: String)

@Serializable
data class PreorderResponse(val preorder_id: String)

@Serializable
data class InquiryRequest(
    val client_id: String,
    val name: String,
    val phone: String?,
    val email: String?,
    val sms_consent: Boolean,
    val email_consent: Boolean,
    val signup_source: String = "app",
    val service_category: String?,
    val job_location: String?,
    val urgency: String?,
    val description: String?,
    val preferred_contact_method: String?,
    val photo_urls: List<String> = emptyList(),
)

@Serializable
data class InquiryResponse(val inquiry_id: String)

@Serializable
data class PhotoUploadResponse(val url: String)
