import React, { useState, useEffect, useRef } from 'react';
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
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { colors, typography, spacing, borders } from '../../constants/theme';
import { ScenarioService, type Scenario } from '../../lib/scenarios-service';
import { geminiService, type GeminiMessage, type ScenarioResponse } from '../../services/gemini-service';
import { audioService } from '../../lib/audio-service';
import { voiceService } from '../../lib/voice-service';
import { GoogleGenAI } from '@google/genai';
import Constants from 'expo-constants';

const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey || process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY || '' });

type Message = {
  id: string;
  role: 'user' | 'assistant';
  chinese: string;
  pinyin?: string;
  english?: string;
};

type Feedback = {
  grammar: string;
  vocabulary: string;
  fluency: string;
  suggestions: string;
};

export default function ScenarioScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Scenario data
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Chat state
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  
  // Conversation history for Gemini (excludes initial message)
  const [conversationHistory, setConversationHistory] = useState<GeminiMessage[]>([]);
  
  // Feedback state
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  useEffect(() => {
    if (id) {
      loadScenario();
    }
  }, [id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && !showFeedback) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, showFeedback]);

  async function loadScenario() {
    try {
      setLoading(true);
      setError(null);

      // Load scenario by key (id is the scenario_key like "hsk2_restaurant")
      const scenarioData = await ScenarioService.getScenarioByKey(id);
      setScenario(scenarioData);

      // Set initial message from AI
      const initialMessage: Message = {
        id: '0',
        role: 'assistant',
        chinese: scenarioData.initial_message.chinese,
        pinyin: scenarioData.initial_message.pinyin,
        english: scenarioData.initial_message.english,
      };
      setMessages([initialMessage]);

    } catch (err: any) {
      console.error('Error loading scenario:', err);
      setError(err.message || 'Failed to load scenario');
    } finally {
      setLoading(false);
    }
  }

  const handleSendMessage = async () => {
    if (!inputText.trim() || !scenario || isSending) return;

    const userMessageText = inputText.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      chinese: userMessageText,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsSending(true);

    try {
      // Add user message to conversation history for Gemini
      const updatedHistory: GeminiMessage[] = [
        ...conversationHistory,
        {
          role: 'user',
          parts: [{ text: userMessageText }]
        }
      ];

      // Get AI response from Gemini 3
      const response: ScenarioResponse = await geminiService.getScenarioResponse(
        userMessageText,
        scenario,
        conversationHistory
      );

      // Create AI message
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        chinese: response.chinese,
        pinyin: response.pinyin,
        english: response.english,
      };

      setMessages(prev => [...prev, aiMessage]);

      // Update conversation history - store in a format that maintains context
      // Use the Chinese + English for context, but structure it naturally
      const contextMessage = `${response.chinese} (${response.english})`;
      setConversationHistory([
        ...updatedHistory,
        { role: 'model', parts: [{ text: contextMessage }] }
      ]);

    } catch (err: any) {
      console.error('Error sending message:', err);
      
      // Show error message to user
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        chinese: '抱歉，出错了。',
        pinyin: 'Bàoqiàn, chūcuò le.',
        english: `Sorry, an error occurred: ${err.message || 'Please try again.'}`,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const handleEndConversation = async () => {
    if (messages.length <= 1) {
      // No conversation to analyze
      router.back();
      return;
    }

    setLoadingFeedback(true);
    
    try {
      // Collect all user messages for analysis
      const userMessages = messages
        .filter(m => m.role === 'user')
        .map(m => m.chinese)
        .join(' ');
      
      if (!userMessages.trim()) {
        // No user messages to analyze
        router.back();
        return;
      }

      // Get feedback from Gemini - only analyzing user's Chinese
      const feedbackData = await geminiService.getFeedback(
        userMessages,
        scenario.title, // Pass scenario context instead of AI messages
        'Chinese'
      );

      setFeedback(feedbackData);
      setShowFeedback(true);
    } catch (err: any) {
      console.error('Error getting feedback:', err);
      alert('Failed to generate feedback. Please try again.');
    } finally {
      setLoadingFeedback(false);
    }
  };

  const handleListen = async (message: Message) => {
    try {
      // If already playing this message, stop it
      if (playingMessageId === message.id) {
        await audioService.stopAudio();
        setPlayingMessageId(null);
        return;
      }

      // Stop any currently playing audio
      await audioService.stopAudio();
      
      // Play the Chinese text
      setPlayingMessageId(message.id);
      await audioService.speakChinese(message.chinese);
      setPlayingMessageId(null);
      
    } catch (error: any) {
      console.error('Error playing audio:', error);
      setPlayingMessageId(null);
      
      // Could show an error toast here
      alert(`Failed to play audio: ${error.message}`);
    }
  };

  const [isRecording, setIsRecording] = useState(false);

  const handleVoicePress = async () => {
    if (!scenario) return;
    
    try {
      if (isRecording) {
        // Stop recording
        setIsRecording(false);
        setIsSending(true);
        
        const audioUri = await voiceService.stopRecording();
        const transcribedText = await voiceService.transcribeAudio(audioUri);
        
        // Show user message
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          chinese: transcribedText,
        };
        setMessages(prev => [...prev, userMessage]);
        
        // Update conversation history
        const updatedHistory: GeminiMessage[] = [
          ...conversationHistory,
          { role: 'user', parts: [{ text: transcribedText }] }
        ];

        // Get text response first
        const textResponse = await geminiService.getScenarioResponse(
          transcribedText,
          scenario,
          conversationHistory
        );

        // Show AI message
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          chinese: textResponse.chinese,
          pinyin: textResponse.pinyin,
          english: textResponse.english,
        };
        setMessages(prev => [...prev, aiMessage]);

        // Update conversation history - store in a format that maintains context
        // Use the Chinese + English for context, but structure it naturally
        const contextMessage = `${textResponse.chinese} (${textResponse.english})`;
        setConversationHistory([
          ...updatedHistory,
          { role: 'model', parts: [{ text: contextMessage }] }
        ]);

        // Now convert Chinese text to audio using TTS model
        try {
          const audioResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [
              {
                role: 'user',
                parts: [{ text: `Read this text aloud: ${textResponse.chinese}` }]
              }
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Aoede' }
                }
              }
            }
          });

          // Play audio
          const audioData = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (audioData) {
            await audioService.playAudioData(audioData);
          }
        } catch (audioError: any) {
          console.error('TTS Error:', audioError);
          // Continue even if TTS fails - user can still see the text
        }
        
        setIsSending(false);
        
      } else {
        // Start recording
        await voiceService.startRecording();
        setIsRecording(true);
      }
    } catch (error: any) {
      console.error('Voice error:', error);
      setIsRecording(false);
      setIsSending(false);
      alert(`Voice error: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, styles.centerContent]}>
          <StatusBar barStyle="light-content" />
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading scenario...</Text>
        </View>
      </>
    );
  }

  if (error || !scenario) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, styles.centerContent]}>
          <StatusBar barStyle="light-content" />
          <Text style={styles.errorText}>{error || 'Scenario not found'}</Text>
          <Text style={styles.errorHint}>
            Make sure your Gemini API key is configured correctly
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // Show feedback screen
  if (showFeedback && feedback) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, { paddingBottom: 54 }]}>
          <StatusBar barStyle="light-content" />
          
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.headerCategory}>CONVERSATION FEEDBACK</Text>
              <Text style={styles.headerTitle}>How You Did</Text>
            </View>
          </View>

          <ScrollView 
            style={styles.feedbackContainer}
            contentContainerStyle={styles.feedbackContent}
          >
            <View style={styles.feedbackSection}>
              <Text style={styles.feedbackLabel}>GRAMMAR</Text>
              <Text style={styles.feedbackText}>{feedback.grammar}</Text>
            </View>

            <View style={styles.feedbackSection}>
              <Text style={styles.feedbackLabel}>VOCABULARY</Text>
              <Text style={styles.feedbackText}>{feedback.vocabulary}</Text>
            </View>

            <View style={styles.feedbackSection}>
              <Text style={styles.feedbackLabel}>FLUENCY</Text>
              <Text style={styles.feedbackText}>{feedback.fluency}</Text>
            </View>

            <View style={styles.feedbackSection}>
              <Text style={styles.feedbackLabel}>SUGGESTIONS</Text>
              <Text style={styles.feedbackText}>{feedback.suggestions}</Text>
            </View>
          </ScrollView>

          <View style={styles.feedbackActions}>
            <TouchableOpacity 
              style={styles.doneButton} 
              onPress={() => router.back()}
            >
              <Text style={styles.doneButtonText}>DONE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

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
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerCategory}>{scenario.category}</Text>
            <Text style={styles.headerTitle}>{scenario.title}</Text>
          </View>
          <TouchableOpacity 
            onPress={handleEndConversation} 
            style={styles.endButton}
            disabled={loadingFeedback}
          >
            {loadingFeedback ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.endButtonText}>END</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'text' && styles.modeButtonActive]}
            onPress={() => setMode('text')}
            activeOpacity={0.8}
          >
            <Text style={[styles.modeButtonText, mode === 'text' && styles.modeButtonTextActive]}>
              TEXT
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'voice' && styles.modeButtonActive]}
            onPress={() => setMode('voice')}
            activeOpacity={0.8}
          >
            <Text style={[styles.modeButtonText, mode === 'voice' && styles.modeButtonTextActive]}>
              VOICE
            </Text>
          </TouchableOpacity>
        </View>

        {/* Conversation */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.conversationArea}
          contentContainerStyle={styles.conversationContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => (
            <View key={message.id} style={styles.messageContainer}>
              <View style={[
                styles.messageBubble,
                message.role === 'user' && styles.messageBubbleUser
              ]}>
                <Text style={[
                  styles.messageTextChinese,
                  message.role === 'user' && styles.messageTextUser
                ]}>
                  {message.chinese}
                </Text>
                {message.pinyin && (
                  <Text style={[
                    styles.messageTextPinyin,
                    message.role === 'user' && styles.messageTextUser
                  ]}>
                    {message.pinyin}
                  </Text>
                )}
                {message.english && (
                  <Text style={[
                    styles.messageTextEnglish,
                    message.role === 'user' && styles.messageTextUser
                  ]}>
                    {message.english}
                  </Text>
                )}
              </View>
              
              {message.role === 'assistant' && (
                <TouchableOpacity 
                  style={styles.listenButton}
                  onPress={() => handleListen(message)}
                  disabled={playingMessageId !== null && playingMessageId !== message.id}
                >
                  {playingMessageId === message.id ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Image
                      source={require('@/assets/icons/icons8-speaker-32.png')}
                      style={styles.listenIcon}
                    />
                  )}
                  <Text style={styles.listenButtonText}>
                    {playingMessageId === message.id ? 'PLAYING...' : 'LISTEN'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          {isSending && (
            <View style={styles.typingIndicator}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.typingText}>AI is typing...</Text>
            </View>
          )}

          <View style={{ height: 200 }} />
        </ScrollView>

        {/* Input Area */}
        {mode === 'text' ? (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Type in Chinese..."
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              editable={!isSending}
              onSubmitEditing={handleSendMessage}
            />
            <TouchableOpacity 
              style={[styles.sendButton, (!inputText.trim() || isSending) && styles.sendButtonDisabled]} 
              activeOpacity={0.8}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isSending}
            >
              <Text style={styles.sendButtonText}>→</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.voiceContainer}>
            {isRecording ? (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingWave}>
                  <View style={[styles.waveBars, styles.waveBar1]} />
                  <View style={[styles.waveBars, styles.waveBar2]} />
                  <View style={[styles.waveBars, styles.waveBar3]} />
                  <View style={[styles.waveBars, styles.waveBar4]} />
                  <View style={[styles.waveBars, styles.waveBar5]} />
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                style={[
                  styles.micButton,
                  isSending && { opacity: 0.5 }
                ]} 
                onPress={handleVoicePress}
                disabled={isSending}
              >
                {isSending ? (
                  <ActivityIndicator size="large" color={colors.black} />
                ) : (
                  <Image
                    source={require('@/assets/icons/icons8-voice-recorder-64.png')}
                    style={styles.micIcon}
                  />
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              onPress={handleVoicePress}
              disabled={isSending}
              style={styles.voiceInstructionsButton}
            >
              <Text style={styles.voiceInstructions}>
                {isSending ? 'PROCESSING...' : isRecording ? 'TAP TO STOP' : 'TAP TO SPEAK'}
              </Text>
            </TouchableOpacity>
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  backButtonText: {
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
  endButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundElevated,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: borders.radius,
    minWidth: 60,
    alignItems: 'center',
  },
  endButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  modeToggle: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  modeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundElevated,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: borders.radius,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
  messageBubbleUser: {
    backgroundColor: 'rgba(255, 231, 153, 0.1)',
    borderColor: colors.primary,
    alignSelf: 'flex-end',
    maxWidth: '80%',
  },
  messageTextChinese: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.sm,
    lineHeight: 24,
  },
  messageTextPinyin: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  messageTextEnglish: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 20,
  },
  messageTextUser: {
    // User messages don't show translations
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
  listenIcon: {
    width: 16,
    height: 16,
    tintColor: colors.text,
  },
  listenButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 0.5,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  typingText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
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
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 20,
    color: colors.black,
    fontWeight: '400',
  },
  voiceContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
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
  micIcon: {
    width: 40,
    height: 40,
    tintColor: colors.black,
  },
  recordingIndicator: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  recordingWave: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  waveBars: {
    width: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  waveBar1: {
    height: 20,
  },
  waveBar2: {
    height: 35,
  },
  waveBar3: {
    height: 50,
  },
  waveBar4: {
    height: 35,
  },
  waveBar5: {
    height: 20,
  },
  voiceInstructionsButton: {
    paddingVertical: spacing.sm,
  },
  voiceInstructions: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: 15,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4545',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  errorHint: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borders.radius,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.black,
  },
  feedbackContainer: {
    flex: 1,
  },
  feedbackContent: {
    padding: spacing.xl,
  },
  feedbackSection: {
    marginBottom: spacing.xl,
    backgroundColor: colors.backgroundElevated,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: borders.radius,
    padding: spacing.lg,
  },
  feedbackLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  feedbackText: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.text,
    lineHeight: 22,
  },
  feedbackActions: {
    padding: spacing.xl,
    borderTopWidth: borders.width,
    borderTopColor: colors.border,
  },
  doneButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borders.radius,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.black,
    letterSpacing: 0.5,
  },
});