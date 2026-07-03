package ca.shawcliffe.seller

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import ca.shawcliffe.seller.ui.DashboardScreen
import ca.shawcliffe.seller.ui.LoginScreen
import ca.shawcliffe.seller.ui.theme.ShawcliffeSellerTheme

class MainActivity : ComponentActivity() {
    private val authViewModel: AuthViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            ShawcliffeSellerTheme {
                val clientId = authViewModel.clientId
                if (authViewModel.isAuthenticated && clientId != null) {
                    DashboardScreen(clientId = clientId, authViewModel = authViewModel)
                } else {
                    LoginScreen(authViewModel = authViewModel)
                }
            }
        }
    }
}
