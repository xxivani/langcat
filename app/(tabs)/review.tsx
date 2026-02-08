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
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing, borders } from '../../constants/theme';
import { CurriculumService } from '../../lib/database';
import { unifiedProgressService } from '../../services/progress-service';
import { supabase } from '../../lib/supabase';

interface DeckData {
  id: string;
  title: string;
  hskLevel?: number;
  totalCards: number;
  dueCards: number;
  isCustom: boolean;
}

export default function ReviewScreen() {
  const router = useRouter();
  const [hskDecks, setHskDecks] = useState<DeckData[]>([]);
  const [customDecks, setCustomDecks] = useState<DeckData[]>([]);
  const [loading, setLoading] = useState(true);

  // TODO: Get actual user ID from auth
  const userId = '00000000-0000-0000-0000-000000000001';

  // Reload data whenever the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadReviewData();
    }, [])
  );

  async function loadReviewData() {
    try {
      setLoading(true);

      // Load HSK decks
      const allVocab = await supabase
        .from('vocabulary')
        .select('hsk_level')
        .is('deck_id', null)
        .order('hsk_level');
      
      if (allVocab.data) {
        const availableHskLevels = [...new Set(allVocab.data.map(v => v.hsk_level))].sort();

        const hskDeckPromises = availableHskLevels.map(async (hskLevel) => {
          try {
            const vocabulary = await CurriculumService.getVocabularyByHSKLevel(hskLevel);
            const vocabularyIds = vocabulary.map(v => v.id);
            
            const flashcardProgress = await unifiedProgressService.getFlashcardProgressForVocabulary(vocabularyIds);
            const now = new Date();
            
            const existingVocabIds = new Set(flashcardProgress.map(f => f.vocabularyId));
            const newCards = vocabulary.filter(v => !existingVocabIds.has(v.id)).length;
            const dueReviewCards = flashcardProgress.filter(f => 
              new Date(f.nextReviewAt) <= now
            ).length;
            const totalDue = newCards + dueReviewCards;

            return {
              id: `hsk${hskLevel}`,
              title: `HSK ${hskLevel}`,
              hskLevel,
              totalCards: vocabulary.length,
              dueCards: totalDue,
              isCustom: false,
            };
          } catch (err) {
            console.error(`Error loading HSK ${hskLevel} deck:`, err);
            return null;
          }
        });

        const loadedHskDecks = (await Promise.all(hskDeckPromises))
          .filter(deck => deck !== null) as DeckData[];
        setHskDecks(loadedHskDecks);
      }

      // Load custom decks
      const { data: customDecksData } = await supabase
        .from('custom_decks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (customDecksData) {
        const customDeckPromises = customDecksData.map(async (deck) => {
          try {
            const { data: deckVocab } = await supabase
              .from('vocabulary')
              .select('*')
              .eq('deck_id', deck.id);

            if (!deckVocab || deckVocab.length === 0) {
              return {
                id: deck.id,
                title: deck.name,
                totalCards: 0,
                dueCards: 0,
                isCustom: true,
              };
            }

            const vocabularyIds = deckVocab.map(v => v.id);
            const flashcardProgress = await unifiedProgressService.getFlashcardProgressForVocabulary(vocabularyIds);
            
            const now = new Date();
            const existingVocabIds = new Set(flashcardProgress.map(f => f.vocabularyId));
            const newCards = deckVocab.filter(v => !existingVocabIds.has(v.id)).length;
            const dueReviewCards = flashcardProgress.filter(f => 
              new Date(f.nextReviewAt) <= now
            ).length;
            const totalDue = newCards + dueReviewCards;

            return {
              id: deck.id,
              title: deck.name,
              totalCards: deckVocab.length,
              dueCards: totalDue,
              isCustom: true,
            };
          } catch (err) {
            console.error(`Error loading custom deck ${deck.name}:`, err);
            return null;
          }
        });

        const loadedCustomDecks = (await Promise.all(customDeckPromises))
          .filter(deck => deck !== null) as DeckData[];
        setCustomDecks(loadedCustomDecks);
      }

    } catch (err) {
      console.error('Error loading review data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeckPress(deck: DeckData) {
    if (deck.isCustom) {
      // Navigate to custom deck detail (shows cards, allows review)
      router.push({
        pathname: '/review/deck',
        params: { deckId: deck.id }
      });
    } else {
      // Navigate to HSK level review session
      router.push({
        pathname: '/review/session',
        params: { hskLevel: deck.hskLevel }
      });
    }
  }

  async function handleAddDeck() {
    // Navigate to deck creation screen
    router.push('/review/add-deck');
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
            onPress={handleAddDeck}
          >
            <Text style={styles.addButtonText}>+ ADD DECK</Text>
          </TouchableOpacity>
        </View>

        {/* HSK Decks */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HSK DECKS</Text>
          
          {hskDecks.map((deck) => (
            <TouchableOpacity
              key={deck.id}
              style={styles.deckCard}
              activeOpacity={0.8}
              onPress={() => handleDeckPress(deck)}
            >
              <View style={styles.deckContent}>
                <Text style={styles.deckTitle}>{deck.title}</Text>
                
                <Text style={styles.deckMeta}>
                  {deck.totalCards} cards - {deck.dueCards} due today
                </Text>

                {deck.dueCards > 0 && (
                  <TouchableOpacity 
                    style={styles.reviewButton}
                    activeOpacity={0.8}
                    onPress={() => handleDeckPress(deck)}
                  >
                    <Text style={styles.reviewButtonText}>
                      REVIEW ({deck.dueCards})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom Decks */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MY DECKS</Text>
          
          {customDecks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No custom decks yet</Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={handleAddDeck}
              >
                <Text style={styles.emptyStateButtonText}>Create Your First Deck</Text>
              </TouchableOpacity>
            </View>
          ) : (
            customDecks.map((deck) => (
              <TouchableOpacity
                key={deck.id}
                style={styles.deckCard}
                activeOpacity={0.8}
                onPress={() => handleDeckPress(deck)}
              >
                <View style={styles.deckContent}>
                  <Text style={styles.deckTitle}>{deck.title}</Text>
                  
                  <Text style={styles.deckMeta}>
                    {deck.totalCards} cards - {deck.dueCards} due today
                  </Text>

                  {deck.dueCards > 0 && (
                    <TouchableOpacity 
                      style={styles.reviewButton}
                      activeOpacity={0.8}
                      onPress={() => handleDeckPress(deck)}
                    >
                      <Text style={styles.reviewButtonText}>
                        REVIEW ({deck.dueCards})
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
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
    fontFamily: 'ArchivoBlack_400Regular', 
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
  deckContent: {
    flex: 1,
  },
  deckTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  deckMeta: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  reviewButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borders.radius,
  },
  reviewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.black,
    letterSpacing: 0.5,
  },
  emptyState: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: borders.radius,
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  emptyStateButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borders.radius,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.black,
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: 15,
    color: colors.textSecondary,
  },
});