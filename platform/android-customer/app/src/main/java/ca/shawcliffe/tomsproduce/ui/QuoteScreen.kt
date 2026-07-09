package ca.shawcliffe.tomsproduce.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import ca.shawcliffe.tomsproduce.APIClient
import ca.shawcliffe.tomsproduce.Config
import ca.shawcliffe.tomsproduce.InquiryRequest
import ca.shawcliffe.tomsproduce.InquiryResponse
import ca.shawcliffe.tomsproduce.Phone
import kotlinx.coroutines.launch

private val URGENCY_OPTIONS = listOf("asap" to "ASAP", "this_week" to "This week", "this_month" to "This month", "flexible" to "Flexible")
private val CONTACT_OPTIONS = listOf("phone" to "Phone", "email" to "Email", "sms" to "Text")

@Composable
fun QuoteScreen(onDone: () -> Unit, businessName: String = "Tom's Produce") {
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var serviceCategory by remember { mutableStateOf("") }
    var jobLocation by remember { mutableStateOf("") }
    var urgency by remember { mutableStateOf(URGENCY_OPTIONS[0].first) }
    var description by remember { mutableStateOf("") }
    var preferredContact by remember { mutableStateOf(CONTACT_OPTIONS[0].first) }
    var smsConsent by remember { mutableStateOf(false) }
    var emailConsent by remember { mutableStateOf(false) }
    var submitting by remember { mutableStateOf(false) }
    var done by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    if (done) {
        ConfirmationScreen(
            title = "Request sent!",
            message = "$businessName will reach out about your quote soon.",
        )
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Get a Quote", style = MaterialTheme.typography.headlineSmall)

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

        Row(verticalAlignment = Alignment.CenterVertically) {
            Checkbox(checked = smsConsent, onCheckedChange = { smsConsent = it })
            Text("Yes, send me text message updates")
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Checkbox(checked = emailConsent, onCheckedChange = { emailConsent = it })
            Text("Yes, send me email updates")
        }

        error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }

        Button(
            onClick = {
                error = null
                if (phone.isEmpty() && email.isEmpty()) {
                    error = "Enter a phone number or email so we can get back to you."
                    return@Button
                }
                Phone.error(phone)?.let {
                    error = it
                    return@Button
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
            if (submitting) CircularProgressIndicator(modifier = Modifier.padding(2.dp)) else Text("Request Quote")
        }
    }
}
