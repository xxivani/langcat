import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Get these from app.config.js extra
const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('⚠️ Missing Supabase environment variables');
  console.error('SUPABASE_URL:', SUPABASE_URL ? 'Found' : 'Missing');
  console.error('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'Found' : 'Missing');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Type definitions for your database
export type Level = {
  id: string;
  course_id: string;
  level_number: number;
  name: string;
  description: string;
  target_proficiency: string;
  estimated_weeks: number;
  total_vocabulary: number;
  total_units: number;
  order_index: number;
};

export type Unit = {
  id: string;
  level_id: string;
  unit_number: number;
  title: string;
  theme: string;
  description: string;
  estimated_weeks: number;
  vocabulary_count: number;
  order_index: number;
};

export type Lesson = {
  id: string;
  unit_id: string;
  lesson_number: number;
  title: string;
  description: string;
  learning_objectives: string[];
  estimated_minutes: number;
  order_index: number;
  content: any;
};

export type Vocabulary = {
  id: string;
  lesson_id: string;
  simplified: string;
  pinyin: string;
  definition_en: string;
  part_of_speech: string;
  hsk_level: number;
  examples: Example[];
  usage_notes: string;
  pronunciation_tips: string;
  cultural_notes: string;
  word_order: number;
};

export type Example = {
  chinese: string;
  pinyin: string;
  english: string;
};

// User progress types
export type UserProgress = {
  id: string;
  user_id: string;
  level_id: string;
  unit_id: string;
  lesson_id: string | null;
  status: 'not_started' | 'in_progress' | 'completed';
  started_at: string | null;
  completed_at: string | null;
  last_accessed_at: string;
};

export type FlashcardProgress = {
  id: string;
  user_id: string;
  vocabulary_id: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  last_reviewed_at: string;
  next_review_at: string;
  created_at: string;
};