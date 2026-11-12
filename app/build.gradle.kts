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
val releaseStorePath = providers.environmentVariable("ELMAJD_RELEASE_STORE_FILE").orNull
val releaseStorePassword = providers.environmentVariable("ELMAJD_RELEASE_STORE_PASSWORD").orNull
val releaseKeyAlias = providers.environmentVariable("ELMAJD_RELEASE_KEY_ALIAS").orNull
val releaseKeyPassword = providers.environmentVariable("ELMAJD_RELEASE_KEY_PASSWORD").orNull
val releaseSigningReady = listOf(releaseStorePath, releaseStorePassword, releaseKeyAlias, releaseKeyPassword).all { !it.isNullOrBlank() }
val unsignedReleaseCheck = providers.gradleProperty("elmajdUnsignedReleaseCheck").orNull == "true"
if (gradle.startParameter.taskNames.any { it.contains("release", ignoreCase = true) } && !releaseSigningReady && !unsignedReleaseCheck) {
    throw GradleException("Production signing requires the four ELMAJD_RELEASE_* environment variables. CI may explicitly use -PelmajdUnsignedReleaseCheck=true for a non-installable compile check.")
}

android {
    namespace = "com.mahdi.poultrydashboard"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.mahdi.poultrydashboard"
        minSdk = 26
        targetSdk = 35
        versionCode = 33
        versionName = "1.16.0"
    }

    signingConfigs {
        if (releaseSigningReady) {
            create("protectedRelease") {
                storeFile = file(releaseStorePath!!)
                storePassword = releaseStorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
            }
        }
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
            if (releaseSigningReady) signingConfig = signingConfigs.getByName("protectedRelease")
            isDebuggable = false
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
