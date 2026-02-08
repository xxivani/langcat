import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

// Custom dark theme - CRITICAL for preventing white flashes
const CustomDarkTheme = {
  dark: true,
  colors: {
    primary: colors.primary,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
    notification: colors.primary,
  },
  fonts: {
    regular: {
      fontFamily: 'ArchivoBlack_400Regular',
      fontWeight: '400' as const,
    },
    medium: {
      fontFamily: 'ArchivoBlack_400Regular',
      fontWeight: '500' as const,
    },
    bold: {
      fontFamily: 'ArchivoBlack_400Regular',
      fontWeight: '700' as const,
    },
    heavy: {
      fontFamily: 'ArchivoBlack_400Regular',
      fontWeight: '900' as const,
    },
  },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ArchivoBlack_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider style={{ backgroundColor: colors.background }}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ThemeProvider value={CustomDarkTheme}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              // IMPORTANT: Use 'none' for instant transitions, no white flash
              animation: 'none',
              // Alternative: 'fade' for smooth but may show flash
              // animation: 'fade',
              // animationDuration: 150,
            }}
          >
            <Stack.Screen 
              name="(tabs)" 
              options={{
                animation: 'none',
              }}
            />
            <Stack.Screen 
              name="modal" 
              options={{ 
                presentation: 'modal',
                animation: 'slide_from_bottom',
                contentStyle: { backgroundColor: colors.background },
              }} 
            />
            <Stack.Screen 
              name="scenario/[id]"
              options={{
                animation: 'none',
                contentStyle: { backgroundColor: colors.background },
              }}
            />
            <Stack.Screen 
              name="chat/free"
              options={{
                animation: 'none',
                contentStyle: { backgroundColor: colors.background },
              }}
            />
            <Stack.Screen 
              name="lesson/[id]"
              options={{
                animation: 'none',
                contentStyle: { backgroundColor: colors.background },
              }}
            />
            <Stack.Screen 
              name="review/session"
              options={{
                animation: 'none',
                contentStyle: { backgroundColor: colors.background },
              }}
            />
          </Stack>
          <StatusBar style="light" backgroundColor={colors.background} />
        </ThemeProvider>
      </View>
    </SafeAreaProvider>
  );
}