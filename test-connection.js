// Simple JavaScript test file for Node.js
// Run with: node test-connection.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Make sure you have:');
  console.error('  EXPO_PUBLIC_SUPABASE_URL=...');
  console.error('  EXPO_PUBLIC_SUPABASE_ANON_KEY=...');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');

  try {
    // Test 1: Basic connection
    console.log('1️⃣ Testing basic connection...');
    const { data, error } = await supabase
      .from('levels')
      .select('*')
      .limit(1);
    
    if (error) throw error;
    console.log('✅ Connection successful!\n');

    // Test 2: Fetch all levels
    console.log('2️⃣ Fetching HSK levels...');
    const { data: levels, error: levelsError } = await supabase
      .from('levels')
      .select('*')
      .order('level_number');
    
    if (levelsError) throw levelsError;
    
    console.log(`✅ Found ${levels.length} levels:`);
    levels.forEach(level => {
      console.log(`   - ${level.name} (${level.total_vocabulary} words, ${level.total_units} units)`);
    });
    console.log('');

    // Test 3: Fetch units for HSK 2
    console.log('3️⃣ Fetching units for HSK 2...');
    const hsk2 = levels.find(l => l.level_number === 2);
    
    if (!hsk2) {
      console.log('⚠️  HSK 2 not found. Did you run the SQL files?');
      return;
    }

    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select('*')
      .eq('level_id', hsk2.id)
      .order('order_index');
    
    if (unitsError) throw unitsError;

    console.log(`✅ Found ${units.length} units for HSK 2:`);
    units.forEach(unit => {
      console.log(`   - Unit ${unit.unit_number}: ${unit.title} (${unit.vocabulary_count} words)`);
    });
    console.log('');

    // Test 4: Fetch lessons for first unit
    if (units.length > 0) {
      console.log('4️⃣ Fetching lessons for first unit...');
      const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('unit_id', units[0].id)
        .order('order_index');
      
      if (lessonsError) throw lessonsError;

      console.log(`✅ Found ${lessons.length} lessons in "${units[0].title}":`);
      lessons.forEach(lesson => {
        console.log(`   - Lesson ${lesson.lesson_number}: ${lesson.title} (${lesson.estimated_minutes} min)`);
      });
      console.log('');

      // Test 5: Fetch vocabulary for first lesson
      if (lessons.length > 0) {
        console.log('5️⃣ Fetching vocabulary for first lesson...');
        const { data: vocab, error: vocabError } = await supabase
          .from('vocabulary')
          .select('*')
          .eq('lesson_id', lessons[0].id)
          .order('word_order');
        
        if (vocabError) throw vocabError;

        console.log(`✅ Found ${vocab.length} vocabulary words in "${lessons[0].title}":`);
        vocab.slice(0, 5).forEach(word => {
          console.log(`   - ${word.simplified} (${word.pinyin}): ${word.definition_en}`);
        });
        if (vocab.length > 5) {
          console.log(`   ... and ${vocab.length - 5} more words`);
        }
        console.log('');
      }
    }

    // Test 6: Count vocabulary by HSK level
    console.log('6️⃣ Counting total vocabulary by HSK level...');
    for (let level = 1; level <= 3; level++) {
      const { count, error: countError } = await supabase
        .from('vocabulary')
        .select('*', { count: 'exact', head: true })
        .eq('hsk_level', level);
      
      if (countError) {
        console.log(`   HSK ${level}: Error counting`);
      } else {
        console.log(`   HSK ${level}: ${count} words`);
      }
    }
    console.log('');

    // Test 7: Database summary
    console.log('7️⃣ Database Summary:');
    const { count: levelsCount } = await supabase
      .from('levels')
      .select('*', { count: 'exact', head: true });
    
    const { count: unitsCount } = await supabase
      .from('units')
      .select('*', { count: 'exact', head: true });
    
    const { count: lessonsCount } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true });
    
    const { count: vocabCount } = await supabase
      .from('vocabulary')
      .select('*', { count: 'exact', head: true });

    console.log(`   📚 Levels: ${levelsCount}`);
    console.log(`   📖 Units: ${unitsCount}`);
    console.log(`   📝 Lessons: ${lessonsCount}`);
    console.log(`   ✍️  Vocabulary: ${vocabCount}`);
    console.log('');

    console.log('🎉 All tests passed! Your database is set up correctly.\n');
    console.log('✅ You can now use the database in your React Native app!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\n📝 Troubleshooting:');
    console.error('1. Check your .env file has the correct EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
    console.error('2. Verify your SQL files have been run in Supabase SQL Editor:');
    console.error('   - hsk2_part1_structure.sql');
    console.error('   - hsk2_part2_unit1_vocab.sql');
    console.error('   - hsk2_part3_unit1_complete_unit2_start.sql');
    console.error('3. Check Supabase RLS policies allow public read access');
    console.error('4. Go to https://app.supabase.com/project/YOUR_PROJECT/editor to verify tables exist');
  }
}

// Run the test
testConnection();