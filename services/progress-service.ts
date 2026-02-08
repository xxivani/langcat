import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

// Storage keys for AsyncStorage
const STORAGE_KEYS = {
  ANONYMOUS_USER_ID: 'anonymous_user_id',
  CURRENT_LEVEL: 'current_level',
  CURRENT_UNIT: 'current_unit',
  CURRENT_LESSON: 'current_lesson',
  COMPLETED_LESSONS: 'completed_lessons',
  REVIEW_DUE: 'review_due',
  STREAK: 'streak',
  LAST_STUDY_DATE: 'last_study_date',
  TOTAL_WORDS_LEARNED: 'total_words_learned',
  FLASHCARD_PROGRESS: 'flashcard_progress', // Store flashcard data locally
};

export interface UserProgress {
  currentLevel: number;
  currentUnit: number;
  currentLesson: number;
  completedLessons: string[]; // Array of "level_unit_lesson" IDs
  reviewDue: number;
  streak: number;
  lastStudyDate: string | null;
  totalWordsLearned: number;
}

export interface FlashcardStats {
  total: number;
  due: number;
  mature: number;
  new: number;
}

export interface LocalFlashcardProgress {
  vocabularyId: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lastReviewedAt: string;
  nextReviewAt: string;
}

/**
 * Unified Progress Service for Anonymous Users
 * Handles all progress tracking using AsyncStorage
 */
class UnifiedProgressService {
  private anonymousUserId: string | null = null;

  /**
   * Get or create anonymous user ID
   */
  async getAnonymousUserId(): Promise<string> {
    if (this.anonymousUserId) {
      return this.anonymousUserId;
    }

    try {
      let userId = await AsyncStorage.getItem(STORAGE_KEYS.ANONYMOUS_USER_ID);
      
      if (!userId) {
        // Generate a simple unique ID for this anonymous user
        userId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem(STORAGE_KEYS.ANONYMOUS_USER_ID, userId);
      }

      this.anonymousUserId = userId;
      return userId;
    } catch (error) {
      console.error('Failed to get anonymous user ID:', error);
      // Fallback ID
      return `anon_${Date.now()}`;
    }
  }

  /**
   * Get current user progress
   */
  async getProgress(): Promise<UserProgress> {
    try {
      const [
        currentLevel,
        currentUnit,
        currentLesson,
        completedLessons,
        reviewDue,
        streak,
        lastStudyDate,
        totalWordsLearned,
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.CURRENT_LEVEL),
        AsyncStorage.getItem(STORAGE_KEYS.CURRENT_UNIT),
        AsyncStorage.getItem(STORAGE_KEYS.CURRENT_LESSON),
        AsyncStorage.getItem(STORAGE_KEYS.COMPLETED_LESSONS),
        AsyncStorage.getItem(STORAGE_KEYS.REVIEW_DUE),
        AsyncStorage.getItem(STORAGE_KEYS.STREAK),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_STUDY_DATE),
        AsyncStorage.getItem(STORAGE_KEYS.TOTAL_WORDS_LEARNED),
      ]);

      return {
        currentLevel: currentLevel ? parseInt(currentLevel, 10) : 1,
        currentUnit: currentUnit ? parseInt(currentUnit, 10) : 1,
        currentLesson: currentLesson ? parseInt(currentLesson, 10) : 1,
        completedLessons: completedLessons ? JSON.parse(completedLessons) : [],
        reviewDue: reviewDue ? parseInt(reviewDue, 10) : 0,
        streak: streak ? parseInt(streak, 10) : 0,
        lastStudyDate,
        totalWordsLearned: totalWordsLearned ? parseInt(totalWordsLearned, 10) : 0,
      };
    } catch (error) {
      console.error('Failed to get progress:', error);
      return this.getDefaultProgress();
    }
  }

  /**
   * Update current lesson position
   */
  async updateCurrentLesson(level: number, unit: number, lesson: number): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.CURRENT_LEVEL, level.toString()),
        AsyncStorage.setItem(STORAGE_KEYS.CURRENT_UNIT, unit.toString()),
        AsyncStorage.setItem(STORAGE_KEYS.CURRENT_LESSON, lesson.toString()),
      ]);
    } catch (error) {
      console.error('Failed to update current lesson:', error);
    }
  }

  /**
   * Mark a lesson as completed
   */
  async completeLesson(level: number, unit: number, lesson: number): Promise<void> {
    try {
      const progress = await this.getProgress();
      const lessonId = `${level}_${unit}_${lesson}`;

      if (!progress.completedLessons.includes(lessonId)) {
        progress.completedLessons.push(lessonId);
        await AsyncStorage.setItem(
          STORAGE_KEYS.COMPLETED_LESSONS,
          JSON.stringify(progress.completedLessons)
        );
      }

      // Update streak
      await this.updateStreak();
    } catch (error) {
      console.error('Failed to complete lesson:', error);
    }
  }

  /**
   * Check if lesson is completed
   */
  async isLessonCompleted(level: number, unit: number, lesson: number): Promise<boolean> {
    const progress = await this.getProgress();
    const lessonId = `${level}_${unit}_${lesson}`;
    return progress.completedLessons.includes(lessonId);
  }

  /**
   * Update review count
   */
  async updateReviewDue(count: number): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.REVIEW_DUE, count.toString());
    } catch (error) {
      console.error('Failed to update review count:', error);
    }
  }

  /**
   * Update words learned count
   */
  async addWordsLearned(count: number): Promise<void> {
    try {
      const progress = await this.getProgress();
      const newTotal = progress.totalWordsLearned + count;
      await AsyncStorage.setItem(STORAGE_KEYS.TOTAL_WORDS_LEARNED, newTotal.toString());
    } catch (error) {
      console.error('Failed to update words learned:', error);
    }
  }

  /**
   * Update streak (call daily)
   */
  async updateStreak(): Promise<void> {
    try {
      const progress = await this.getProgress();
      const today = new Date().toISOString().split('T')[0];
      const lastStudy = progress.lastStudyDate;

      if (!lastStudy) {
        // First time studying
        await Promise.all([
          AsyncStorage.setItem(STORAGE_KEYS.STREAK, '1'),
          AsyncStorage.setItem(STORAGE_KEYS.LAST_STUDY_DATE, today),
        ]);
        return;
      }

      const lastDate = new Date(lastStudy);
      const todayDate = new Date(today);
      const diffDays = Math.floor(
        (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 0) {
        // Same day, no change
        return;
      } else if (diffDays === 1) {
        // Consecutive day, increment
        await Promise.all([
          AsyncStorage.setItem(STORAGE_KEYS.STREAK, (progress.streak + 1).toString()),
          AsyncStorage.setItem(STORAGE_KEYS.LAST_STUDY_DATE, today),
        ]);
      } else {
        // Streak broken, reset to 1
        await Promise.all([
          AsyncStorage.setItem(STORAGE_KEYS.STREAK, '1'),
          AsyncStorage.setItem(STORAGE_KEYS.LAST_STUDY_DATE, today),
        ]);
      }
    } catch (error) {
      console.error('Failed to update streak:', error);
    }
  }

  // ==================== FLASHCARD METHODS ====================

  /**
   * Get all flashcard progress from AsyncStorage
   */
  private async getAllFlashcardProgress(): Promise<Map<string, LocalFlashcardProgress>> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.FLASHCARD_PROGRESS);
      if (!data) return new Map();

      const parsed = JSON.parse(data);
      return new Map(Object.entries(parsed));
    } catch (error) {
      console.error('Failed to get flashcard progress:', error);
      return new Map();
    }
  }

  /**
   * Save flashcard progress to AsyncStorage
   */
  private async saveFlashcardProgress(progress: Map<string, LocalFlashcardProgress>): Promise<void> {
    try {
      const obj = Object.fromEntries(progress);
      await AsyncStorage.setItem(STORAGE_KEYS.FLASHCARD_PROGRESS, JSON.stringify(obj));
    } catch (error) {
      console.error('Failed to save flashcard progress:', error);
    }
  }

  /**
   * Get flashcard progress for a specific vocabulary ID
   */
  async getFlashcardProgress(vocabularyId: string): Promise<LocalFlashcardProgress | null> {
    const allProgress = await this.getAllFlashcardProgress();
    return allProgress.get(vocabularyId) || null;
  }

  /**
   * Update flashcard after review (SM-2 algorithm)
   */
  async updateFlashcard(vocabularyId: string, quality: number): Promise<void> {
    try {
      const allProgress = await this.getAllFlashcardProgress();
      const current = allProgress.get(vocabularyId);

      let easeFactor = current?.easeFactor || 2.5;
      let repetitions = current?.repetitions || 0;
      let intervalDays = current?.intervalDays || 0;

      // SM-2 algorithm
      easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
      easeFactor = Math.max(1.3, easeFactor);

      if (quality < 3) {
        repetitions = 0;
        intervalDays = 1;
      } else {
        repetitions += 1;
        if (repetitions === 1) {
          intervalDays = 1;
        } else if (repetitions === 2) {
          intervalDays = 6;
        } else {
          intervalDays = Math.round(intervalDays * easeFactor);
        }
      }

      const now = new Date();
      const nextReview = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

      allProgress.set(vocabularyId, {
        vocabularyId,
        easeFactor,
        intervalDays,
        repetitions,
        lastReviewedAt: now.toISOString(),
        nextReviewAt: nextReview.toISOString(),
      });

      await this.saveFlashcardProgress(allProgress);

      // Update due count
      await this.recalculateDueCount();
    } catch (error) {
      console.error('Failed to update flashcard:', error);
    }
  }

  /**
   * Initialize flashcards for vocabulary IDs
   */
  async initializeFlashcards(vocabularyIds: string[]): Promise<void> {
    try {
      const allProgress = await this.getAllFlashcardProgress();
      const now = new Date().toISOString();

      for (const vocabId of vocabularyIds) {
        if (!allProgress.has(vocabId)) {
          allProgress.set(vocabId, {
            vocabularyId: vocabId,
            easeFactor: 2.5,
            intervalDays: 0,
            repetitions: 0,
            lastReviewedAt: now,
            nextReviewAt: now, // Due immediately
          });
        }
      }

      await this.saveFlashcardProgress(allProgress);
      await this.recalculateDueCount();
    } catch (error) {
      console.error('Failed to initialize flashcards:', error);
    }
  }

  /**
   * Get flashcard statistics
   */
  async getFlashcardStats(): Promise<FlashcardStats> {
    try {
      const allProgress = await this.getAllFlashcardProgress();
      const now = new Date();

      const progressArray = Array.from(allProgress.values());
      const total = progressArray.length;
      const due = progressArray.filter(f => new Date(f.nextReviewAt) <= now).length;
      const mature = progressArray.filter(f => f.repetitions >= 3).length;

      return {
        total,
        due,
        mature,
        new: total - mature,
      };
    } catch (error) {
      console.error('Failed to get flashcard stats:', error);
      return { total: 0, due: 0, mature: 0, new: 0 };
    }
  }

  /**
   * Get flashcard progress for multiple vocabulary IDs (for deck display)
   */
  async getFlashcardProgressForVocabulary(vocabularyIds: string[]): Promise<LocalFlashcardProgress[]> {
    try {
      const allProgress = await this.getAllFlashcardProgress();
      return vocabularyIds
        .map(id => allProgress.get(id))
        .filter((p): p is LocalFlashcardProgress => p !== undefined);
    } catch (error) {
      console.error('Failed to get flashcard progress for vocabulary:', error);
      return [];
    }
  }

  /**
   * Recalculate and update the due count
   */
  private async recalculateDueCount(): Promise<void> {
    const stats = await this.getFlashcardStats();
    await this.updateReviewDue(stats.due);
  }

  /**
   * Reset all progress (for testing or reset feature)
   */
  async resetProgress(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
      this.anonymousUserId = null;
    } catch (error) {
      console.error('Failed to reset progress:', error);
    }
  }

  private getDefaultProgress(): UserProgress {
    return {
      currentLevel: 1,
      currentUnit: 1,
      currentLesson: 1,
      completedLessons: [],
      reviewDue: 0,
      streak: 0,
      lastStudyDate: null,
      totalWordsLearned: 0,
    };
  }
}

export const unifiedProgressService = new UnifiedProgressService();