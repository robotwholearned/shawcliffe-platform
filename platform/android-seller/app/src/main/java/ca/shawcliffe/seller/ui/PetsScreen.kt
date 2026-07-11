package ca.shawcliffe.seller.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import ca.shawcliffe.seller.PetsService
import coil.compose.AsyncImage

@Composable
fun PetsScreen(modifier: Modifier = Modifier) {
    var page by remember { mutableIntStateOf(0) }
    var pets by remember { mutableStateOf<List<PetsService.Pet>?>(null) }
    var total by remember { mutableIntStateOf(0) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val pageSize = 25

    LaunchedEffect(page) {
        isLoading = true
        errorMessage = null
        try {
            val response = PetsService.fetch(page)
            pets = response.pets
            total = response.total
        } catch (e: Exception) {
            errorMessage = e.message ?: "Couldn't load pets."
        } finally {
            isLoading = false
        }
    }

    Box(modifier = modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            errorMessage?.let {
                Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }

            LazyColumn(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                if (pets?.isEmpty() == true && !isLoading) {
                    item { Text("No pets on file yet.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                }
                items(pets ?: emptyList(), key = { it.id }) { pet ->
                    PetRow(pet)
                    HorizontalDivider()
                }
            }

            if (total > pageSize) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    TextButton(onClick = { page-- }, enabled = page > 0) { Text("← Prev") }
                    Text(
                        "${page * pageSize + 1}–${minOf((page + 1) * pageSize, total)} of $total",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    TextButton(onClick = { page++ }, enabled = (page + 1) * pageSize < total) { Text("Next →") }
                }
            }
        }

        if (isLoading && pets == null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        }
    }
}

@Composable
private fun PetRow(pet: PetsService.Pet) {
    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            pet.photoUrl?.let { url ->
                AsyncImage(model = url, contentDescription = null, modifier = Modifier.size(48.dp).clip(RoundedCornerShape(10.dp)))
            }
            Text(listOfNotNull(pet.name, pet.breed).joinToString(" — "), style = MaterialTheme.typography.titleSmall)
        }
        pet.customer?.let { customer ->
            Text(customer.name, style = MaterialTheme.typography.bodyMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                customer.phone?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                customer.email?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            pet.size?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            pet.age?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        }
        pet.allergies?.let { Text("Allergies: $it", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.error) }
        pet.behaviorNotes?.takeIf { it.isNotEmpty() }?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }
        pet.groomingPreferences?.let { Text("Grooming: $it", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        pet.vaccinationInfo?.let { Text("Vaccinations: $it", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        pet.emergencyContact?.let { Text("Emergency contact: $it", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        pet.careInstructions?.let { Text("Care: $it", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
    }
}
