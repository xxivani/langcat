import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, borders } from '../../constants/theme';

export default function ChatScreen() {
  const router = useRouter();

  const scenarios = [
    {
      id: 'restaurant',
      title: 'Ordering at a Restaurant',
      description: 'Practice ordering food and asking about menu items',
      category: 'Food & Dining',
      duration: '5-10 min',
      difficulty: 'BEGINNER',
    },
    {
      id: 'directions',
      title: 'Asking for Directions',
      description: 'Learn how to navigate and find locations',
      category: 'Travel',
      duration: '5-8 min',
      difficulty: 'BEGINNER',
    },
    {
      id: 'market',
      title: 'Shopping at a Market',
      description: 'Negotiate prices and make purchases',
      category: 'Shopping',
      duration: '8-12 min',
      difficulty: 'INTERMEDIATE',
    },
    {
      id: 'smalltalk',
      title: 'Making Small Talk',
      description: 'Casual conversation with a new friend',
      category: 'Social',
      duration: '5-10 min',
      difficulty: 'BEGINNER',
    },
  ];

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
          onPress={() => router.push('/chat/free')}
        >
          <Text style={styles.freeChatTitle}>Free Chat with langcat</Text>
          <Text style={styles.freeChatDescription}>
            Talk about anything in Spanish. Practice casual conversation about your day, interests, or any topic.
          </Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <Text style={styles.dividerText}>OR CHOOSE A SCENARIO</Text>
        </View>

        {/* Scenario Cards */}
        <View style={styles.scenariosContainer}>
          {scenarios.map((scenario) => (
            <TouchableOpacity
              key={scenario.id}
              style={styles.scenarioCard}
              activeOpacity={0.8}
              onPress={() => router.push(`/scenario/${scenario.id}`)}
            >
              <View style={styles.scenarioHeader}>
                <Text style={styles.scenarioTitle}>{scenario.title}</Text>
                <View style={styles.difficultyBadge}>
                  <Text style={styles.difficultyText}>{scenario.difficulty}</Text>
                </View>
              </View>
              <Text style={styles.scenarioDescription}>{scenario.description}</Text>
              <Text style={styles.scenarioMeta}>
                {scenario.category} · {scenario.duration}
              </Text>
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
    fontWeight: '700',
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
  difficultyBadge: {
    backgroundColor: 'rgba(58, 55, 50, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borders.radius,
  },
  difficultyText: {
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
});