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
      chinese: 'ä½ å¥½ï¼æˆ‘æ˜¯LangCatã€‚æˆ‘ä»¬å¯ä»¥ç”¨ä¸­æ–‡èŠä»»ä½•è¯é¢˜ã€‚ä½ æƒ³èŠä»€ä¹ˆï¼Ÿ',
      pinyin: 'NÇ hÇŽo! WÇ’ shÃ¬ LangCat. WÇ’men kÄ›yÇ yÃ²ng ZhÅngwÃ©n liÃ¡o rÃ¨nhÃ© huÃ tÃ­. NÇ xiÇŽng liÃ¡o shÃ©nme?',
      english: 'Hello! I\'m LangCat. We can chat about anything in Chinese. What would you like to talk about?',
    }
  ]);
  const [isSending, setIsSending] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<GeminiMessage[]>([]);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [showGrading, setShowGrading] = useState(false);
  const [grading, setGrading] = useState(false);
  const [gradingResult, setGradingResult] = useState<any>(null);

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
        chinese: 'æŠ±æ­‰ï¼Œå‡ºé”™äº†ã€‚',
        pinyin: 'BÃ oqiÃ n, chÅ«cuÃ² le.',
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

  const handleEndConversation = async () => {
    if (messages.length <= 1) {
      alert('Have a conversation first before ending!');
      return;
    }

    setGrading(true);
    
    try {
      // Prepare conversation transcript
      const transcript = messages
        .filter(m => m.role === 'user')
        .map((m, i) => `${i + 1}. ${m.chinese}`)
        .join('\n');

      // Ask Gemini to grade the conversation
      const gradingPrompt = `You are a Chinese language teacher. Grade this conversation based on:

1. Grammar accuracy (0-10)
2. Vocabulary usage (0-10)
3. Sentence structure (0-10)
4. Overall fluency (0-10)

Student's messages:
${transcript}

Provide a JSON response with:
{
  "grammar": number,
  "vocabulary": number,
  "structure": number,
  "fluency": number,
  "totalScore": number (out of 40),
  "strengths": ["strength1", "strength2"],
  "improvements": ["area1", "area2"],
  "feedback": "Brief encouraging feedback in English"
}`;

      const response = await geminiService.getScenarioResponse(
        gradingPrompt,
        {
          system_prompt: 'You are a professional Chinese language evaluator. Provide constructive feedback.',
          title: 'Grading',
          category: 'Assessment'
        },
        []
      );

      // Parse grading result
      const gradingText = response.chinese.replace(/```json|```/g, '').trim();
      const result = JSON.parse(gradingText);
      
      setGradingResult(result);
      setShowGrading(true);
      
    } catch (error) {
      console.error('Grading error:', error);
      alert('Failed to grade conversation. Please try again.');
    } finally {
      setGrading(false);
    }
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
          <TouchableOpacity 
            onPress={handleEndConversation} 
            style={styles.endButton}
            disabled={grading}
          >
            <Text style={styles.endButtonText}>
              {grading ? '...' : 'End'}
            </Text>
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
              <Text style={styles.sendButtonText}>â†’</Text>
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
        
        {/* Grading Modal */}
        {showGrading && gradingResult && (
          <View style={styles.gradingOverlay}>
            <View style={styles.gradingModal}>
              <Text style={styles.gradingTitle}>Conversation Grade</Text>
              
              <View style={styles.scoreContainer}>
                <Text style={styles.totalScore}>
                  {gradingResult.totalScore}/40
                </Text>
                <Text style={styles.scoreLabel}>Total Score</Text>
              </View>

              <View style={styles.detailScores}>
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreCategory}>Grammar</Text>
                  <Text style={styles.scoreValue}>{gradingResult.grammar}/10</Text>
                </View>
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreCategory}>Vocabulary</Text>
                  <Text style={styles.scoreValue}>{gradingResult.vocabulary}/10</Text>
                </View>
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreCategory}>Structure</Text>
                  <Text style={styles.scoreValue}>{gradingResult.structure}/10</Text>
                </View>
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreCategory}>Fluency</Text>
                  <Text style={styles.scoreValue}>{gradingResult.fluency}/10</Text>
                </View>
              </View>

              <View style={styles.feedbackSection}>
                <Text style={styles.feedbackTitle}>Strengths</Text>
                {gradingResult.strengths.map((strength: string, i: number) => (
                  <Text key={i} style={styles.feedbackItem}>• {strength}</Text>
                ))}
              </View>

              <View style={styles.feedbackSection}>
                <Text style={styles.feedbackTitle}>Areas to Improve</Text>
                {gradingResult.improvements.map((improvement: string, i: number) => (
                  <Text key={i} style={styles.feedbackItem}>• {improvement}</Text>
                ))}
              </View>

              <View style={styles.feedbackSection}>
                <Text style={styles.feedbackText}>{gradingResult.feedback}</Text>
              </View>

              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => {
                  setShowGrading(false);
                  router.back();
                }}
              >
                <Text style={styles.closeButtonText}>DONE</Text>
              </TouchableOpacity>
            </View>
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
  endButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  endButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  gradingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  gradingModal: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: borders.width * 2,
    borderColor: colors.border,
    borderRadius: borders.radius * 2,
    padding: spacing.xxl,
    width: '100%',
    maxHeight: '80%',
  },
  gradingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  totalScore: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.primary,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  detailScores: {
    marginBottom: spacing.xl,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: borders.width,
    borderBottomColor: colors.border,
  },
  scoreCategory: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  feedbackSection: {
    marginBottom: spacing.lg,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  feedbackItem: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  feedbackText: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.text,
    lineHeight: 22,
  },
  closeButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderRadius: borders.radius,
    marginTop: spacing.lg,
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.black,
    letterSpacing: 0.5,
  },
});