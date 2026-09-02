plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

val releaseStoreFilePath = System.getenv("PWDHASH_RELEASE_STORE_FILE")
    ?: providers.gradleProperty("PWDHASH_RELEASE_STORE_FILE").orNull
val releaseStorePassword = System.getenv("PWDHASH_RELEASE_STORE_PASSWORD")
    ?: providers.gradleProperty("PWDHASH_RELEASE_STORE_PASSWORD").orNull
val releaseKeyAlias = System.getenv("PWDHASH_RELEASE_KEY_ALIAS")
    ?: providers.gradleProperty("PWDHASH_RELEASE_KEY_ALIAS").orNull
val releaseKeyPassword = System.getenv("PWDHASH_RELEASE_KEY_PASSWORD")
    ?: providers.gradleProperty("PWDHASH_RELEASE_KEY_PASSWORD").orNull
val releaseSigningValues = listOf(
    releaseStoreFilePath,
    releaseStorePassword,
    releaseKeyAlias,
    releaseKeyPassword
)
val releaseSigningConfigured = releaseSigningValues.all { !it.isNullOrBlank() }

if (!releaseSigningConfigured && releaseSigningValues.any { !it.isNullOrBlank() }) {
    throw GradleException(
        "Release signing is only partially configured. Set all four PWDHASH_RELEASE_* values."
    )
}

android {
    namespace = "uk.co.fireburn.pwdhash"
    compileSdk {
        version = release(37) {
            minorApiLevel = 1
        }
    }

    signingConfigs {
        if (releaseSigningConfigured) {
            create("release") {
                storeFile = file(requireNotNull(releaseStoreFilePath))
                storePassword = releaseStorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
            }
        }
    }

    defaultConfig {
        applicationId = "uk.co.fireburn.pwdhash"
        minSdk = 26
        targetSdk = 37
        versionCode = 6
        versionName = "4.0.0"
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
            if (releaseSigningConfigured) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.19.0")
    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("com.google.android.material:material:1.14.0")
    implementation(platform("androidx.compose:compose-bom:2026.06.01"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material:material-icons-core")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.activity:activity-compose:1.13.0")
    implementation("androidx.biometric:biometric:1.1.0")

    testImplementation("junit:junit:4.13.2")
}
