package ca.shawcliffe.tomsproduce

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.lifecycle.lifecycleScope
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import ca.shawcliffe.tomsproduce.ui.PreorderScreen
import ca.shawcliffe.tomsproduce.ui.SignupScreen
import ca.shawcliffe.tomsproduce.ui.StorefrontScreen
import ca.shawcliffe.tomsproduce.ui.theme.ShawcliffeCustomerTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        PushManager.init(applicationContext)
        // Re-registers silently if Firebase is configured; no-op otherwise
        // (see PushManager's "KNOWN GAP" note). Only meaningfully prompts
        // once POST_NOTIFICATIONS is requested from the storefront screen.
        lifecycleScope.launch {
            PushManager.requestPermissionAndRegister()
        }

        setContent {
            ShawcliffeCustomerTheme {
                Surface(modifier = Modifier) {
                    val navController = rememberNavController()
                    NavHost(navController = navController, startDestination = "storefront") {
                        composable("storefront") {
                            StorefrontScreen(
                                onGetUpdates = { navController.navigate("signup") },
                                onReserve = { navController.navigate("preorder") },
                            )
                        }
                        composable("signup") { SignupScreen(onDone = { navController.popBackStack() }) }
                        composable("preorder") { PreorderScreen(onDone = { navController.popBackStack() }) }
                    }
                }
            }
        }
    }
}
