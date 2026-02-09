import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { colors, typography, spacing, borders, progressBar } from '../../constants/theme';
import { unifiedProgressService, UserProgress } from '../../services/progress-service';
import { ScenarioService, type Scenario } from '../../lib/scenarios-service';
import { supabase } from '@/lib/supabase';

type ScenarioWithLevel = Scenario & {
  level_number: number;
};

export default function HomeScreen() {
  const router = useRouter();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioWithLevel[]>([]);
  const [currentUnitTitle, setCurrentUnitTitle] = useState<string>('');

  // Load progress and scenarios when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        const userProgress = await unifiedProgressService.getProgress();
        setProgress(userProgress);

        // Load scenarios for Practice by Immersion
        try {
          const { data: scenariosData } = await supabase
            .from('scenarios')
            .select(`
              *,
              levels!inner (
                level_number
              )
            `)
            .order('order_index')
            .limit(3);

          if (scenariosData) {
            const scenariosWithLevels: ScenarioWithLevel[] = scenariosData.map((item: any) => ({
              ...item,
              level_number: item.levels.level_number,
            }));
            setScenarios(scenariosWithLevels);
          }
        } catch (err) {
          console.error('Error loading scenarios:', err);
        }

        // Get current unit title from database
        if (userProgress.currentLevel && userProgress.currentUnit) {
          try {
            const { data: unitData } = await supabase
              .from('units')
              .select('title')
              .eq('level_number', userProgress.currentLevel)
              .eq('unit_number', userProgress.currentUnit)
              .single();

            if (unitData) {
              setCurrentUnitTitle(unitData.title);
            }
          } catch (err) {
            console.error('Error loading unit title:', err);
          }
        }
      };
      loadData();
    }, [])
  );

  // Calculate overall HSK level progress
  const progressPercentage = progress 
    ? Math.min(Math.round((progress.completedLessons.length / 50) * 100), 100) 
    : 0;

  const currentUnit = progress && currentUnitTitle
    ? {
        title: currentUnitTitle,
        number: progress.currentUnit,
        total: 12,
        progress: Math.min(Math.round((progress.currentLesson / 10) * 100), 100),
      }
    : null;

  const handleCurrentUnit = () => {
    if (!progress) return;
    router.push({
      pathname: '/(tabs)/course/[id]' as any,
      params: {
        id: `hsk${progress.currentLevel}`,
        unit: progress.currentUnit,
        lesson: progress.currentLesson,
      },
    });
  };

  const handleScenario = (scenario: ScenarioWithLevel) => {
    router.push(`/scenario/${scenario.scenario_key}` as any);
  };

  const handleReviewNotes = () => {
    router.push({
      pathname: '/(tabs)/course/[id]' as any,
      params: {
        id: `hsk${progress?.currentLevel || 1}`,
      },
    });
  };

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
          <View style={{flexDirection: "row", justifyContent: "space-between", alignItems: "center"}}>
            <View>
              <Text style={styles.headerSubtitle}>
                MANDARIN · HSK {progress?.currentLevel || 1}
              </Text>
              <Text style={styles.headerTitle}>Progress</Text>
            </View>
            <Image 
              source={require('../../assets/images/langcat-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </View>


        {/* Main Progress */}
        <View style={styles.mainProgressSection}>
          <Text style={styles.progressPercentage}>{progressPercentage}%</Text>
          <Text style={styles.progressLabel}>HSK {progress?.currentLevel || 1}</Text>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${progressPercentage}%` }]}
              />
            </View>
          </View>
        </View>

        {/* Current Unit - Only show if user has started lessons */}
        {currentUnit && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CURRENT UNIT</Text>
            <TouchableOpacity 
              style={styles.unitCard} 
              activeOpacity={0.8}
              onPress={handleCurrentUnit}
            >
              <View style={styles.unitContent}>
                <Text style={styles.unitTitle}>{currentUnit.title}</Text>
                <Text style={styles.unitSubtitle}>
                  UNIT {currentUnit.number} of {currentUnit.total}
                </Text>
                <View style={styles.unitProgressContainer}>
                  <View style={styles.unitProgressBar}>
                    <LinearGradient
                      colors={[colors.primary, colors.primaryDark]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.unitProgressFill, { width: `${currentUnit.progress}%` }]}
                    />
                  </View>
                  <Text style={styles.unitProgressText}>{currentUnit.progress}%</Text>
                </View>
              </View>
              <View style={styles.arrowIcon}>
                <Text style={styles.arrowText}>--</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Practice by Immersion - Show actual scenarios */}
        {scenarios.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PRACTICE BY IMMERSION</Text>
            <View style={styles.practiceContainer}>
              {scenarios.map((scenario, index) => (
                <TouchableOpacity 
                  key={scenario.id} 
                  style={[
                    styles.practiceItem,
                    index < scenarios.length - 1 && styles.practiceItemWithBorder
                  ]}
                  activeOpacity={0.8}
                  onPress={() => handleScenario(scenario)}
                >
                  <Text style={styles.practiceItemText}>{scenario.title}</Text>
                  <View style={styles.arrowIcon}>
                    <Text style={styles.arrowText}>--</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Test Yourself - Commented out for now */}
        {/* 
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TEST YOURSELF</Text>
          <View style={styles.practiceContainer}>
            <TouchableOpacity style={styles.practiceItem} activeOpacity={0.8}>
              <Text style={styles.practiceItemText}>Assignment 1</Text>
              <View style={styles.arrowIcon}>
                <Text style={styles.arrowText}>Ã¢â€ â€™</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
        */}

        {/* Review Notes - References current HSK level */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>REVIEW YOUR NOTES</Text>
          <View style={styles.practiceContainer}>
            <TouchableOpacity 
              style={styles.practiceItem} 
              activeOpacity={0.8}
              onPress={handleReviewNotes}
            >
              <Text style={styles.practiceItemText}>
                HSK {progress?.currentLevel || 1} Vocabulary & Grammar
              </Text>
              <View style={styles.arrowIcon}>
                <Text style={styles.arrowText}>--</Text>
              </View>
            </TouchableOpacity>
          </View>
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
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerTitle: {
    fontSize: 38,
    fontFamily: 'ArchivoBlack_400Regular', 
    letterSpacing: 0.38,
    color: colors.text,
  },
  mainProgressSection: {
    marginBottom: spacing.xxxl,
  },
  logo: {
    width: 106,
    height: 106,
  },
  progressPercentage: {
    fontSize: 48,
    color: colors.text,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -1,
  },
  progressLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 8,
  },
  progressBarContainer: {
    position: 'relative',
  },
  progressBarBackground: {
    height: progressBar.main,
    backgroundColor: colors.progressBackground,
    borderRadius: borders.radius,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: borders.radius,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  practiceContainer: {
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: borders.radius,
    overflow: 'hidden',
  },
  unitCard: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: borders.radius,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unitContent: {
    flex: 1,
  },
  unitTitle: {
    ...typography.title,
    color: colors.text,
    marginBottom: 6,
  },
  unitSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  unitProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  unitProgressBar: {
    flex: 1,
    height: progressBar.unit,
    backgroundColor: colors.progressBackground,
    borderRadius: borders.radius,
    overflow: 'hidden',
  },
  unitProgressFill: {
    height: '100%',
    borderRadius: borders.radius,
  },
  unitProgressText: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  practiceItem: {
    backgroundColor: colors.backgroundElevated,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  practiceItemWithBorder: {
    borderBottomWidth: borders.width,
    borderBottomColor: colors.border,
  },
  practiceItemText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    marginRight: 16,
  },
  arrowIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 18,
    color: colors.text,
  },
});