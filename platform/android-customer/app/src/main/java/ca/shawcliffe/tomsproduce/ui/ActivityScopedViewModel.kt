package ca.shawcliffe.tomsproduce.ui

import androidx.activity.ComponentActivity
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewmodel.compose.viewModel

/**
 * Scopes a ViewModel to the hosting Activity rather than the current
 * NavBackStackEntry, so StorefrontScreen and PreorderScreen share one
 * StorefrontViewModel instance — mirrors how ios-customer passes
 * `viewModel.products` straight into PreorderView via NavigationLink.
 */
@Composable
inline fun <reified VM : ViewModel> activityScopedViewModel(): VM {
    val activity = LocalContext.current as ComponentActivity
    return viewModel(viewModelStoreOwner = activity)
}
