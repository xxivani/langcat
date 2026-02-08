import React, { useState, useRef, useEffect } from 'react';
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
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { colors, typography, spacing, borders } from '../../constants/theme';
import { geminiService, type GeminiMessage, type ScenarioResponse } from '../../services/gemini-service';
import { audioService } from '../../lib/audio-service';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  chinese: string;
  pinyin?: string;
  english?: string;
};

export default function FreeChatScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Chat state
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      chinese: '你好！我是LangCat。我们可以用中文聊任何话题。你想聊什么？',
      pinyin: 'Nǐ hǎo! Wǒ shì LangCat. Wǒmen kěyǐ yòng Zhōngwén liáo rènhé huàtí. Nǐ xiǎng liáo shénme?',
      english: 'Hello! I\'m LangCat. We can chat about anything in Chinese. What would you like to talk about?',
    }
  ]);
  const [isSending, setIsSending] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<GeminiMessage[]>([]);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isSending) return;

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
      // Add user message to conversation history
      const updatedHistory: GeminiMessage[] = [
        ...conversationHistory,
        {
          role: 'user',
          parts: [{ text: userMessageText }]
        }
      ];

      // Define free chat scenario context
      const freeChatScenario = {
        system_prompt: `You are LangCat, a friendly Chinese language tutor. Have a natural, engaging conversation in Mandarin Chinese. Be encouraging, patient, and help the user practice their Chinese naturally.

Match the user's level - if they use simple Chinese, keep your responses simple. If they use advanced Chinese, you can be more sophisticated.

Stay in character as a helpful language learning companion. Be conversational and friendly.`,
        title: 'Free Chat',
        category: 'Casual Conversation'
      };

      // Get AI response from Gemini 3
      const response: ScenarioResponse = await geminiService.getScenarioResponse(
        userMessageText,
        freeChatScenario,
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

      // Update conversation history with AI response
      setConversationHistory([
        ...updatedHistory,
        {
          role: 'model',
          parts: [{ text: JSON.stringify(response) }]
        }
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

  const handleListen = async (message: Message) => {
    try {
      if (playingMessageId === message.id) {
        await audioService.stopAudio();
        setPlayingMessageId(null);
        return;
      }

      await audioService.stopAudio();
      setPlayingMessageId(message.id);
      await audioService.speakChinese(message.chinese);
      setPlayingMessageId(null);
      
    } catch (error: any) {
      console.error('Error playing audio:', error);
      setPlayingMessageId(null);
      alert(`Failed to play audio: ${error.message}`);
    }
  };

  const handleVoicePress = () => {
    // TODO: Implement voice recording with Gemini Live API
    console.log('Voice recording not yet implemented');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView 
        style={[styles.container, { paddingBottom:54 }]}
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
            <Text style={styles.headerCategory}>FREE CONVERSATION</Text>
            <Text style={styles.headerTitle}>Chat with LangCat</Text>
          </View>
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
              <Text style={styles.typingText}>LangCat is typing...</Text>
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
            <TouchableOpacity 
              style={styles.micButton} 
              activeOpacity={0.8}
              onPress={handleVoicePress}
            >
              <Image
                source={require('@/assets/icons/icons8-voice-recorder-64.png')}
                style={styles.micIcon}
              />
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
  micIcon: {
    width: 40,
    height: 40,
    tintColor: colors.black,
  },
  voiceInstructions: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
});