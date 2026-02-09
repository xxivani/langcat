import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Image
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { colors, spacing, borders } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

interface Scenario {
  id: string;
  scenario_key: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
}

export default function LessonPracticeScreen() {
  const router = useRouter();
  const { lessonId, vocabularyCount } = useLocalSearchParams<{ lessonId: string; vocabularyCount: string }>();
  
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScenarios();
  }, []);

  async function loadScenarios() {
    try {
      setLoading(true);

      // Get scenarios from database
      const { data, error } = await supabase
        .from('scenarios')
        .select('*')
        .order('order_index')
        .limit(5);

      if (error) throw error;

      setScenarios(data || []);
    } catch (err) {
      console.error('Error loading scenarios:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSkip() {
    router.back();
    router.back(); // Go back to course screen
  }

  function handleScenarioSelect(scenarioKey: string) {
    router.push(`/scenario/${scenarioKey}` as any);
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, styles.centerContent]}>
          <StatusBar barStyle="light-content" />
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.celebrationBadge}>
            <Image
                source={require('@/assets/icons/icons8-complete-64.png')}
                style={{ width: 100, height: 100, tintColor: colors.primary }}
            />
            </View>
            <Text style={styles.headerTitle}>Lesson Complete!</Text>
            <Text style={styles.headerSubtitle}>
              You learned {vocabularyCount} new words
            </Text>
          </View>

          {/* Practice Prompt */}
          <View style={styles.promptSection}>
            <Text style={styles.promptTitle}>Want to practice?</Text>
            <Text style={styles.promptText}>
              Try using these words in a real conversation scenario
            </Text>
          </View>

          {/* Scenario Options */}
          <View style={styles.scenariosSection}>
            <Text style={styles.sectionLabel}>CHOOSE A SCENARIO</Text>
            
            {scenarios.map((scenario) => (
              <TouchableOpacity
                key={scenario.id}
                style={styles.scenarioCard}
                activeOpacity={0.8}
                onPress={() => handleScenarioSelect(scenario.scenario_key)}
              >
                <View style={styles.scenarioContent}>
                  <Text style={styles.scenarioTitle}>{scenario.title}</Text>
                  <Text style={styles.scenarioDescription}>
                    {scenario.description}
                  </Text>
                  <View style={styles.scenarioMeta}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>{scenario.category}</Text>
                    </View>
                    <View style={[
                      styles.difficultyBadge,
                      scenario.difficulty === 'beginner' && styles.difficultyBeginner,
                      scenario.difficulty === 'intermediate' && styles.difficultyIntermediate,
                      scenario.difficulty === 'advanced' && styles.difficultyAdvanced,
                    ]}>
                      <Text style={styles.difficultyText}>
                        {scenario.difficulty.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.arrowIcon}>→</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Skip Button */}
          <TouchableOpacity 
            style={styles.skipButton}
            onPress={handleSkip}
          >
            <Text style={styles.skipButtonText}>Skip for Now</Text>
          </TouchableOpacity>

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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 80,
    paddingHorizontal: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  celebrationBadge: {
    width: 80,
    height: 80,
    backgroundColor: colors.backgroundElevated,
    borderRadius: 40,
    borderWidth: borders.width * 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  celebrationEmoji: {
    fontSize: 40,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  promptSection: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: borders.radius * 2,
    padding: spacing.xxl,
    marginBottom: spacing.xxl,
    alignItems: 'center',
  },
  promptTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  promptText: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  scenariosSection: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: spacing.lg,
  },
  scenarioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundElevated,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: borders.radius,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  scenarioContent: {
    flex: 1,
  },
  scenarioTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  scenarioDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  scenarioMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  categoryBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borders.radius,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  difficultyBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borders.radius,
  },
  difficultyBeginner: {
    backgroundColor: 'rgba(69, 139, 117, 0.2)',
  },
  difficultyIntermediate: {
    backgroundColor: 'rgba(139, 117, 69, 0.2)',
  },
  difficultyAdvanced: {
    backgroundColor: 'rgba(139, 69, 69, 0.2)',
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 0.5,
  },
  arrowIcon: {
    fontSize: 24,
    color: colors.textMuted,
    marginLeft: spacing.md,
  },
  skipButton: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: borders.width,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderRadius: borders.radius,
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});