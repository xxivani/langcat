
import { Tabs } from 'expo-router';
import React from 'react';
import { Image } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { Colors, colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
        tabBarStyle: {
          backgroundColor: colors.background, // Changed from '#0A0A0A'
          borderTopColor: colors.border,     // Changed from '#2A2A2A'
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 98,
          height: 65,
        },
        headerShown: false,
        tabBarButton: HapticTab,
        // IMPORTANT: Add this to prevent white flash on tab switches
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <Image
              source={require('@/assets/icons/icons8-home-27.png')}
              style={{ 
                width: 24, 
                height: 24,
                tintColor: focused ? Colors[colorScheme ?? 'light'].tint : Colors[colorScheme ?? 'light'].tabIconDefault,
              }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ focused, color }) => (
            <Image
              source={require('@/assets/icons/icons8-chat-27.png')}
              style={{ 
                width: 24, 
                height: 24,
                tintColor: focused ? Colors[colorScheme ?? 'light'].tint : Colors[colorScheme ?? 'light'].tabIconDefault,
              }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
          title: 'Review',
          tabBarIcon: ({ focused, color }) => (
            <Image
              source={require('@/assets/icons/icons8-loop-27.png')}
              style={{ 
                width: 24, 
                height: 24,
                tintColor: focused ? Colors[colorScheme ?? 'light'].tint : Colors[colorScheme ?? 'light'].tabIconDefault,
              }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="course"
        options={{
          title: 'Course',
          tabBarIcon: ({ focused, color }) => (
            <Image
              source={require('@/assets/icons/icons8-progress-27.png')}
              style={{ 
                width: 24, 
                height: 24,
                tintColor: focused ? Colors[colorScheme ?? 'light'].tint : Colors[colorScheme ?? 'light'].tabIconDefault,
              }}
            />
          ),
        }}
      />
    </Tabs>
  );
}
