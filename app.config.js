export default {
  expo: {
    name: "langcat",
    slug: "langcat",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/langcat-logo.png",
    scheme: "langcat",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.miaumiaunoway.langcat"
    },
    android: {
      package: "com.miaumiaunoway.langcat", 
      adaptiveIcon: {
        backgroundColor: "#000000",
        foregroundImage: "./assets/images/langcat-logo.png"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false
    },
    web: {
      output: "static",
      favicon: "./assets/images/langcat-logo.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/langcat-logo.png", 
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000"
          }
        }
      ],
      "expo-font"
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    },
    extra: {
    geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
    eas: {
      projectId: "7dd67146-76f3-4cc4-bb79-66006cd4be88"
    }
  }
  }
};