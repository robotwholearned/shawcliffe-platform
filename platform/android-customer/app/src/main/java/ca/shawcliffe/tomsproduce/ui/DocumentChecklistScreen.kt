package ca.shawcliffe.tomsproduce.ui

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import ca.shawcliffe.tomsproduce.APIClient
import ca.shawcliffe.tomsproduce.Config
import ca.shawcliffe.tomsproduce.DocumentChecklistItem
import ca.shawcliffe.tomsproduce.Phone
import ca.shawcliffe.tomsproduce.supabase
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.launch

private sealed class UploadState {
    object Idle : UploadState()
    object Uploading : UploadState()
    object Uploaded : UploadState()
    data class Failed(val message: String) : UploadState()
}

@Composable
fun DocumentChecklistScreen(onDone: () -> Unit) {
    var items by remember { mutableStateOf<List<DocumentChecklistItem>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var smsConsent by remember { mutableStateOf(false) }
    var emailConsent by remember { mutableStateOf(false) }
    var contactError by remember { mutableStateOf<String?>(null) }
    val uploadStates = remember { mutableStateMapOf<String, UploadState>() }
    var pendingItemId by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument(),
    ) { uri ->
        val itemId = pendingItemId
        pendingItemId = null
        if (uri == null || itemId == null) return@rememberLauncherForActivityResult
        val item = items.firstOrNull { it.id == itemId } ?: return@rememberLauncherForActivityResult
        uploadStates[itemId] = UploadState.Uploading
        scope.launch {
            try {
                val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
                    ?: throw IllegalStateException("Could not read file")
                val contentType = context.contentResolver.getType(uri) ?: "application/octet-stream"
                APIClient.submitDocument(
                    path = "api/document-checklist/submit",
                    fields = mapOf(
                        "client_id" to Config.CLIENT_ID,
                        "name" to name,
                        "phone" to (phone.ifEmpty { null }?.let { Phone.normalize(it) } ?: ""),
                        "email" to email,
                        "sms_consent" to smsConsent.toString(),
                        "email_consent" to emailConsent.toString(),
                        "checklist_item_id" to item.id,
                    ),
                    bytes = bytes,
                    filename = "document_${item.id}",
                    contentType = contentType,
                )
                uploadStates[itemId] = UploadState.Uploaded
            } catch (e: Exception) {
                uploadStates[itemId] = UploadState.Failed(e.message ?: "Upload failed")
            }
        }
    }

    LaunchedEffect(Unit) {
        items = try {
            supabase.from("document_checklist_items").select {
                filter { eq("client_id", Config.CLIENT_ID) }
                order("sort_order", io.github.jan.supabase.postgrest.query.Order.ASCENDING)
            }.decodeList()
        } catch (e: Exception) {
            emptyList()
        }
        loading = false
    }

    fun startUpload(item: DocumentChecklistItem) {
        contactError = null
        if (name.trim().isEmpty()) {
            contactError = "Enter your name before uploading."
            return
        }
        if (phone.isEmpty() && email.isEmpty()) {
            contactError = "Enter a phone number or email before uploading."
            return
        }
        Phone.error(phone)?.let {
            contactError = it
            return
        }
        pendingItemId = item.id
        filePickerLauncher.launch(arrayOf("image/*", "application/pdf"))
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Documents", style = MaterialTheme.typography.headlineSmall)

        if (loading) {
            CircularProgressIndicator()
        } else if (items.isEmpty()) {
            Text("No checklist items yet.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        } else {
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
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = smsConsent, onCheckedChange = { smsConsent = it })
                Text("Yes, send me text message updates")
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = emailConsent, onCheckedChange = { emailConsent = it })
                Text("Yes, send me email updates")
            }
            contactError?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }

            items.forEach { item ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(item.title, style = MaterialTheme.typography.titleSmall)
                            Text(
                                if (item.required) "Required" else "Optional",
                                style = MaterialTheme.typography.labelSmall,
                                color = if (item.required) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        item.description?.takeIf { it.isNotEmpty() }?.let {
                            Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        if (item.needsUpload) {
                            when (val state = uploadStates[item.id]) {
                                UploadState.Uploaded -> Text("Uploaded ✓", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                                UploadState.Uploading -> Row {
                                    CircularProgressIndicator(modifier = Modifier.padding(end = 8.dp))
                                    Text("Uploading…", style = MaterialTheme.typography.labelSmall)
                                }
                                is UploadState.Failed -> Column {
                                    Text(state.message, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.labelSmall)
                                    TextButton(onClick = { startUpload(item) }) { Text("Try Again") }
                                }
                                else -> TextButton(onClick = { startUpload(item) }) { Text("Upload") }
                            }
                        }
                    }
                }
            }
        }

        Button(onClick = onDone, modifier = Modifier.fillMaxWidth()) { Text("Done") }
    }
}
