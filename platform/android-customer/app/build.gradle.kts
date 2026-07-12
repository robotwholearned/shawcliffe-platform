plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.google.services)
}

// Per-client values, overridden by Fastlane via -P Gradle properties (see
// android-customer/fastlane/Fastfile). `namespace` above stays fixed — that's
// the Kotlin package structure, distinct from `applicationId` (the Play
// Store identity), which Android lets you override freely per build.
val clientApplicationId = (project.findProperty("clientApplicationId") as String?) ?: "ca.shawcliffe.tomsproduce"
val clientAppName = (project.findProperty("clientAppName") as String?) ?: "Tom's Produce"
val clientId = (project.findProperty("clientId") as String?) ?: "c40569c6-1324-47a9-979f-6d076c4b67fc"
val clientSlug = (project.findProperty("clientSlug") as String?) ?: "toms-produce"

android {
    namespace = "ca.shawcliffe.tomsproduce"
    compileSdk = 34

    defaultConfig {
        applicationId = clientApplicationId
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
        // Android string resources need apostrophes escaped; resValue doesn't
        // do this automatically the way a literal strings.xml entry would.
        resValue("string", "app_name", clientAppName.replace("'", "\\'"))
        buildConfigField("String", "CLIENT_ID", "\"$clientId\"")
        buildConfigField("String", "CLIENT_SLUG", "\"$clientSlug\"")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.material.icons.extended)
    debugImplementation(libs.androidx.ui.tooling)

    implementation(platform(libs.supabase.bom))
    implementation(libs.supabase.postgrest)
    implementation(libs.ktor.client.okhttp)
    implementation(libs.ktor.client.content.negotiation)
    implementation(libs.ktor.serialization.json)
    implementation(libs.kotlinx.serialization.json)

    implementation(libs.coil.compose)
    implementation(libs.kotlinx.coroutines.play.services)
    implementation(libs.androidx.navigation.compose)

    // Push (FCM) — google-services.json present, plugin applied above.
    implementation("com.google.firebase:firebase-messaging-ktx:24.1.0")
}
