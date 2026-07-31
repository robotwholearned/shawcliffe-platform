package ca.shawcliffe.tomsproduce.ui

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import ca.shawcliffe.tomsproduce.APIClient
import ca.shawcliffe.tomsproduce.ComponentKeys
import ca.shawcliffe.tomsproduce.Config
import ca.shawcliffe.tomsproduce.InquiryRequest
import ca.shawcliffe.tomsproduce.InquiryResponse
import ca.shawcliffe.tomsproduce.NhtsaMakesResponse
import ca.shawcliffe.tomsproduce.NhtsaModelsResponse
import ca.shawcliffe.tomsproduce.PlaceDetailsResponse
import ca.shawcliffe.tomsproduce.PlaceSuggestion
import ca.shawcliffe.tomsproduce.PlacesAutocompleteResponse
import ca.shawcliffe.tomsproduce.Phone
import ca.shawcliffe.tomsproduce.StorefrontViewModel
import coil.compose.AsyncImage
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.net.URLEncoder
import java.time.Instant
import java.time.Year
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

private val URGENCY_OPTIONS = listOf("asap" to "ASAP", "this_week" to "This week", "this_month" to "This month", "flexible" to "Flexible")
private val CONTACT_OPTIONS = listOf("phone" to "Phone", "email" to "Email", "sms" to "Text")
private const val MAX_PHOTOS = 5
private const val OTHER_OPTION = "Other"
private val VEHICLE_COLOR_OPTIONS = listOf("Black", "White", "Silver", "Gray", "Red", "Blue", "Green", "Brown", "Gold", "Beige", OTHER_OPTION)
private const val NHTSA_BASE_URL = "https://vpic.nhtsa.dot.gov/api/vehicles"

private fun encode(value: String): String = URLEncoder.encode(value, "UTF-8")

private fun resolveOrOther(selected: String, otherText: String): String? = when {
    selected.isEmpty() -> null
    selected == OTHER_OPTION -> otherText.ifBlank { null }
    else -> selected
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DropdownField(
    label: String,
    options: List<String>,
    selected: String,
    onSelected: (String) -> Unit,
    enabled: Boolean = true,
) {
    var expanded by remember { mutableStateOf(false) }
    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { if (enabled) expanded = it }) {
        OutlinedTextField(
            value = selected,
            onValueChange = {},
            readOnly = true,
            enabled = enabled,
            label = { Text(label) },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier.fillMaxWidth().menuAnchor(MenuAnchorType.PrimaryNotEditable),
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEach { option ->
                DropdownMenuItem(text = { Text(option) }, onClick = { onSelected(option); expanded = false })
            }
        }
    }
}

private data class PhotoUpload(
    val id: Long,
    val uri: Uri,
    val url: String? = null,
    val uploading: Boolean = true,
    val error: String? = null,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuoteScreen(
    onDone: () -> Unit,
    businessName: String = "Tom's Produce",
    storefrontViewModel: StorefrontViewModel = activityScopedViewModel(),
) {
    val showPhotoUpload = ComponentKeys.PHOTO_FILE_UPLOAD in storefrontViewModel.enabledComponents
    val showVehicleFields = ComponentKeys.VEHICLE_PROFILES in storefrontViewModel.enabledComponents
    val showPropertyFields = ComponentKeys.PROPERTY_PROFILES in storefrontViewModel.enabledComponents
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var serviceCategory by remember { mutableStateOf("") }
    var jobLocation by remember { mutableStateOf("") }
    var urgency by remember { mutableStateOf(URGENCY_OPTIONS[0].first) }
    var description by remember { mutableStateOf("") }
    var preferredContact by remember { mutableStateOf(CONTACT_OPTIONS[0].first) }
    var preferredDateMillis by remember { mutableStateOf<Long?>(null) }
    var showDatePicker by remember { mutableStateOf(false) }
    var smsConsent by remember { mutableStateOf(false) }
    var emailConsent by remember { mutableStateOf(false) }
    var vehicleMake by remember { mutableStateOf("") }
    var vehicleMakeOther by remember { mutableStateOf("") }
    var vehicleModel by remember { mutableStateOf("") }
    var vehicleModelOther by remember { mutableStateOf("") }
    var vehicleColor by remember { mutableStateOf("") }
    var vehicleColorOther by remember { mutableStateOf("") }
    var vehicleYear by remember { mutableStateOf("") }
    var vehiclePlate by remember { mutableStateOf("") }
    var vehicleVin by remember { mutableStateOf("") }
    var vehicleMileage by remember { mutableStateOf("") }
    var vehicleNotes by remember { mutableStateOf("") }
    val vehicleMakeOptions = remember { mutableStateListOf<String>() }
    val vehicleModelOptions = remember { mutableStateListOf<String>() }
    var propertyAddress by remember { mutableStateOf("") }
    var propertyPlaceId by remember { mutableStateOf<String?>(null) }
    var propertyAddressVerified by remember { mutableStateOf(false) }
    var lastSelectedAddress by remember { mutableStateOf<String?>(null) }
    val addressSuggestions = remember { mutableStateListOf<PlaceSuggestion>() }
    var propertyGateCode by remember { mutableStateOf("") }
    var propertyParkingInstructions by remember { mutableStateOf("") }
    var propertyPetsOnSite by remember { mutableStateOf("") }
    var propertyAccessNotes by remember { mutableStateOf("") }
    var propertyPreferredServiceDay by remember { mutableStateOf("") }
    var propertyLawnSize by remember { mutableStateOf("") }
    var propertySnowRemovalAreas by remember { mutableStateOf("") }
    var propertyCleaningInstructions by remember { mutableStateOf("") }
    var propertySafetyNotes by remember { mutableStateOf("") }
    var submitting by remember { mutableStateOf(false) }
    var done by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val photos = remember { mutableStateListOf<PhotoUpload>() }

    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickMultipleVisualMedia(maxItems = MAX_PHOTOS),
    ) { uris ->
        uris.take(MAX_PHOTOS - photos.size).forEach { uri ->
            val entry = PhotoUpload(id = System.nanoTime(), uri = uri)
            photos.add(entry)
            scope.launch {
                try {
                    val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
                        ?: throw IllegalStateException("Could not read photo")
                    val contentType = context.contentResolver.getType(uri) ?: "image/jpeg"
                    val url = APIClient.uploadPhoto(Config.CLIENT_ID, bytes, "photo_${entry.id}.jpg", contentType)
                    val i = photos.indexOfFirst { it.id == entry.id }
                    if (i >= 0) photos[i] = photos[i].copy(url = url, uploading = false)
                } catch (e: Exception) {
                    val i = photos.indexOfFirst { it.id == entry.id }
                    if (i >= 0) photos[i] = photos[i].copy(uploading = false, error = e.message ?: "Upload failed")
                }
            }
        }
    }

    if (showVehicleFields) {
        LaunchedEffect(Unit) {
            try {
                val response = APIClient.get<NhtsaMakesResponse>("$NHTSA_BASE_URL/GetAllMakes?format=json")
                vehicleMakeOptions.addAll(response.Results.map { it.makeName })
            } catch (e: Exception) {
                // ponytail: NHTSA lookup failed, fall through to "Other" free-text below
            }
            vehicleMakeOptions.add(OTHER_OPTION)
        }

        LaunchedEffect(vehicleMake) {
            vehicleModelOptions.clear()
            if (vehicleMake.isEmpty() || vehicleMake == OTHER_OPTION) return@LaunchedEffect
            try {
                val response = APIClient.get<NhtsaModelsResponse>(
                    "$NHTSA_BASE_URL/GetModelsForMake/${encode(vehicleMake)}?format=json",
                )
                vehicleModelOptions.addAll(response.Results.map { it.modelName }.distinct())
            } catch (e: Exception) {
                // ponytail: model lookup failed, fall through to "Other" free-text below
            }
            vehicleModelOptions.add(OTHER_OPTION)
        }
    }

    if (showPropertyFields) {
        LaunchedEffect(propertyAddress) {
            if (propertyAddress == lastSelectedAddress) return@LaunchedEffect
            propertyPlaceId = null
            propertyAddressVerified = false
            if (propertyAddress.trim().length < 3) {
                addressSuggestions.clear()
                return@LaunchedEffect
            }
            delay(400)
            try {
                val response = APIClient.get<PlacesAutocompleteResponse>(
                    "${Config.API_BASE_URL}/api/places/autocomplete?input=${encode(propertyAddress)}&client_id=${encode(Config.CLIENT_ID)}",
                )
                addressSuggestions.clear()
                addressSuggestions.addAll(response.suggestions)
            } catch (e: Exception) {
                addressSuggestions.clear()
            }
        }
    }

    if (done) {
        BrandedSuccess(
            title = "Request sent!",
            message = "$businessName will reach out about your quote soon.",
            onBack = onDone,
        )
        return
    }

    if (showDatePicker) {
        val datePickerState = rememberDatePickerState(initialSelectedDateMillis = preferredDateMillis)
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    preferredDateMillis = datePickerState.selectedDateMillis
                    showDatePicker = false
                }) { Text("OK") }
            },
            dismissButton = { TextButton(onClick = { showDatePicker = false }) { Text("Cancel") } },
        ) {
            DatePicker(state = datePickerState)
        }
    }

    BrandedScaffold(onBack = onDone) {
        CardSection(title = "Get a Quote", eyebrow = "Your details", index = 0) {
            OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Your name *") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(
                value = phone,
                onValueChange = { phone = it },
                label = { Text("Phone number") },
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Phone),
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Email address") },
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Email),
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = serviceCategory,
                onValueChange = { serviceCategory = it },
                label = { Text("What do you need? (optional)") },
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = jobLocation,
                onValueChange = { jobLocation = it },
                label = { Text("Job location (optional)") },
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text("Tell us more (optional)") },
                modifier = Modifier.fillMaxWidth(),
            )
        }

        CardSection(eyebrow = "Preferences", index = 1) {
            Text("How urgent is this?", style = MaterialTheme.typography.titleSmall)
            URGENCY_OPTIONS.forEach { (value, label) ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    RadioButton(selected = urgency == value, onClick = { urgency = value })
                    Text(label)
                }
            }

            Text("Preferred contact method", style = MaterialTheme.typography.titleSmall)
            CONTACT_OPTIONS.forEach { (value, label) ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    RadioButton(selected = preferredContact == value, onClick = { preferredContact = value })
                    Text(label)
                }
            }

            Text("Preferred date (optional)", style = MaterialTheme.typography.titleSmall)
            OutlinedButton(onClick = { showDatePicker = true }) {
                Text(preferredDateMillis?.let { formatDate(it) } ?: "Choose a date")
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = smsConsent, onCheckedChange = { smsConsent = it })
                Text("Yes, send me text message updates")
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = emailConsent, onCheckedChange = { emailConsent = it })
                Text("Yes, send me email updates")
            }
        }

        if (showPhotoUpload) {
            CardSection(eyebrow = "Photos (optional)", index = 2) {
                Button(
                    onClick = { photoPickerLauncher.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
                    enabled = photos.size < MAX_PHOTOS,
                ) { Text("Add Photos (${photos.size}/$MAX_PHOTOS)") }

                if (photos.isNotEmpty()) {
                    Row(
                        modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        photos.forEach { photo ->
                            Box(modifier = Modifier.size(72.dp)) {
                                AsyncImage(
                                    model = photo.uri,
                                    contentDescription = null,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.size(72.dp).clip(RoundedCornerShape(8.dp)),
                                )
                                if (photo.uploading) {
                                    CircularProgressIndicator(modifier = Modifier.size(24.dp).align(Alignment.Center))
                                }
                                IconButton(onClick = { photos.remove(photo) }, modifier = Modifier.align(Alignment.TopEnd).size(24.dp)) {
                                    Icon(Icons.Filled.Close, contentDescription = "Remove photo")
                                }
                            }
                        }
                    }
                    photos.mapNotNull { it.error }.forEach {
                        Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }

        if (showVehicleFields) {
            CardSection(eyebrow = "Vehicle (optional)", index = 3) {
                DropdownField(
                    label = "Make",
                    options = vehicleMakeOptions,
                    selected = vehicleMake,
                    onSelected = { vehicleMake = it; vehicleModel = ""; vehicleModelOther = "" },
                )
                if (vehicleMake == OTHER_OPTION) {
                    OutlinedTextField(value = vehicleMakeOther, onValueChange = { vehicleMakeOther = it }, label = { Text("Make (other)") }, modifier = Modifier.fillMaxWidth())
                }
                DropdownField(
                    label = "Model",
                    options = vehicleModelOptions,
                    selected = vehicleModel,
                    onSelected = { vehicleModel = it },
                    enabled = vehicleMake.isNotEmpty(),
                )
                if (vehicleModel == OTHER_OPTION) {
                    OutlinedTextField(value = vehicleModelOther, onValueChange = { vehicleModelOther = it }, label = { Text("Model (other)") }, modifier = Modifier.fillMaxWidth())
                }
                DropdownField(
                    label = "Color",
                    options = VEHICLE_COLOR_OPTIONS,
                    selected = vehicleColor,
                    onSelected = { vehicleColor = it },
                )
                if (vehicleColor == OTHER_OPTION) {
                    OutlinedTextField(value = vehicleColorOther, onValueChange = { vehicleColorOther = it }, label = { Text("Color (other)") }, modifier = Modifier.fillMaxWidth())
                }
                OutlinedTextField(
                    value = vehicleYear,
                    onValueChange = { vehicleYear = it },
                    label = { Text("Year") },
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(value = vehiclePlate, onValueChange = { vehiclePlate = it }, label = { Text("License plate") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = vehicleVin, onValueChange = { vehicleVin = it }, label = { Text("VIN") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(
                    value = vehicleMileage,
                    onValueChange = { vehicleMileage = it },
                    label = { Text("Mileage/hours") },
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(value = vehicleNotes, onValueChange = { vehicleNotes = it }, label = { Text("Issue notes") }, modifier = Modifier.fillMaxWidth())
            }
        }

        if (showPropertyFields) {
            CardSection(eyebrow = "Property (optional)", index = 4) {
                OutlinedTextField(
                    value = propertyAddress,
                    onValueChange = { propertyAddress = it },
                    label = { Text("Address") },
                    supportingText = { if (propertyAddressVerified) Text("Verified") },
                    modifier = Modifier.fillMaxWidth(),
                )
                if (addressSuggestions.isNotEmpty()) {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        addressSuggestions.forEach { suggestion ->
                            Text(
                                suggestion.description,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        scope.launch {
                                            val resolved = try {
                                                val details = APIClient.get<PlaceDetailsResponse>(
                                                    "${Config.API_BASE_URL}/api/places/details?place_id=${encode(suggestion.placeId)}&client_id=${encode(Config.CLIENT_ID)}",
                                                )
                                                (details.formattedAddress ?: suggestion.description) to (details.placeId ?: suggestion.placeId)
                                            } catch (e: Exception) {
                                                suggestion.description to null
                                            }
                                            lastSelectedAddress = resolved.first
                                            propertyAddress = resolved.first
                                            propertyPlaceId = resolved.second
                                            propertyAddressVerified = resolved.second != null
                                            addressSuggestions.clear()
                                        }
                                    }
                                    .padding(vertical = 8.dp),
                            )
                        }
                    }
                }
                OutlinedTextField(value = propertyGateCode, onValueChange = { propertyGateCode = it }, label = { Text("Gate code") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = propertyParkingInstructions, onValueChange = { propertyParkingInstructions = it }, label = { Text("Parking instructions") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = propertyPetsOnSite, onValueChange = { propertyPetsOnSite = it }, label = { Text("Pets on site") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = propertyAccessNotes, onValueChange = { propertyAccessNotes = it }, label = { Text("Access notes") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = propertyPreferredServiceDay, onValueChange = { propertyPreferredServiceDay = it }, label = { Text("Preferred service day") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = propertyLawnSize, onValueChange = { propertyLawnSize = it }, label = { Text("Lawn size") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = propertySnowRemovalAreas, onValueChange = { propertySnowRemovalAreas = it }, label = { Text("Snow removal areas") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = propertyCleaningInstructions, onValueChange = { propertyCleaningInstructions = it }, label = { Text("Cleaning instructions") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = propertySafetyNotes, onValueChange = { propertySafetyNotes = it }, label = { Text("Safety notes") }, modifier = Modifier.fillMaxWidth())
            }
        }

        error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }

        BrandedCta(
            text = "Request Quote",
            enabled = !submitting && name.trim().isNotEmpty(),
            loading = submitting,
            onClick = {
                error = null
                if (phone.isEmpty() && email.isEmpty()) {
                    error = "Enter a phone number or email so we can get back to you."
                    return@BrandedCta
                }
                Phone.error(phone)?.let {
                    error = it
                    return@BrandedCta
                }
                val year = vehicleYear.toIntOrNull()
                if (vehicleYear.isNotEmpty() && (year == null || year < 1980 || year > Year.now().value + 1)) {
                    error = "Enter a valid vehicle year."
                    return@BrandedCta
                }
                if (vehicleVin.isNotEmpty() && !vehicleVin.matches(Regex("^[A-Za-z0-9]{17}$"))) {
                    error = "VIN must be exactly 17 alphanumeric characters."
                    return@BrandedCta
                }
                submitting = true
                scope.launch {
                    try {
                        APIClient.post<InquiryRequest, InquiryResponse>(
                            "api/inquiry",
                            InquiryRequest(
                                client_id = Config.CLIENT_ID,
                                name = name,
                                phone = phone.ifEmpty { null }?.let { Phone.normalize(it) },
                                email = email.ifEmpty { null },
                                sms_consent = smsConsent,
                                email_consent = emailConsent,
                                service_category = serviceCategory.ifEmpty { null },
                                job_location = jobLocation.ifEmpty { null },
                                urgency = urgency,
                                description = description.ifEmpty { null },
                                preferred_contact_method = preferredContact,
                                preferred_date = preferredDateMillis?.let { formatIsoDate(it) },
                                photo_urls = photos.mapNotNull { it.url },
                                vehicle_make = resolveOrOther(vehicleMake, vehicleMakeOther),
                                vehicle_model = resolveOrOther(vehicleModel, vehicleModelOther),
                                vehicle_year = year,
                                vehicle_vin = vehicleVin.ifEmpty { null },
                                vehicle_plate = vehiclePlate.ifEmpty { null },
                                vehicle_mileage = vehicleMileage.toIntOrNull(),
                                vehicle_notes = vehicleNotes.ifEmpty { null },
                                vehicle_color = resolveOrOther(vehicleColor, vehicleColorOther),
                                property_address = propertyAddress.ifEmpty { null },
                                property_gate_code = propertyGateCode.ifEmpty { null },
                                property_parking_instructions = propertyParkingInstructions.ifEmpty { null },
                                property_pets_on_site = propertyPetsOnSite.ifEmpty { null },
                                property_access_notes = propertyAccessNotes.ifEmpty { null },
                                property_preferred_service_day = propertyPreferredServiceDay.ifEmpty { null },
                                property_lawn_size = propertyLawnSize.ifEmpty { null },
                                property_snow_removal_areas = propertySnowRemovalAreas.ifEmpty { null },
                                property_cleaning_instructions = propertyCleaningInstructions.ifEmpty { null },
                                property_safety_notes = propertySafetyNotes.ifEmpty { null },
                                property_place_id = propertyPlaceId,
                                property_address_verified = propertyAddressVerified,
                            ),
                        )
                        done = true
                    } catch (e: Exception) {
                        error = e.message
                    }
                    submitting = false
                }
            },
        )
    }
}

private fun formatIsoDate(millis: Long): String =
    Instant.ofEpochMilli(millis).atZone(ZoneOffset.UTC).format(DateTimeFormatter.ISO_LOCAL_DATE)

private fun formatDate(millis: Long): String =
    Instant.ofEpochMilli(millis).atZone(ZoneOffset.UTC).format(DateTimeFormatter.ofPattern("MMM d, yyyy"))
