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
import { useRouter, useFocusEffect } from 'expo-router';
import { colors, typography, spacing, borders } from '../../constants/theme';
import { ScenarioService, type Scenario } from '../../lib/scenarios-service';
import { supabase } from '../../lib/supabase';

type ScenarioWithLevel = Scenario & {
  level_number: number;
};

export default function ChatScreen() {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<ScenarioWithLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load scenarios on mount
  useEffect(() => {
    loadAllScenariosOptimized();
  }, []);

  // Prefetch on focus (for smooth navigation)
  useFocusEffect(
    React.useCallback(() => {
      // Prefetch scenarios in background if needed
      if (!scenarios.length) {
        loadAllScenariosOptimized();
      }
    }, [scenarios.length])
  );

  async function loadAllScenariosOptimized() {
    try {
      setLoading(true);
      setError(null);

      // Parallel fetch: scenarios + levels in single query
      const { data: scenariosData, error: scenariosError } = await supabase
        .from('scenarios')
        .select(`
          *,
          levels!inner (
            level_number
          )
        `)
        .order('order_index');

      if (scenariosError) throw scenariosError;

      // Transform data
      const scenariosWithLevels: ScenarioWithLevel[] = scenariosData.map((item: any) => ({
        id: item.id,
        level_id: item.level_id,
        scenario_key: item.scenario_key,
        title: item.title,
        description: item.description,
        category: item.category,
        difficulty: item.difficulty,
        estimated_duration: item.estimated_duration,
        system_prompt: item.system_prompt,
        initial_message: item.initial_message,
        vocabulary_focus: item.vocabulary_focus,
        grammar_points: item.grammar_points,
        order_index: item.order_index,
        level_number: item.levels.level_number,
      }));

      // Sort by level, then by order_index
      scenariosWithLevels.sort((a, b) => {
        if (a.level_number !== b.level_number) {
          return a.level_number - b.level_number;
        }
        return a.order_index - b.order_index;
      });

      setScenarios(scenariosWithLevels);

    } catch (err: any) {
      console.error('Error loading scenarios:', err);
      setError(err.message || 'Failed to load scenarios');
    } finally {
      setLoading(false);
    }
  }

  const handleScenarioPress = (scenario: Scenario) => {
    router.push(`/scenario/${scenario.scenario_key}` as any);
  };

  const handleFreeChatPress = () => {
    router.push('/chat/free' as any);
  };

  // Show cached data immediately if available
  if (loading && scenarios.length > 0) {
    // Data is loading but we have cached data - show it
    return renderContent();
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading scenarios...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.errorHint}>
          Make sure you've run the scenarios SQL in Supabase
        </Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={loadAllScenariosOptimized}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return renderContent();

  function renderContent() {
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
            <Text style={styles.headerSubtitle}>PRACTICE SPEAKING</Text>
            <Text style={styles.headerTitle}>Practice</Text>
            <Text style={styles.headerDescription}>Select a scenario or chat freely</Text>
          </View>

          {/* Free Chat Card */}
          <TouchableOpacity 
            style={styles.freeChatCard}
            activeOpacity={0.8}
            onPress={handleFreeChatPress}
          >
            <Text style={styles.freeChatTitle}>Free Chat with LangCat</Text>
            <Text style={styles.freeChatDescription}>
              Talk about anything in Chinese. Practice casual conversation about your day, interests, or any topic.
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <Text style={styles.dividerText}>OR CHOOSE A SCENARIO</Text>
          </View>

          {/* Scenario Cards */}
          {scenarios.length > 0 ? (
            <View style={styles.scenariosContainer}>
              {scenarios.map((scenario) => (
                <TouchableOpacity
                  key={scenario.id}
                  style={styles.scenarioCard}
                  activeOpacity={0.8}
                  onPress={() => handleScenarioPress(scenario)}
                >
                  <View style={styles.scenarioHeader}>
                    <Text style={styles.scenarioTitle}>{scenario.title}</Text>
                    <View style={styles.levelBadge}>
                      <Text style={styles.levelText}>HSK {scenario.level_number}</Text>
                    </View>
                  </View>
                  <Text style={styles.scenarioDescription}>{scenario.description}</Text>
                  <Text style={styles.scenarioMeta}>
                    {scenario.category} · {scenario.estimated_duration}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No scenarios available yet.
              </Text>
              <TouchableOpacity 
                style={styles.tryFreeChatButton}
                onPress={handleFreeChatPress}
              >
                <Text style={styles.tryFreeChatText}>Try Free Chat Instead</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    );
  }
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: spacing.xl,
  },
  header: {
    marginBottom: spacing.xxl,
  },
  headerSubtitle: {
    ...typography.headerSmall,
    color: colors.text,
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 38,
    fontFamily: 'ArchivoBlack_400Regular', 
    letterSpacing: 0.38,
    color: colors.text,
    marginBottom: spacing.md,
  },
  headerDescription: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  freeChatCard: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: borders.radius,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  freeChatTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  freeChatDescription: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 22,
  },
  divider: {
    alignItems: 'center',
    marginVertical: spacing.xxl,
  },
  dividerText: {
    ...typography.label,
    color: colors.textSecondary,
  },
  scenariosContainer: {
    gap: spacing.md,
  },
  scenarioCard: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: borders.radius,
    padding: spacing.xl,
    marginBottom: spacing.md,
  },
  scenarioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  scenarioTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: spacing.md,
  },
  levelBadge: {
    backgroundColor: 'rgba(58, 55, 50, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borders.radius,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  scenarioDescription: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 22,
  },
  scenarioMeta: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyStateText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  tryFreeChatButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borders.radius,
  },
  tryFreeChatText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.black,
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
});