package ca.shawcliffe.tomsproduce.ui

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
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
import ca.shawcliffe.tomsproduce.BookingRequest
import ca.shawcliffe.tomsproduce.BookingResponse
import ca.shawcliffe.tomsproduce.ComponentKeys
import ca.shawcliffe.tomsproduce.Config
import ca.shawcliffe.tomsproduce.Email
import ca.shawcliffe.tomsproduce.Phone
import ca.shawcliffe.tomsproduce.StorefrontViewModel
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

private val TIME_OPTIONS = listOf("morning" to "Morning", "afternoon" to "Afternoon", "evening" to "Evening", "flexible" to "Flexible")

private data class PetPhoto(
    val uri: Uri,
    val url: String? = null,
    val uploading: Boolean = true,
    val error: String? = null,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BookingScreen(
    onDone: () -> Unit,
    businessName: String = "Tom's Produce",
    storefrontViewModel: StorefrontViewModel = activityScopedViewModel(),
) {
    val showPetFields = ComponentKeys.PET_PROFILES in storefrontViewModel.enabledComponents
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var service by remember { mutableStateOf("") }
    var hasPreferredDate by remember { mutableStateOf(false) }
    var preferredDateMillis by remember { mutableStateOf<Long?>(null) }
    var showDatePicker by remember { mutableStateOf(false) }
    var timePreference by remember { mutableStateOf(TIME_OPTIONS[3].first) }
    var notes by remember { mutableStateOf("") }
    var smsConsent by remember { mutableStateOf(false) }
    var emailConsent by remember { mutableStateOf(false) }
    var petName by remember { mutableStateOf("") }
    var petBreed by remember { mutableStateOf("") }
    var petSize by remember { mutableStateOf("") }
    var petAge by remember { mutableStateOf("") }
    var petAllergies by remember { mutableStateOf("") }
    var petBehaviorNotes by remember { mutableStateOf("") }
    var petGroomingPreferences by remember { mutableStateOf("") }
    var petVaccinationInfo by remember { mutableStateOf("") }
    var petEmergencyContact by remember { mutableStateOf("") }
    var petCareInstructions by remember { mutableStateOf("") }
    var petPhoto by remember { mutableStateOf<PetPhoto?>(null) }
    var submitting by remember { mutableStateOf(false) }
    var done by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    val petPhotoLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia(),
    ) { uri ->
        if (uri != null) {
            petPhoto = PetPhoto(uri = uri)
            scope.launch {
                try {
                    val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
                        ?: throw IllegalStateException("Could not read photo")
                    val contentType = context.contentResolver.getType(uri) ?: "image/jpeg"
                    val url = APIClient.uploadPhoto(Config.CLIENT_ID, bytes, "pet_${System.nanoTime()}.jpg", contentType, context = "booking")
                    petPhoto = petPhoto?.copy(url = url, uploading = false)
                } catch (e: Exception) {
                    petPhoto = petPhoto?.copy(uploading = false, error = e.message ?: "Upload failed")
                }
            }
        }
    }

    if (done) {
        ConfirmationScreen(
            title = "Booking request sent!",
            message = "$businessName will confirm your booking soon.",
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

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Request a Booking", style = MaterialTheme.typography.headlineSmall)

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
            value = service,
            onValueChange = { service = it },
            label = { Text("Service needed (optional)") },
            modifier = Modifier.fillMaxWidth(),
        )

        Row(verticalAlignment = Alignment.CenterVertically) {
            Checkbox(checked = hasPreferredDate, onCheckedChange = { hasPreferredDate = it })
            Text("I have a preferred date")
        }
        if (hasPreferredDate) {
            OutlinedButton(onClick = { showDatePicker = true }) {
                Text(preferredDateMillis?.let { formatDate(it) } ?: "Choose a date")
            }
        }

        Text("Preferred time", style = MaterialTheme.typography.titleSmall)
        TIME_OPTIONS.forEach { (value, label) ->
            Row(verticalAlignment = Alignment.CenterVertically) {
                RadioButton(selected = timePreference == value, onClick = { timePreference = value })
                Text(label)
            }
        }

        OutlinedTextField(
            value = notes,
            onValueChange = { notes = it },
            label = { Text("Anything else we should know? (optional)") },
            modifier = Modifier.fillMaxWidth(),
        )

        Row(verticalAlignment = Alignment.CenterVertically) {
            Checkbox(checked = smsConsent, onCheckedChange = { smsConsent = it })
            Text("Yes, send me text message updates")
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Checkbox(checked = emailConsent, onCheckedChange = { emailConsent = it })
            Text("Yes, send me email updates")
        }

        if (showPetFields) {
            Text("Pet (optional)", style = MaterialTheme.typography.titleSmall)
            OutlinedTextField(value = petName, onValueChange = { petName = it }, label = { Text("Pet name") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = petBreed, onValueChange = { petBreed = it }, label = { Text("Breed") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = petSize, onValueChange = { petSize = it }, label = { Text("Size") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = petAge, onValueChange = { petAge = it }, label = { Text("Age") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = petAllergies, onValueChange = { petAllergies = it }, label = { Text("Allergies") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = petBehaviorNotes, onValueChange = { petBehaviorNotes = it }, label = { Text("Behaviour notes") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = petGroomingPreferences, onValueChange = { petGroomingPreferences = it }, label = { Text("Grooming preferences") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = petVaccinationInfo, onValueChange = { petVaccinationInfo = it }, label = { Text("Vaccination info") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = petEmergencyContact, onValueChange = { petEmergencyContact = it }, label = { Text("Emergency contact") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = petCareInstructions, onValueChange = { petCareInstructions = it }, label = { Text("Care instructions") }, modifier = Modifier.fillMaxWidth())

            Text("Pet photo (optional)", style = MaterialTheme.typography.titleSmall)
            Button(onClick = { petPhotoLauncher.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }) {
                Text(if (petPhoto == null) "Add Photo" else "Change Photo")
            }
            petPhoto?.let { photo ->
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
                    IconButton(onClick = { petPhoto = null }, modifier = Modifier.align(Alignment.TopEnd).size(24.dp)) {
                        Icon(Icons.Filled.Close, contentDescription = "Remove photo")
                    }
                }
                photo.error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
            }
        }

        error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }

        Button(
            onClick = {
                error = null
                if (phone.isEmpty() && email.isEmpty()) {
                    error = "Enter a phone number or email so we can confirm your booking."
                    return@Button
                }
                Phone.error(phone)?.let {
                    error = it
                    return@Button
                }
                Email.error(email)?.let {
                    error = it
                    return@Button
                }
                submitting = true
                scope.launch {
                    try {
                        APIClient.post<BookingRequest, BookingResponse>(
                            "api/booking",
                            BookingRequest(
                                client_id = Config.CLIENT_ID,
                                name = name,
                                phone = phone.ifEmpty { null }?.let { Phone.normalize(it) },
                                email = email.ifEmpty { null },
                                sms_consent = smsConsent,
                                email_consent = emailConsent,
                                service = service.ifEmpty { null },
                                requested_date = preferredDateMillis?.let { formatIsoDate(it) },
                                requested_time = timePreference,
                                notes = notes.ifEmpty { null },
                                pet_name = petName.ifEmpty { null },
                                pet_breed = petBreed.ifEmpty { null },
                                pet_size = petSize.ifEmpty { null },
                                pet_age = petAge.ifEmpty { null },
                                pet_allergies = petAllergies.ifEmpty { null },
                                pet_behavior_notes = petBehaviorNotes.ifEmpty { null },
                                pet_grooming_preferences = petGroomingPreferences.ifEmpty { null },
                                pet_vaccination_info = petVaccinationInfo.ifEmpty { null },
                                pet_emergency_contact = petEmergencyContact.ifEmpty { null },
                                pet_care_instructions = petCareInstructions.ifEmpty { null },
                                pet_photo_url = petPhoto?.url,
                            ),
                        )
                        done = true
                    } catch (e: Exception) {
                        error = e.message
                    }
                    submitting = false
                }
            },
            enabled = !submitting && name.trim().isNotEmpty(),
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (submitting) CircularProgressIndicator(modifier = Modifier.padding(2.dp)) else Text("Request Booking")
        }
    }
}

private fun formatIsoDate(millis: Long): String =
    Instant.ofEpochMilli(millis).atZone(ZoneOffset.UTC).format(DateTimeFormatter.ISO_LOCAL_DATE)

private fun formatDate(millis: Long): String =
    Instant.ofEpochMilli(millis).atZone(ZoneOffset.UTC).format(DateTimeFormatter.ofPattern("MMM d, yyyy"))
