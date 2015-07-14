plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
android {
    namespace = "uk.co.fireburn.pwdhash"
    compileSdk = 34

    // ADD THIS SIGNING CONFIGS BLOCK
    signingConfigs {
        create("release") {
            storeFile = file(System.getenv("PWDHASH_RELEASE_STORE_FILE") ?: project.property("PWDHASH_RELEASE_STORE_FILE") as String)
            storePassword = System.getenv("PWDHASH_RELEASE_STORE_PASSWORD") ?: project.property("PWDHASH_RELEASE_STORE_PASSWORD") as String
            keyAlias = System.getenv("PWDHASH_RELEASE_KEY_ALIAS") ?: project.property("PWDHASH_RELEASE_KEY_ALIAS") as String
            keyPassword = System.getenv("PWDHASH_RELEASE_KEY_PASSWORD") ?: project.property("PWDHASH_RELEASE_KEY_PASSWORD") as String
        }
    }

    defaultConfig {
        applicationId = "uk.co.fireburn.pwdhash"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables { useSupportLibrary = true }
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            // APPLY THE SIGNING CONFIG HERE
            signingConfig = signingConfigs.getByName("release")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    kotlinOptions { jvmTarget = "1.8" }
    buildFeatures { compose = true }
    composeOptions { kotlinCompilerExtensionVersion = "1.5.8" }
    packaging { resources { excludes += "/META-INF/{AL2.0,LGPL2.1}" } }
}
dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation(platform("androidx.compose:compose-bom:2024.02.01"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.activity:activity-compose:1.8.2")
    implementation("androidx.security:security-crypto:1.1.0-alpha06")
    implementation("androidx.biometric:biometric:1.2.0-alpha05")
}
