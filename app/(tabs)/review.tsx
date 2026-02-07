import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, borders } from '../../constants/theme';
import { CurriculumService, FlashcardService, ProgressService } from '../../lib/database';
import { supabase } from '../../lib/supabase';

interface DeckData {
  id: string;
  title: string;
  level: string;
  hskLevel: number;
  totalCards: number;
  dueCards: number;
  newCards: number;
  accuracy: number;
  isLocked: boolean;
  lastReviewed: string | null;
}

export default function ReviewScreen() {
  const router = useRouter();
  const [decks, setDecks] = useState<DeckData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDueCards, setTotalDueCards] = useState(0);

  // TODO: Get actual user ID from auth
  // Using a valid UUID format for demo purposes
  const userId = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    loadReviewData();
  }, []);

  async function loadReviewData() {
    try {
      setLoading(true);

      // Get flashcard stats
      const stats = await FlashcardService.getFlashcardStats(userId);
      setTotalDueCards(stats.due);

      // First, get all available HSK levels from the database
      const allVocab = await supabase
        .from('vocabulary')
        .select('hsk_level')
        .order('hsk_level');
      
      if (!allVocab.data) {
        setDecks([]);
        return;
      }

      // Get unique HSK levels that actually have vocabulary
      const availableHskLevels = [...new Set(allVocab.data.map(v => v.hsk_level))].sort();

      // Load decks only for available HSK levels
      const deckPromises = availableHskLevels.map(async (hskLevel) => {
        try {
          // Get all vocabulary for this HSK level
          const vocabulary = await CurriculumService.getVocabularyByHSKLevel(hskLevel);
          
          // Get flashcard progress for this HSK level
          const vocabularyIds = vocabulary.map(v => v.id);
          
          let flashcardProgress: any[] = [];
          if (vocabularyIds.length > 0) {
            const { data } = await supabase
              .from('flashcard_reviews')
              .select('*')
              .eq('user_id', userId)
              .in('vocabulary_id', vocabularyIds);
            flashcardProgress = data || [];
          }

          const now = new Date();
          const dueCards = flashcardProgress.filter(f => 
            new Date(f.next_review_at) <= now
          ).length;

          const newCards = vocabulary.length - flashcardProgress.length;
          
          // Calculate accuracy
          const reviewedCards = flashcardProgress.filter(f => f.repetitions > 0);
          const successfulCards = reviewedCards.filter(f => f.repetitions >= 1).length;
          const accuracy = reviewedCards.length > 0 
            ? Math.round((successfulCards / reviewedCards.length) * 100)
            : 0;

          // Get last reviewed time
          const lastReviewedCard = flashcardProgress.reduce((latest, current) => {
            const currentDate = new Date(current.last_reviewed_at);
            const latestDate = latest ? new Date(latest.last_reviewed_at) : new Date(0);
            return currentDate > latestDate ? current : latest;
          }, null as any);

          const lastReviewed = lastReviewedCard 
            ? formatTimeAgo(new Date(lastReviewedCard.last_reviewed_at))
            : null;

          // Don't lock any decks - all available levels are unlocked
          const isLocked = false;

          return {
            id: `hsk${hskLevel}`,
            title: `HSK ${hskLevel} Vocabulary`,
            level: `HSK ${hskLevel}`,
            hskLevel,
            totalCards: vocabulary.length,
            dueCards,
            newCards,
            accuracy,
            isLocked,
            lastReviewed,
          };
        } catch (err) {
          console.error(`Error loading HSK ${hskLevel} deck:`, err);
          return null;
        }
      });

      const loadedDecks = (await Promise.all(deckPromises)).filter(deck => deck !== null) as DeckData[];
      setDecks(loadedDecks);

    } catch (err) {
      console.error('Error loading review data:', err);
    } finally {
      setLoading(false);
    }
  }

  function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    }
  }

  async function handleStartReview() {
    // Navigate to review session with due cards
    router.push('/review/session');
  }

  async function handleDeckPress(deck: DeckData) {
    if (deck.isLocked) return;
    
    // Navigate to review session filtered by HSK level
    router.push({
      pathname: '/review/session',
      params: { hskLevel: deck.hskLevel }
    });
  }

  async function handleAddCard() {
    // TODO: Implement custom card creation
    console.log('Add custom card');
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading decks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Review</Text>
          <TouchableOpacity 
            style={styles.addButton} 
            activeOpacity={0.8}
            onPress={handleAddCard}
          >
            <Text style={styles.addButtonText}>+ ADD CARD</Text>
          </TouchableOpacity>
        </View>

        {/* Cards Due Today */}
        {totalDueCards > 0 && (
          <View style={styles.dueSection}>
            <Text style={styles.dueText}>{totalDueCards} cards due today</Text>
            <TouchableOpacity 
              style={styles.startReviewButton}
              activeOpacity={0.8}
              onPress={handleStartReview}
            >
              <Text style={styles.startReviewButtonText}>
                START REVIEW ({totalDueCards} CARDS)
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* HSK Decks */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HSK DECKS</Text>
          
          {decks.map((deck) => (
            <TouchableOpacity
              key={deck.id}
              style={[styles.deckCard, deck.isLocked && styles.deckCardLocked]}
              activeOpacity={deck.isLocked ? 1 : 0.8}
              disabled={deck.isLocked}
              onPress={() => handleDeckPress(deck)}
            >
              <View style={styles.deckContent}>
                <View style={styles.deckHeader}>
                  <Text style={[styles.deckTitle, deck.isLocked && styles.deckTitleLocked]}>
                    {deck.title}
                  </Text>
                  {deck.isLocked && (
                    <View style={styles.lockIcon}>
                      <View style={styles.lockBody} />
                      <View style={styles.lockShackle} />
                    </View>
                  )}
                </View>
                
                <Text style={styles.deckMeta}>
                  Auto-generated · {deck.totalCards} total cards
                </Text>

                {!deck.isLocked && (
                  <View style={styles.deckStats}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{deck.dueCards}</Text>
                      <Text style={styles.statLabel}>DUE</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{deck.newCards}</Text>
                      <Text style={styles.statLabel}>NEW</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{deck.accuracy}%</Text>
                      <Text style={styles.statLabel}>ACCURACY</Text>
                    </View>
                    {deck.lastReviewed && (
                      <View style={styles.reviewTime}>
                        <Text style={styles.reviewTimeText}>Last reviewed</Text>
                        <Text style={styles.reviewTimeValue}>{deck.lastReviewed}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xxl,
  },
  headerTitle: {
    fontSize: 38,
    fontWeight: '700',
    letterSpacing: 0.38,
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borders.radius,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.black,
    letterSpacing: 0.5,
  },
  dueSection: {
    marginBottom: spacing.xxxl,
  },
  dueText: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  startReviewButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderRadius: borders.radius,
  },
  startReviewButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.black,
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  deckCard: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: borders.radius,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  deckCardLocked: {
    opacity: 0.5,
  },
  deckContent: {
    flex: 1,
  },
  deckHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  deckTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  deckTitleLocked: {
    color: colors.textSecondary,
  },
  lockIcon: {
    width: 16,
    height: 20,
    position: 'relative',
    marginLeft: spacing.sm,
  },
  lockBody: {
    position: 'absolute',
    bottom: 0,
    left: 2,
    width: 12,
    height: 12,
    backgroundColor: colors.textSecondary,
    borderRadius: 2,
  },
  lockShackle: {
    position: 'absolute',
    top: 0,
    left: 4,
    width: 8,
    height: 10,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomWidth: 0,
  },
  deckMeta: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  deckStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    marginRight: spacing.xl,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
    marginRight: spacing.xl,
  },
  reviewTime: {
    flex: 1,
    alignItems: 'flex-end',
  },
  reviewTimeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  reviewTimeValue: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: 15,
    color: colors.textSecondary,
  },
});