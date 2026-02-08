import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { CheckmarkIcon } from '@/components/CheckmarkIcon';
import { colors, typography, spacing, borders } from '../../constants/theme';
import { CurriculumService } from '../../lib/database';
import { unifiedProgressService } from '../../services/progress-service';
import type { Level, Unit, Lesson } from '../../lib/supabase';

interface LessonWithProgress extends Lesson {
  vocabularyCount?: number;
  progress?: number;
}

interface UnitWithLessons extends Unit {
  lessons: LessonWithProgress[];
}

interface LevelWithUnits extends Level {
  units: UnitWithLessons[];
}

export default function CourseStructureScreen() {
  const router = useRouter();
  const [expandedLevels, setExpandedLevels] = useState<string[]>([]);
  const [expandedUnits, setExpandedUnits] = useState<string[]>([]);
  const [levels, setLevels] = useState<LevelWithUnits[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // TODO: Replace with actual course ID from your database
  const courseId = '00000000-0000-0000-0000-000000000001';

  useFocusEffect(
    React.useCallback(() => {
      loadCourseStructure();
    }, [])
  );

  async function loadCourseStructure() {
    try {
      setLoading(true);
      setError(null);

      // Get user progress
      const userProgress = await unifiedProgressService.getProgress();

      // Fetch all levels (HSK 1, 2, 3, etc.)
      const levelsData = await CurriculumService.getLevels(courseId);
      
      // Fetch units and lessons for each level
      const levelsWithUnits = await Promise.all(
        levelsData.map(async (level) => {
          const units = await CurriculumService.getUnits(level.id);
          
          const unitsWithLessons = await Promise.all(
            units.map(async (unit) => {
              const lessons = await CurriculumService.getLessons(unit.id);
              
              const lessonsWithProgress = await Promise.all(
                lessons.map(async (lesson) => {
                  const vocab = await CurriculumService.getVocabulary(lesson.id);
                  
                  // Check if lesson is completed
                  const isCompleted = await unifiedProgressService.isLessonCompleted(
                    level.level_number,
                    unit.unit_number,
                    lesson.lesson_number
                  );

                  return {
                    ...lesson,
                    vocabularyCount: vocab.length,
                    progress: isCompleted ? 100 : 0,
                  };
                })
              );

              return {
                ...unit,
                lessons: lessonsWithProgress,
              };
            })
          );

          return {
            ...level,
            units: unitsWithLessons,
          };
        })
      );

      setLevels(levelsWithUnits);
      
      // Auto-expand first level and first unit
      if (levelsWithUnits.length > 0) {
        setExpandedLevels([levelsWithUnits[0].id]);
        if (levelsWithUnits[0].units.length > 0) {
          setExpandedUnits([levelsWithUnits[0].units[0].id]);
        }
      }

    } catch (err: any) {
      console.error('Error loading course structure:', err);
      setError(err.message || 'Failed to load course structure');
    } finally {
      setLoading(false);
    }
  }

  const toggleLevel = (levelId: string) => {
    setExpandedLevels((prev) =>
      prev.includes(levelId)
        ? prev.filter((id) => id !== levelId)
        : [...prev, levelId]
    );
  };

  const toggleUnit = (unitId: string) => {
    setExpandedUnits((prev) =>
      prev.includes(unitId)
        ? prev.filter((id) => id !== unitId)
        : [...prev, unitId]
    );
  };

  const navigateToLesson = (lessonId: string) => {
    router.push(`/lesson/${lessonId}`);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading courses...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadCourseStructure}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (levels.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.errorText}>No courses found</Text>
        <Text style={styles.errorHint}>
          Make sure you&aposve run all SQL files in Supabase
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadCourseStructure}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
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
          <Text style={styles.headerSubtitle}>MANDARIN CHINESE</Text>
          <Text style={styles.headerTitle}>Course</Text>
        </View>

        {/* Levels */}
        <View style={styles.courseSection}>
          {levels.map((level) => {
            const isLevelExpanded = expandedLevels.includes(level.id);
            
            return (
              <View key={level.id} style={styles.levelCard}>
                {/* Level Header */}
                <TouchableOpacity
                  style={styles.levelHeader}
                  onPress={() => toggleLevel(level.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.levelInfo}>
                    <Text style={styles.levelTitle}>{level.name}</Text>
                    <Text style={styles.levelMeta}>
                      {level.total_units} units · {level.total_vocabulary} words · {level.estimated_weeks} weeks
                    </Text>
                  </View>
                  <Image
                    source={require('@/assets/icons/icons8-chevron-up-10.png')}
                    style={[
                      styles.chevronIcon,
                      !isLevelExpanded && styles.chevronIconDown
                    ]}
                  />
                </TouchableOpacity>

                {/* Units */}
                {isLevelExpanded && (
                  <View style={styles.unitsContainer}>
                    {level.units.map((unit) => {
                      const isUnitExpanded = expandedUnits.includes(unit.id);
                      
                      return (
                        <View key={unit.id} style={styles.unitCard}>
                          <TouchableOpacity
                            style={styles.unitHeader}
                            onPress={() => toggleUnit(unit.id)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.unitInfo}>
                              <Text style={styles.unitTitle}>
                                Unit {unit.unit_number}: {unit.title}
                              </Text>
                              <Text style={styles.unitMeta}>
                                {unit.lessons.length} lessons · {unit.theme}
                              </Text>
                            </View>
                            <View style={styles.unitIcons}>
                              <CheckmarkIcon size={24} color="#fee698" />
                              <Image
                                source={require('@/assets/icons/icons8-chevron-up-10.png')}
                                style={[
                                  styles.chevronIconSmall,
                                  !isUnitExpanded && styles.chevronIconDown
                                ]}
                              />
                            </View>
                          </TouchableOpacity>

                          {/* Lessons */}
                          {isUnitExpanded && (
                            <View style={styles.lessonsContainer}>
                              {unit.lessons.map((lesson) => (
                                <TouchableOpacity
                                  key={lesson.id}
                                  style={styles.lessonRow}
                                  onPress={() => navigateToLesson(lesson.id)}
                                  activeOpacity={0.7}
                                >
                                  <View style={styles.lessonContent}>
                                    <Text style={styles.lessonTitle}>
                                      L{lesson.lesson_number}  {lesson.title}
                                    </Text>
                                    <Text style={styles.lessonMeta}>
                                      {lesson.vocabularyCount || 0} words · {lesson.estimated_minutes} min
                                      {lesson.progress && lesson.progress > 0 ? ` · ${lesson.progress}%` : ''}
                                    </Text>
                                  </View>
                                  <View style={styles.lessonIcon}>
                                    {lesson.progress && lesson.progress === 100 ? (
                                      <CheckmarkIcon size={20} color="#fee698" />
                                    ) : (
                                      <View style={styles.emptyCircle} />
                                    )}
                                  </View>
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
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
  },
  courseSection: {
    marginBottom: spacing.xxl,
  },
  levelCard: {
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: borders.radius,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.xl,
    backgroundColor: colors.backgroundElevated,
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  levelMeta: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  chevronIcon: {
    width: 18,
    height: 18,
    tintColor: colors.text,
  },
  chevronIconSmall: {
    width: 14,
    height: 14,
    tintColor: colors.text,
  },
  chevronIconDown: {
    transform: [{ rotate: '180deg' }],
  },
  unitsContainer: {
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  unitCard: {
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: borders.radius,
    overflow: 'hidden',
  },
  unitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  unitInfo: {
    flex: 1,
  },
  unitTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  unitMeta: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  unitIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  lessonsContainer: {
    backgroundColor: colors.background,
    borderTopWidth: borders.width,
    borderTopColor: colors.border,
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: borders.width,
    borderBottomColor: colors.border,
  },
  lessonContent: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  lessonMeta: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  lessonIcon: {
    marginLeft: spacing.md,
  },
  emptyCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
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