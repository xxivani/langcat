import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { colors, typography, spacing, borders } from '../../constants/theme';

export default function ScenarioScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [inputText, setInputText] = useState('');

  // Example scenario data
  const scenarioData = {
    restaurant: {
      title: 'Ordering at a Restaurant',
      category: 'FOOD & DINING',
      initialMessage: {
        spanish: '¡Buenas tardes! Bienvenido al restaurante. ¿Mesa para cuántas personas?',
        english: 'Good afternoon! Welcome to the restaurant. Table for how many?',
      },
    },
    directions: {
      title: 'Asking for Directions',
      category: 'TRAVEL',
      initialMessage: {
        spanish: '¡Hola! ¿En qué puedo ayudarte?',
        english: 'Hello! How can I help you?',
      },
    },
    market: {
      title: 'Shopping at a Market',
      category: 'SHOPPING',
      initialMessage: {
        spanish: 'Buenos días. ¿Qué necesita hoy?',
        english: 'Good morning. What do you need today?',
      },
    },
    smalltalk: {
      title: 'Making Small Talk',
      category: 'SOCIAL',
      initialMessage: {
        spanish: '¡Hola! ¿Cómo estás?',
        english: 'Hello! How are you?',
      },
    },
  };

  const scenario = scenarioData[id as keyof typeof scenarioData] || scenarioData.restaurant;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <StatusBar barStyle="light-content" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <View style={styles.backIcon}>
              <Text style={styles.backIconText}>←</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerCategory}>{scenario.category}</Text>
            <Text style={styles.headerTitle}>{scenario.title}</Text>
          </View>
        </View>

        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'text' && styles.modeButtonActive]}
            onPress={() => setMode('text')}
            activeOpacity={0.8}
          >
            <View style={styles.modeIcon}>
              <Text style={[styles.modeIconText, mode === 'text' && styles.modeIconTextActive]}>T</Text>
            </View>
            <Text style={[styles.modeButtonText, mode === 'text' && styles.modeButtonTextActive]}>
              TEXT
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'voice' && styles.modeButtonActive]}
            onPress={() => setMode('voice')}
            activeOpacity={0.8}
          >
            <View style={styles.modeIcon}>
              <View style={styles.micIconSmall} />
            </View>
            <Text style={[styles.modeButtonText, mode === 'voice' && styles.modeButtonTextActive]}>
              VOICE
            </Text>
          </TouchableOpacity>
        </View>

        {/* Conversation */}
        <ScrollView 
          style={styles.conversationArea}
          contentContainerStyle={styles.conversationContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Initial Message */}
          <View style={styles.messageContainer}>
            <View style={styles.messageBubble}>
              <Text style={styles.messageTextSpanish}>{scenario.initialMessage.spanish}</Text>
              <Text style={styles.messageTextEnglish}>{scenario.initialMessage.english}</Text>
            </View>
            <TouchableOpacity style={styles.listenButton}>
              <View style={styles.speakerIcon}>
                <View style={styles.speakerWave} />
                <View style={[styles.speakerWave, styles.speakerWave2]} />
                <View style={[styles.speakerWave, styles.speakerWave3]} />
              </View>
              <Text style={styles.listenButtonText}>LISTEN</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 200 }} />
        </ScrollView>

        {/* Input Area */}
        {mode === 'text' ? (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Type in Spanish..."
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            <TouchableOpacity style={styles.sendButton} activeOpacity={0.8}>
              <Text style={styles.sendButtonText}>→</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.voiceContainer}>
            <TouchableOpacity style={styles.micButton} activeOpacity={0.8}>
              <View style={styles.micIconContainer}>
                <View style={styles.micIconLarge} />
              </View>
            </TouchableOpacity>
            <Text style={styles.voiceInstructions}>TAP TO SPEAK</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: borders.width,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: spacing.md,
  },
  backIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIconText: {
    fontSize: 28,
    color: colors.text,
    fontWeight: '300',
  },
  headerContent: {
    flex: 1,
  },
  headerCategory: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modeToggle: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundElevated,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: borders.radius,
    gap: spacing.sm,
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modeIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIconText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modeIconTextActive: {
    color: colors.black,
  },
  micIconSmall: {
    width: 10,
    height: 14,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  modeButtonTextActive: {
    color: colors.black,
  },
  conversationArea: {
    flex: 1,
  },
  conversationContent: {
    padding: spacing.xl,
  },
  messageContainer: {
    marginBottom: spacing.xl,
  },
  messageBubble: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: borders.radius,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  messageTextSpanish: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.sm,
    lineHeight: 24,
  },
  messageTextEnglish: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 20,
  },
  listenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundElevated,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: borders.radius,
    gap: spacing.sm,
  },
  speakerIcon: {
    width: 20,
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  speakerWave: {
    width: 2,
    height: 8,
    backgroundColor: colors.text,
    borderRadius: 1,
  },
  speakerWave2: {
    height: 12,
  },
  speakerWave3: {
    height: 16,
  },
  listenButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: borders.width,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.backgroundElevated,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: borders.radius,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borders.radius,
  },
  sendButtonText: {
    fontSize: 20,
    color: colors.black,
    fontWeight: '400',
  },
  voiceContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    borderTopWidth: borders.width,
    borderTopColor: colors.border,
  },
  micButton: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 40,
    marginBottom: spacing.lg,
  },
  micIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  micIconLarge: {
    width: 24,
    height: 32,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: colors.black,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  voiceInstructions: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
});