import java.util.Properties

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Google Play'e yüklenecek sürümün imza anahtarı: android/key.properties (git'e girmez).
//   storeFile=/tam/yol/upload-keystore.jks
//   storePassword=...
//   keyAlias=upload
//   keyPassword=...
// Dosya yoksa sürüm derlemesi hata ayıklama anahtarıyla imzalanır (yalnız denemelik).
val keystoreProperties = Properties().apply {
    val file = rootProject.file("key.properties")
    if (file.exists()) file.inputStream().use { load(it) }
}
val hasReleaseKey = keystoreProperties.getProperty("storeFile") != null

android {
    namespace = "com.lugatirisaleinur"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "com.lugatirisaleinur"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        // Uses the version code from pubspec.yaml. When using split APKs, 1000 * ABI_VERSION
        // is added automatically by Flutter. (https://developer.android.com/studio/build/configure-apk-splits#configure-APK-versions)
        // You can force using the value of versionCode by specifying the `-P force-version-code-ignoring-abi=true`
        // flag during build.
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    testOptions {
        unitTests.isIncludeAndroidResources = true
    }

    signingConfigs {
        if (hasReleaseKey) {
            create("release") {
                storeFile = file(keystoreProperties.getProperty("storeFile"))
                storePassword = keystoreProperties.getProperty("storePassword")
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName(if (hasReleaseKey) "release" else "debug")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}

// Robolectric testleri strings.xml gibi Android kaynaklarını kullanır; test paketi
// Flutter'ın kopyaladığı varlıklara da dokunduğu için görev sırası açıkça belirtilir.
afterEvaluate {
    listOf("Debug", "Profile", "Release").forEach { variant ->
        val copyAssets = tasks.findByName("copyFlutterAssets$variant") ?: return@forEach
        tasks.findByName("package${variant}UnitTestForUnitTest")?.dependsOn(copyAssets)
    }
}

tasks.withType<Test>().configureEach {
    // Robolectric'in Android 16 (API 36) ortamı JDK iç sınıflarına erişir.
    jvmArgs("--add-opens=java.base/jdk.internal.access=ALL-UNNAMED", "--add-opens=java.base/java.io=ALL-UNNAMED")
    // İsteğe bağlı: Robolectric'in Android jar'larını indireceği Maven adresi
    // (ör. ~/.gradle/gradle.properties içinde robolectricRepoUrl=...).
    providers.gradleProperty("robolectricRepoUrl").orNull?.let {
        systemProperty("robolectric.dependency.repo.url", it)
    }
}

dependencies {
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.robolectric:robolectric:4.17")
}
