import java.security.KeyStore

plugins {
    id("com.android.application")
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
        versionCode = 6
        versionName = "1.4.1"
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
    implementation("org.eclipse.paho:org.eclipse.paho.client.mqttv3:1.2.5")
}
