import { supabase, Level, Unit, Lesson, Vocabulary, UserProgress, FlashcardProgress } from './supabase';

/**
 * Curriculum Data Service
 * Handles all database operations for course structure and vocabulary
 */
export class CurriculumService {
  /**
   * Get all levels for a course
   */
  static async getLevels(courseId: string) {
    const { data, error } = await supabase
      .from('levels')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index');

    if (error) throw error;
    return data as Level[];
  }

  /**
   * Get a specific level with all its units
   */
  static async getLevelWithUnits(levelId: string) {
    const { data, error } = await supabase
      .from('levels')
      .select(`
        *,
        units (*)
      `)
      .eq('id', levelId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get all units for a level
   */
  static async getUnits(levelId: string) {
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('level_id', levelId)
      .order('order_index');

    if (error) throw error;
    return data as Unit[];
  }

  /**
   * Get a unit with all its lessons
   */
  static async getUnitWithLessons(unitId: string) {
    const { data, error } = await supabase
      .from('units')
      .select(`
        *,
        lessons (*)
      `)
      .eq('id', unitId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get all lessons for a unit
   */
  static async getLessons(unitId: string) {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('unit_id', unitId)
      .order('order_index');

    if (error) throw error;
    return data as Lesson[];
  }

  /**
   * Get a lesson with all its vocabulary
   */
  static async getLessonWithVocabulary(lessonId: string) {
    const { data, error } = await supabase
      .from('lessons')
      .select(`
        *,
        vocabulary (*)
      `)
      .eq('id', lessonId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get all vocabulary for a lesson
   */
  static async getVocabulary(lessonId: string) {
    const { data, error } = await supabase
      .from('vocabulary')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('word_order');

    if (error) throw error;
    return data as Vocabulary[];
  }

  /**
   * Get vocabulary by HSK level (useful for review)
   */
  static async getVocabularyByHSKLevel(hskLevel: number, limit?: number) {
    let query = supabase
      .from('vocabulary')
      .select('*')
      .eq('hsk_level', hskLevel)
      .order('word_order');

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as Vocabulary[];
  }

  /**
   * Get vocabulary for multiple lessons (e.g., cumulative review)
   */
  static async getVocabularyForLessons(lessonIds: string[]) {
    const { data, error } = await supabase
      .from('vocabulary')
      .select('*')
      .in('lesson_id', lessonIds)
      .order('word_order');

    if (error) throw error;
    return data as Vocabulary[];
  }

  /**
   * Search vocabulary by simplified character, pinyin, or English
   */
  static async searchVocabulary(query: string) {
    const { data, error } = await supabase
      .from('vocabulary')
      .select('*')
      .or(`simplified.ilike.%${query}%,pinyin.ilike.%${query}%,definition_en.ilike.%${query}%`)
      .limit(20);

    if (error) throw error;
    return data as Vocabulary[];
  }
}

/**
 * User Progress Service
 * Handles all database operations for user progress tracking
 */
export class ProgressService {
  /**
   * Get user's progress for all levels
   */
  static async getUserProgress(userId: string) {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .order('last_accessed_at', { ascending: false });

    if (error) throw error;
    return data as UserProgress[];
  }

  /**
   * Get user's progress for a specific level
   */
  static async getLevelProgress(userId: string, levelId: string) {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('level_id', levelId);

    if (error) throw error;
    return data as UserProgress[];
  }

  /**
   * Update lesson progress
   */
  static async updateLessonProgress(
    userId: string,
    levelId: string,
    unitId: string,
    lessonId: string,
    status: 'not_started' | 'in_progress' | 'completed'
  ) {
    const now = new Date().toISOString();
    
    const updateData: any = {
      user_id: userId,
      level_id: levelId,
      unit_id: unitId,
      lesson_id: lessonId,
      status,
      last_accessed_at: now,
    };

    if (status === 'in_progress' || status === 'completed') {
      // Check if progress exists
      const { data: existing } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .single();

      if (!existing) {
        updateData.started_at = now;
      }
    }

    if (status === 'completed') {
      updateData.completed_at = now;
    }

    const { data, error } = await supabase
      .from('user_progress')
      .upsert(updateData)
      .select()
      .single();

    if (error) throw error;
    return data as UserProgress;
  }

  /**
   * Calculate overall progress for a level
   */
  static async calculateLevelProgress(userId: string, levelId: string) {
    // Get all lessons in this level
    const { data: units } = await supabase
      .from('units')
      .select('id')
      .eq('level_id', levelId);

    if (!units || units.length === 0) return 0;

    const unitIds = units.map(u => u.id);
    
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id')
      .in('unit_id', unitIds);

    if (!lessons || lessons.length === 0) return 0;

    const totalLessons = lessons.length;
    const lessonIds = lessons.map(l => l.id);

    // Get completed lessons
    const { data: progress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .in('lesson_id', lessonIds)
      .eq('status', 'completed');

    const completedLessons = progress?.length || 0;

    return Math.round((completedLessons / totalLessons) * 100);
  }
}

/**
 * Flashcard Service
 * Handles spaced repetition system for vocabulary review
 */
export class FlashcardService {
  /**
   * Ensure flashcard records exist for given vocabulary IDs
   * Creates records with next_review_at = now for new cards
   */
  static async ensureFlashcardsExist(userId: string, vocabularyIds: string[]) {
    // Check which vocabulary IDs already have flashcard records
    const { data: existing } = await supabase
      .from('flashcard_reviews')
      .select('vocabulary_id')
      .eq('user_id', userId)
      .in('vocabulary_id', vocabularyIds);

    const existingIds = new Set(existing?.map(f => f.vocabulary_id) || []);
    const newIds = vocabularyIds.filter(id => !existingIds.has(id));

    if (newIds.length === 0) return;

    // Create flashcard records for new vocabulary
    const now = new Date().toISOString();
    const newFlashcards = newIds.map(vocabId => ({
      user_id: userId,
      vocabulary_id: vocabId,
      ease_factor: 2.5,
      interval_days: 0,
      repetitions: 0,
      last_reviewed_at: now,
      next_review_at: now, // Due immediately
    }));

    const { error } = await supabase
      .from('flashcard_reviews')
      .insert(newFlashcards);

    if (error) throw error;
  }

  /**
   * Get flashcard records for specific vocabulary IDs
   */
  static async getFlashcardsForVocabulary(userId: string, vocabularyIds: string[]) {
    const { data, error } = await supabase
      .from('flashcard_reviews')
      .select('*')
      .eq('user_id', userId)
      .in('vocabulary_id', vocabularyIds);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get due flashcards for review
   */
  static async getDueFlashcards(userId: string, limit: number = 20) {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('flashcard_reviews')
      .select(`
        *,
        vocabulary (*)
      `)
      .eq('user_id', userId)
      .lte('next_review_at', now)
      .order('next_review_at')
      .limit(limit);

    if (error) throw error;
    return data;
  }

  /**
   * Get count of due flashcards
   */
  static async getDueFlashcardCount(userId: string) {
    const now = new Date().toISOString();

    const { count, error } = await supabase
      .from('flashcard_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .lte('next_review_at', now);

    if (error) throw error;
    return count || 0;
  }

  /**
   * Update flashcard after review (SM-2 algorithm)
   */
  static async updateFlashcard(
    userId: string,
    vocabularyId: string,
    quality: number // 0-5 scale
  ) {
    // Get current progress
    const { data: current } = await supabase
      .from('flashcard_reviews')
      .select('*')
      .eq('user_id', userId)
      .eq('vocabulary_id', vocabularyId)
      .single();

    let easeFactor = current?.ease_factor || 2.5;
    let repetitions = current?.repetitions || 0;
    let intervalDays = current?.interval_days || 0;

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

    const { data, error } = await supabase
      .from('flashcard_reviews')
      .upsert({
        user_id: userId,
        vocabulary_id: vocabularyId,
        ease_factor: easeFactor,
        interval_days: intervalDays,
        repetitions: repetitions,
        last_reviewed_at: now.toISOString(),
        next_review_at: nextReview.toISOString(),
      }, {
        onConflict: 'user_id,vocabulary_id'
      })
      .select()
      .single();

    if (error) throw error;
    return data as FlashcardProgress;
  }

  /**
   * Initialize flashcards for a lesson's vocabulary
   */
  static async initializeFlashcardsForLesson(userId: string, lessonId: string) {
    const vocabulary = await CurriculumService.getVocabulary(lessonId);
    
    const flashcards = vocabulary.map(vocab => ({
      user_id: userId,
      vocabulary_id: vocab.id,
      ease_factor: 2.5,
      interval_days: 0,
      repetitions: 0,
      last_reviewed_at: new Date().toISOString(),
      next_review_at: new Date().toISOString(), // Due immediately
    }));

    const { data, error } = await supabase
      .from('flashcard_reviews')
      .upsert(flashcards);

    if (error) throw error;
    return data;
  }

  /**
   * Get flashcard statistics
   */
  static async getFlashcardStats(userId: string) {
    const { data, error } = await supabase
      .from('flashcard_reviews')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    const now = new Date();
    const due = data?.filter(f => new Date(f.next_review_at) <= now).length || 0;
    const total = data?.length || 0;
    const mature = data?.filter(f => f.repetitions >= 3).length || 0;

    return {
      total,
      due,
      mature,
      new: total - mature,
    };
  }
}