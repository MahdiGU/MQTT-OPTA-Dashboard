import java.security.KeyStore

plugins {
    id("com.android.application")
    id("com.google.gms.google-services")
}

val debugStorePassword = "ElMajdDemo2026!"
val debugStoreFile = file("elmajd-debug.p12")
val debugKeyAlias = KeyStore.getInstance("PKCS12").run {
    debugStoreFile.inputStream().use { load(it, debugStorePassword.toCharArray()) }
    aliases().nextElement()
}

android {
    namespace = "com.mahdi.poultrydashboard"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.mahdi.poultrydashboard"
        minSdk = 26
        targetSdk = 35
        versionCode = 21
        versionName = "1.9.2"
    }

    signingConfigs {
        create("stableDebug") {
            storeFile = debugStoreFile
            storePassword = debugStorePassword
            keyAlias = debugKeyAlias
            keyPassword = debugStorePassword
            storeType = "PKCS12"
        }
    }

    buildTypes {
        debug {
            signingConfig = signingConfigs.getByName("stableDebug")
        }
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation(platform("com.google.firebase:firebase-bom:35.1.0"))
    implementation("com.google.firebase:firebase-messaging")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
}
