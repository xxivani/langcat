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
import { CurriculumService } from '../../lib/database';
import { unifiedProgressService } from '../../services/progress-service';
import type { Lesson, Vocabulary } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';

export default function LessonScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [vocabulary, setVocabulary] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flipAnimation] = useState(new Animated.Value(0));
  const [levelNumber, setLevelNumber] = useState<number>(0);
  const [unitNumber, setUnitNumber] = useState<number>(0);

  useEffect(() => {
    if (id) {
      loadLesson();
    }
  }, [id]);

  async function loadLesson() {
    try {
      setLoading(true);
      setError(null);

      const lessonData = await CurriculumService.getLessonWithVocabulary(id);
      setLesson(lessonData);
      setVocabulary(lessonData.vocabulary || []);

      // Fetch unit to get level info
      const { data: unitData } = await supabase
        .from('units')
        .select('unit_number, levels!inner(level_number)')
        .eq('id', lessonData.unit_id)
        .single();

      if (unitData) {
        setUnitNumber(unitData.unit_number);
        setLevelNumber((unitData.levels as any).level_number);
      }

      // Initialize flashcards for this lesson's vocabulary
      const vocabularyIds = (lessonData.vocabulary || []).map(v => v.id);
      if (vocabularyIds.length > 0) {
        await unifiedProgressService.initializeFlashcards(vocabularyIds);
      }

    } catch (err: any) {
      console.error('Error loading lesson:', err);
      setError(err.message || 'Failed to load lesson');
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

  const completeLesson = async () => {
    if (!lesson || !levelNumber || !unitNumber) return;

    try {
      // Mark lesson as completed
      await unifiedProgressService.completeLesson(
        levelNumber,
        unitNumber,
        lesson.lesson_number
      );

      // Add words learned
      await unifiedProgressService.addWordsLearned(vocabulary.length);

      // Navigate back to course
      router.back();
    } catch (err) {
      console.error('Error completing lesson:', err);
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
          <Text style={styles.loadingText}>Loading lesson...</Text>
        </View>
      </>
    );
  }

  if (error || !lesson || vocabulary.length === 0) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, styles.centerContent]}>
          <StatusBar barStyle="light-content" />
          <Text style={styles.errorText}>{error || 'No vocabulary found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const currentWord = vocabulary[currentCardIndex];

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
            <Text style={styles.headerCategory}>LESSON {lesson.lesson_number}</Text>
            <Text style={styles.headerTitle}>{lesson.title}</Text>
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

          {/* Navigation Buttons - FIXED WITH COMPLETE BUTTON */}
          <View style={styles.navigationButtons}>
            <TouchableOpacity
              style={[styles.navButton, currentCardIndex === 0 && styles.navButtonDisabled]}
              onPress={previousCard}
              disabled={currentCardIndex === 0}
            >
              <Text style={[styles.navButtonText, currentCardIndex === 0 && styles.navButtonTextDisabled]}>
                ← Previous
              </Text>
            </TouchableOpacity>

            {currentCardIndex === vocabulary.length - 1 ? (
              <TouchableOpacity
                style={[styles.navButton, styles.completeButton]}
                onPress={completeLesson}
              >
                <Text style={[styles.navButtonText, styles.completeButtonText]}>
                  ✓ Complete Lesson
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.navButton}
                onPress={nextCard}
              >
                <Text style={styles.navButtonText}>
                  Next →
                </Text>
              </TouchableOpacity>
            )}
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

          {/* Additional Notes */}
          {(currentWord.usage_notes || currentWord.pronunciation_tips || currentWord.cultural_notes) && (
            <View style={styles.notesSection}>
              <Text style={styles.notesTitle}>Additional Notes</Text>
              
              {currentWord.usage_notes && (
                <View style={styles.noteCard}>
                  <Text style={styles.noteLabel}>Usage Tips</Text>
                  <Text style={styles.noteText}>{currentWord.usage_notes}</Text>
                </View>
              )}

              {currentWord.pronunciation_tips && (
                <View style={styles.noteCard}>
                  <Text style={styles.noteLabel}>Pronunciation</Text>
                  <Text style={styles.noteText}>{currentWord.pronunciation_tips}</Text>
                </View>
              )}

              {currentWord.cultural_notes && (
                <View style={styles.noteCard}>
                  <Text style={styles.noteLabel}>Cultural Context</Text>
                  <Text style={styles.noteText}>{currentWord.cultural_notes}</Text>
                </View>
              )}
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
    letterSpacing: 0.5,
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
  completeButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  completeButtonText: {
    color: colors.black,
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
  notesSection: {
    marginBottom: spacing.xxl,
  },
  notesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  noteCard: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: borders.radius,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  noteLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  noteText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 20,
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