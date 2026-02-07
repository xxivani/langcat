/**
 * Database Connection Test Utility
 * Run this to verify Supabase connection and data integrity
 */

import { supabase } from './supabase';
import { CurriculumService, ProgressService, FlashcardService } from './database';

export async function testDatabaseConnection() {
  console.log('🔍 Testing Supabase connection...\n');

  try {
    // Test 1: Basic connection
    console.log('1️⃣ Testing basic connection...');
    const { data, error } = await supabase
      .from('levels')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    console.log('✅ Connection successful!\n');

    // Test 2: Fetch levels
    console.log('2️⃣ Fetching HSK levels...');
    const { data: levels } = await supabase
      .from('levels')
      .select('*')
      .order('level_number');
    
    console.log(`✅ Found ${levels?.length || 0} levels:`);
    levels?.forEach(level => {
      console.log(`   - ${level.name} (${level.total_vocabulary} words)`);
    });
    console.log('');

    // Test 3: Fetch units for HSK 1
    console.log('3️⃣ Fetching units for HSK 1...');
    const hsk1 = levels?.find(l => l.level_number === 1);
    if (hsk1) {
      const units = await CurriculumService.getUnits(hsk1.id);
      console.log(`✅ Found ${units.length} units for HSK 1:`);
      units.forEach(unit => {
        console.log(`   - Unit ${unit.unit_number}: ${unit.title} (${unit.vocabulary_count} words)`);
      });
      console.log('');

      // Test 4: Fetch lessons for first unit
      if (units.length > 0) {
        console.log('4️⃣ Fetching lessons for first unit...');
        const lessons = await CurriculumService.getLessons(units[0].id);
        console.log(`✅ Found ${lessons.length} lessons:`);
        lessons.forEach(lesson => {
          console.log(`   - Lesson ${lesson.lesson_number}: ${lesson.title}`);
        });
        console.log('');

        // Test 5: Fetch vocabulary for first lesson
        if (lessons.length > 0) {
          console.log('5️⃣ Fetching vocabulary for first lesson...');
          const vocab = await CurriculumService.getVocabulary(lessons[0].id);
          console.log(`✅ Found ${vocab.length} vocabulary words:`);
          vocab.slice(0, 3).forEach(word => {
            console.log(`   - ${word.simplified} (${word.pinyin}): ${word.definition_en}`);
          });
          if (vocab.length > 3) {
            console.log(`   ... and ${vocab.length - 3} more`);
          }
          console.log('');
        }
      }
    }

    // Test 6: Check vocabulary by HSK level
    console.log('6️⃣ Counting vocabulary by HSK level...');
    for (let level = 1; level <= 3; level++) {
      const vocab = await CurriculumService.getVocabularyByHSKLevel(level);
      console.log(`   HSK ${level}: ${vocab.length} words`);
    }
    console.log('');

    console.log('🎉 All tests passed! Your database is set up correctly.\n');
    return true;

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('\n📝 Troubleshooting:');
    console.error('1. Check your .env file has the correct SUPABASE_URL and SUPABASE_ANON_KEY');
    console.error('2. Verify your SQL files have been run in Supabase');
    console.error('3. Check Supabase RLS policies allow anonymous read access');
    console.error('4. Ensure your tables are created in the "public" schema\n');
    return false;
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  try {
    const stats = {
      levels: 0,
      units: 0,
      lessons: 0,
      vocabulary: 0,
    };

    const { count: levelsCount } = await supabase
      .from('levels')
      .select('*', { count: 'exact', head: true });
    stats.levels = levelsCount || 0;

    const { count: unitsCount } = await supabase
      .from('units')
      .select('*', { count: 'exact', head: true });
    stats.units = unitsCount || 0;

    const { count: lessonsCount } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true });
    stats.lessons = lessonsCount || 0;

    const { count: vocabCount } = await supabase
      .from('vocabulary')
      .select('*', { count: 'exact', head: true });
    stats.vocabulary = vocabCount || 0;

    return stats;
  } catch (error) {
    console.error('Error getting database stats:', error);
    return null;
  }
}

/**
 * Sample vocabulary search
 */
export async function searchVocabExample(query: string) {
  console.log(`\n🔍 Searching for: "${query}"`);
  const results = await CurriculumService.searchVocabulary(query);
  
  console.log(`Found ${results.length} results:`);
  results.forEach(word => {
    console.log(`  ${word.simplified} (${word.pinyin}) - ${word.definition_en}`);
  });
  console.log('');
  
  return results;
}