import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { colors, typography, spacing, borders } from '../../constants/theme';
import { CurriculumService, FlashcardService } from '../../lib/database';
import { supabase } from '../../lib/supabase';
import type { Vocabulary } from '../../lib/supabase';

export default function ReviewSessionScreen() {
  const router = useRouter();
  const { hskLevel, deckId } = useLocalSearchParams<{ hskLevel?: string; deckId?: string }>();
  
  const [vocabulary, setVocabulary] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flipAnimation] = useState(new Animated.Value(0));
  const [reviewedCards, setReviewedCards] = useState<Set<number>>(new Set());

  // TODO: Get actual user ID from auth
  const userId = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    loadVocabulary();
  }, [hskLevel, deckId]);

  async function loadVocabulary() {
    try {
      setLoading(true);
      setError(null);

      let vocab: Vocabulary[];

      if (deckId) {
        // Load vocabulary for specific custom deck
        const { data, error } = await supabase
          .from('vocabulary')
          .select('*')
          .eq('deck_id', deckId);
        
        if (error) throw error;
        vocab = data || [];
        
        // Initialize flashcard records
        const vocabularyIds = vocab.map(v => v.id);
        await FlashcardService.ensureFlashcardsExist(userId, vocabularyIds);
        
        // Get due flashcards
        const allFlashcards = await FlashcardService.getFlashcardsForVocabulary(userId, vocabularyIds);
        const now = new Date();
        const dueVocabIds = allFlashcards
          .filter(f => new Date(f.next_review_at) <= now)
          .map(f => f.vocabulary_id);
        
        // Filter to only include due cards
        vocab = vocab.filter(v => dueVocabIds.includes(v.id));
      } else if (hskLevel) {
        const level = parseInt(hskLevel);
        
        if (level === 0) {
          // Load custom cards (legacy, no deckId)
          const { data, error } = await supabase
            .from('vocabulary')
            .select('*')
            .eq('is_custom', true)
            .is('deck_id', null);
          
          if (error) throw error;
          vocab = data || [];
        } else {
          // Load vocabulary for specific HSK level
          vocab = await CurriculumService.getVocabularyByHSKLevel(level);
        }
        
        // Initialize flashcard records for any words that don't have them yet
        const vocabularyIds = vocab.map(v => v.id);
        await FlashcardService.ensureFlashcardsExist(userId, vocabularyIds);
        
        // Now get the due flashcards for this level
        const allFlashcards = await FlashcardService.getFlashcardsForVocabulary(userId, vocabularyIds);
        const now = new Date();
        const dueVocabIds = allFlashcards
          .filter(f => new Date(f.next_review_at) <= now)
          .map(f => f.vocabulary_id);
        
        // Filter to only include due cards
        vocab = vocab.filter(v => dueVocabIds.includes(v.id));
      } else {
        // Load due flashcards from all levels
        const dueFlashcards = await FlashcardService.getDueFlashcards(userId, 100);
        vocab = dueFlashcards.map((fc: any) => fc.vocabulary);
      }

      if (vocab.length === 0) {
        setError('No vocabulary to review');
      } else {
        // Shuffle the vocabulary for variety
        const shuffled = [...vocab].sort(() => Math.random() - 0.5);
        setVocabulary(shuffled);
      }

    } catch (err: any) {
      console.error('Error loading vocabulary:', err);
      setError(err.message || 'Failed to load vocabulary');
    } finally {
      setLoading(false);
    }
  }

  const flipCard = () => {
    Animated.timing(flipAnimation, {
      toValue: isFlipped ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const nextCard = () => {
    if (currentCardIndex < vocabulary.length - 1) {
      setReviewedCards(prev => new Set([...prev, currentCardIndex]));
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
      flipAnimation.setValue(0);
    }
  };

  const previousCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setIsFlipped(false);
      flipAnimation.setValue(0);
    }
  };

  const handleRating = async (quality: number) => {
    const currentWord = vocabulary[currentCardIndex];
    
    try {
      // Update flashcard with spaced repetition algorithm
      await FlashcardService.updateFlashcard(userId, currentWord.id, quality);
      
      // Move to next card
      nextCard();
    } catch (err) {
      console.error('Error updating flashcard:', err);
    }
  };

  const frontRotation = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backRotation = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  const frontOpacity = flipAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 0],
  });

  const backOpacity = flipAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, styles.centerContent]}>
          <StatusBar barStyle="light-content" />
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading vocabulary...</Text>
        </View>
      </>
    );
  }

  if (error || vocabulary.length === 0) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, styles.centerContent]}>
          <StatusBar barStyle="light-content" />
          <Text style={styles.errorText}>{error || 'No vocabulary to review'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const currentWord = vocabulary[currentCardIndex];
  const isLastCard = currentCardIndex === vocabulary.length - 1;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerCategory}>
              {hskLevel ? `HSK ${hskLevel} REVIEW` : 'REVIEW SESSION'}
            </Text>
            <Text style={styles.headerTitle}>Flashcard Review</Text>
          </View>
        </View>

        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Card {currentCardIndex + 1} of {vocabulary.length}
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${((currentCardIndex + 1) / vocabulary.length) * 100}%` }
                ]} 
              />
            </View>
          </View>

          {/* Flashcard Container */}
          <View style={styles.flashcardContainer}>
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={flipCard}
              style={styles.cardTouchable}
            >
              {/* Front of Card (Chinese/Pinyin) */}
              <Animated.View
                style={[
                  styles.card,
                  styles.cardFront,
                  {
                    transform: [{ rotateY: frontRotation }],
                    opacity: frontOpacity,
                  },
                ]}
              >
                <View style={styles.cardContent}>
                  <Text style={styles.cardHint}>TAP TO REVEAL</Text>
                  <Text style={styles.cardChinese}>{currentWord.simplified}</Text>
                  <Text style={styles.cardPinyin}>{currentWord.pinyin}</Text>
                  <Text style={styles.cardPos}>{currentWord.part_of_speech}</Text>
                </View>
              </Animated.View>

              {/* Back of Card (English) */}
              <Animated.View
                style={[
                  styles.card,
                  styles.cardBack,
                  {
                    transform: [{ rotateY: backRotation }],
                    opacity: backOpacity,
                  },
                ]}
              >
                <View style={styles.cardContent}>
                  <Text style={styles.cardHint}>TAP TO FLIP BACK</Text>
                  <Text style={styles.cardEnglish}>{currentWord.definition_en}</Text>
                  <View style={styles.divider} />
                  <Text style={styles.cardChineseSmall}>{currentWord.simplified}</Text>
                  <Text style={styles.cardPinyinSmall}>{currentWord.pinyin}</Text>
                </View>
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* Rating Buttons (only show when card is flipped) */}
          {isFlipped && (
            <View style={styles.ratingSection}>
              <Text style={styles.ratingSectionTitle}>How well did you know this?</Text>
              <View style={styles.ratingButtons}>
                <TouchableOpacity 
                  style={[styles.ratingButton, styles.ratingButtonAgain]}
                  onPress={() => handleRating(1)}
                >
                  <Text style={styles.ratingButtonLabel}>Again</Text>
                  <Text style={styles.ratingButtonTime}>1 min</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.ratingButton, styles.ratingButtonHard]}
                  onPress={() => handleRating(2)}
                >
                  <Text style={styles.ratingButtonLabel}>Hard</Text>
                  <Text style={styles.ratingButtonTime}>10 min</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.ratingButton, styles.ratingButtonGood]}
                  onPress={() => handleRating(4)}
                >
                  <Text style={styles.ratingButtonLabel}>Good</Text>
                  <Text style={styles.ratingButtonTime}>1 day</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.ratingButton, styles.ratingButtonEasy]}
                  onPress={() => handleRating(5)}
                >
                  <Text style={styles.ratingButtonLabel}>Easy</Text>
                  <Text style={styles.ratingButtonTime}>4 days</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Navigation Buttons */}
          <View style={styles.navigationButtons}>
            <TouchableOpacity
              style={[styles.navButton, currentCardIndex === 0 && styles.navButtonDisabled]}
              onPress={previousCard}
              disabled={currentCardIndex === 0}
            >
              <Text style={[styles.navButtonText, currentCardIndex === 0 && styles.navButtonTextDisabled]}>
                Previous
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navButton, isLastCard && styles.navButtonDisabled]}
              onPress={nextCard}
              disabled={isLastCard}
            >
              <Text style={[styles.navButtonText, isLastCard && styles.navButtonTextDisabled]}>
                {isLastCard ? 'Finish' : 'Skip'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Example Sentences Section */}
          {currentWord.examples && currentWord.examples.length > 0 && (
            <View style={styles.examplesSection}>
              <Text style={styles.examplesTitle}>Example Usage</Text>
              {currentWord.examples.map((example, index) => (
                <View key={index} style={styles.exampleCard}>
                  <View style={styles.exampleNumber}>
                    <Text style={styles.exampleNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.exampleContent}>
                    <Text style={styles.exampleChinese}>{example.chinese}</Text>
                    <Text style={styles.examplePinyin}>{example.pinyin}</Text>
                    <View style={styles.exampleDivider} />
                    <Text style={styles.exampleEnglish}>{example.english}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
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
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: 100,
  },
  progressContainer: {
    marginBottom: spacing.xl,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.backgroundElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  flashcardContainer: {
    height: 320,
    marginBottom: spacing.xl,
  },
  cardTouchable: {
    flex: 1,
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: colors.backgroundElevated,
    borderRadius: borders.radius * 2,
    borderWidth: borders.width * 2,
    borderColor: colors.border,
    backfaceVisibility: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardFront: {},
  cardBack: {},
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  cardHint: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: spacing.lg,
  },
  cardChinese: {
    fontSize: 64,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  cardPinyin: {
    fontSize: 24,
    fontWeight: '400',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  cardPos: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  cardEnglish: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  divider: {
    width: 80,
    height: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },
  cardChineseSmall: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  cardPinyinSmall: {
    fontSize: 18,
    fontWeight: '400',
    color: colors.textMuted,
  },
  ratingSection: {
    marginBottom: spacing.xl,
  },
  ratingSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  ratingButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ratingButton: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: borders.radius,
    alignItems: 'center',
    borderWidth: borders.width,
  },
  ratingButtonAgain: {
    backgroundColor: '#3d1f1f',
    borderColor: '#8B4545',
  },
  ratingButtonHard: {
    backgroundColor: '#3d2f1f',
    borderColor: '#8B7545',
  },
  ratingButtonGood: {
    backgroundColor: colors.backgroundElevated,
    borderColor: colors.border,
  },
  ratingButtonEasy: {
    backgroundColor: '#1f3d2f',
    borderColor: '#458B75',
  },
  ratingButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  ratingButtonTime: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xxl,
    gap: spacing.md,
  },
  navButton: {
    flex: 1,
    backgroundColor: colors.backgroundElevated,
    borderWidth: borders.width,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    borderRadius: borders.radius,
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  navButtonTextDisabled: {
    color: colors.textMuted,
  },
  examplesSection: {
    marginBottom: spacing.xxl,
  },
  examplesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  exampleCard: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundElevated,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: borders.radius,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  exampleNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  exampleNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.black,
  },
  exampleContent: {
    flex: 1,
  },
  exampleChinese: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  examplePinyin: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  exampleDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  exampleEnglish: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 22,
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
});