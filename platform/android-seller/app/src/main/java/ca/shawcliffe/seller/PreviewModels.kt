package ca.shawcliffe.seller

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Read-only shapes for the "Preview" tab, which shows the seller what their
 * customers see. Mirrors ios-customer's storefront models; kept separate from
 * the seller's own [DailyStatus] (which only carries the fields the status
 * toggle writes) since this needs the fuller display-oriented column set.
 */
@Serializable
data class ClientBranding(
    @SerialName("client_id") val clientId: String,
    @SerialName("primary_color") val primaryColor: String? = null,
    @SerialName("logo_url") val logoUrl: String? = null,
    @SerialName("app_name") val appName: String? = null,
    val tagline: String? = null,
)

@Serializable
data class StorefrontLocation(
    @SerialName("client_id") val clientId: String,
    val id: String,
    @SerialName("display_name") val displayName: String,
    val address: String? = null,
    @SerialName("parking_notes") val parkingNotes: String? = null,
)

@Serializable
data class StorefrontStatus(
    @SerialName("client_id") val clientId: String,
    val id: String,
    val date: String,
    val status: String,
    @SerialName("hours_open") val hoursOpen: String? = null,
    @SerialName("hours_close") val hoursClose: String? = null,
    @SerialName("location_id") val locationId: String? = null,
    @SerialName("custom_message") val customMessage: String? = null,
)
