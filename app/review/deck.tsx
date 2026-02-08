import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, borders } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { unifiedProgressService } from '../../services/progress-service';

interface DeckDetails {
  id: string;
  name: string;
  description: string | null;
  totalCards: number;
  dueCards: number;
}

interface VocabCard {
  id: string;
  simplified: string;
  pinyin: string;
  definition_en: string;
}

export default function DeckDetailScreen() {
  const router = useRouter();
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  
  const [deck, setDeck] = useState<DeckDetails | null>(null);
  const [cards, setCards] = useState<VocabCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  
  // Add card form state
  const [simplified, setSimplified] = useState('');
  const [traditional, setTraditional] = useState('');
  const [pinyin, setPinyin] = useState('');
  const [definition, setDefinition] = useState('');
  const [saving, setSaving] = useState(false);

  // TODO: Get actual user ID from auth
  const userId = '00000000-0000-0000-0000-000000000001';

  useFocusEffect(
    React.useCallback(() => {
      loadDeckData();
    }, [deckId])
  );

  async function loadDeckData() {
    try {
      setLoading(true);

      // Get deck details
      const { data: deckData, error: deckError } = await supabase
        .from('custom_decks')
        .select('*')
        .eq('id', deckId)
        .single();

      if (deckError) throw deckError;

      // Get cards in this deck
      const { data: cardsData, error: cardsError } = await supabase
        .from('vocabulary')
        .select('*')
        .eq('deck_id', deckId)
        .order('created_at', { ascending: false });

      if (cardsError) throw cardsError;

      setCards(cardsData || []);

      // Calculate due cards
      if (cardsData && cardsData.length > 0) {
        const vocabularyIds = cardsData.map(v => v.id);
        const flashcardProgress = await unifiedProgressService.getFlashcardProgressForVocabulary(vocabularyIds);
        
        const now = new Date();
        const existingVocabIds = new Set(flashcardProgress.map(f => f.vocabularyId));
        const newCards = cardsData.filter(v => !existingVocabIds.has(v.id)).length;
        const dueReviewCards = flashcardProgress.filter(f => 
          new Date(f.nextReviewAt) <= now
        ).length;
        const totalDue = newCards + dueReviewCards;

        setDeck({
          id: deckData.id,
          name: deckData.name,
          description: deckData.description,
          totalCards: cardsData.length,
          dueCards: totalDue,
        });
      } else {
        setDeck({
          id: deckData.id,
          name: deckData.name,
          description: deckData.description,
          totalCards: 0,
          dueCards: 0,
        });
      }

    } catch (err: any) {
      console.error('Error loading deck:', err);
      Alert.alert('Error', 'Failed to load deck: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCard() {
    if (!simplified || !pinyin || !definition) {
      Alert.alert('Missing Fields', 'Please fill in Chinese, Pinyin, and English definition');
      return;
    }

    try {
      setSaving(true);

      const { data, error } = await supabase
        .from('vocabulary')
        .insert({
          simplified,
          traditional: traditional || simplified,
          pinyin,
          definition_en: definition,
          part_of_speech: 'custom',
          hsk_level: 0,
          deck_id: deckId,
        })
        .select()
        .single();

      if (error) throw error;

      // Clear form
      setSimplified('');
      setTraditional('');
      setPinyin('');
      setDefinition('');
      setShowAddCard(false);

      // Reload deck data
      loadDeckData();

    } catch (err: any) {
      console.error('Error saving card:', err);
      Alert.alert('Error', 'Failed to save card: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStartReview() {
    if (!deck || deck.dueCards === 0) {
      Alert.alert('No Cards Due', 'There are no cards to review right now.');
      return;
    }

    router.push({
      pathname: '/review/session',
      params: { deckId: deckId }
    });
  }

  async function handleDeleteDeck() {
    Alert.alert(
      'Delete Deck',
      'Are you sure? This will delete the deck and all its cards.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('custom_decks')
                .delete()
                .eq('id', deckId);

              if (error) throw error;

              router.back();
            } catch (err: any) {
              Alert.alert('Error', 'Failed to delete deck: ' + err.message);
            }
          }
        }
      ]
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!deck) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.errorText}>Deck not found</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerCategory}>CUSTOM DECK</Text>
          <Text style={styles.headerTitle}>{deck.name}</Text>
        </View>
        <TouchableOpacity onPress={handleDeleteDeck} style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Deck Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.statsText}>
            {deck.totalCards} cards - {deck.dueCards} due today
          </Text>
          {deck.dueCards > 0 && (
            <TouchableOpacity 
              style={styles.reviewButton}
              onPress={handleStartReview}
            >
              <Text style={styles.reviewButtonText}>
                START REVIEW ({deck.dueCards})
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Add Card Section */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.addCardButton}
            onPress={() => setShowAddCard(!showAddCard)}
          >
            <Text style={styles.addCardButtonText}>
              {showAddCard ? '- CANCEL' : '+ ADD CARD'}
            </Text>
          </TouchableOpacity>

          {showAddCard && (
            <View style={styles.addCardForm}>
              <View style={styles.field}>
                <Text style={styles.label}>Chinese (Simplified) *</Text>
                <TextInput
                  style={styles.input}
                  value={simplified}
                  onChangeText={setSimplified}
                  placeholder="你好"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Chinese (Traditional)</Text>
                <TextInput
                  style={styles.input}
                  value={traditional}
                  onChangeText={setTraditional}
                  placeholder="你好"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Pinyin *</Text>
                <TextInput
                  style={styles.input}
                  value={pinyin}
                  onChangeText={setPinyin}
                  placeholder="nǐ hǎo"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>English Definition *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={definition}
                  onChangeText={setDefinition}
                  placeholder="hello"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity 
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleAddCard}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'SAVING...' : 'SAVE CARD'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Cards List */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CARDS ({cards.length})</Text>
          
          {cards.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No cards yet</Text>
              <Text style={styles.emptyStateSubtext}>Add your first card to get started</Text>
            </View>
          ) : (
            cards.map((card) => (
              <View key={card.id} style={styles.cardItem}>
                <Text style={styles.cardChinese}>{card.simplified}</Text>
                <Text style={styles.cardPinyin}>{card.pinyin}</Text>
                <Text style={styles.cardDefinition}>{card.definition_en}</Text>
              </View>
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
  deleteButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B4545',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
  },
  statsCard: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: borders.radius,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  statsText: {
    fontSize: 15,
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
  section: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: spacing.lg,
  },
  addCardButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borders.radius,
    marginBottom: spacing.lg,
  },
  addCardButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.black,
    letterSpacing: 0.5,
  },
  addCardForm: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: borders.radius,
    padding: spacing.xl,
  },
  field: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: borders.radius,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borders.radius,
    marginTop: spacing.md,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.black,
  },
  cardItem: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: borders.radius,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardChinese: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  cardPinyin: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  cardDefinition: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.text,
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
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emptyStateSubtext: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textMuted,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4545',
    marginBottom: spacing.xl,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borders.radius,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.black,
  },
});