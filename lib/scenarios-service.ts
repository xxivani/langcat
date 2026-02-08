import { supabase } from './supabase';

export type Scenario = {
  id: string;
  level_id: string;
  scenario_key: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  estimated_duration: string;
  system_prompt: string;
  initial_message: {
    chinese: string;
    pinyin: string;
    english: string;
  };
  vocabulary_focus: string[];
  grammar_points: string[];
  order_index: number;
};

export type ScenarioProgress = {
  id: string;
  user_id: string;
  scenario_id: string;
  completion_count: number;
  last_completed_at: string | null;
  average_accuracy: number;
  created_at: string;
};

// In-memory cache for scenarios
let scenariosCache: Scenario[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export class ScenarioService {
  /**
   * Get all scenarios (with caching)
   */
  static async getAllScenarios(): Promise<Scenario[]> {
    const now = Date.now();
    
    // Return cached data if still valid
    if (scenariosCache && (now - cacheTimestamp) < CACHE_DURATION) {
      return scenariosCache;
    }

    const { data, error } = await supabase
      .from('scenarios')
      .select('*')
      .order('order_index');

    if (error) throw error;
    
    // Update cache
    scenariosCache = data as Scenario[];
    cacheTimestamp = now;
    
    return scenariosCache;
  }

  /**
   * Get scenarios by level (uses cache)
   */
  static async getScenariosByLevel(levelId: string): Promise<Scenario[]> {
    const allScenarios = await this.getAllScenarios();
    return allScenarios.filter(s => s.level_id === levelId);
  }

  /**
   * Get scenarios by category (uses cache)
   */
  static async getScenariosByCategory(category: string): Promise<Scenario[]> {
    const allScenarios = await this.getAllScenarios();
    return allScenarios.filter(s => s.category === category);
  }

  /**
   * Get single scenario by ID (uses cache)
   */
  static async getScenario(scenarioId: string): Promise<Scenario> {
    const allScenarios = await this.getAllScenarios();
    const scenario = allScenarios.find(s => s.id === scenarioId);
    
    if (!scenario) {
      throw new Error('Scenario not found');
    }
    
    return scenario;
  }

  /**
   * Get single scenario by key (uses cache)
   */
  static async getScenarioByKey(scenarioKey: string): Promise<Scenario> {
    const allScenarios = await this.getAllScenarios();
    const scenario = allScenarios.find(s => s.scenario_key === scenarioKey);
    
    if (!scenario) {
      throw new Error(`Scenario with key '${scenarioKey}' not found`);
    }
    
    return scenario;
  }

  /**
   * Get all unique categories (uses cache)
   */
  static async getCategories(): Promise<string[]> {
    const allScenarios = await this.getAllScenarios();
    const categories = new Set(allScenarios.map(s => s.category));
    return Array.from(categories).sort();
  }

  /**
   * Get scenario count by level (uses cache)
   */
  static async getScenarioCountByLevel(): Promise<Record<string, number>> {
    const allScenarios = await this.getAllScenarios();
    const counts: Record<string, number> = {};
    
    allScenarios.forEach(scenario => {
      counts[scenario.level_id] = (counts[scenario.level_id] || 0) + 1;
    });
    
    return counts;
  }

  /**
   * Get user's progress for a scenario
   */
  static async getScenarioProgress(
    userId: string,
    scenarioId: string
  ): Promise<ScenarioProgress | null> {
    const { data, error } = await supabase
      .from('user_scenario_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('scenario_id', scenarioId)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found error
      throw error;
    }

    return data as ScenarioProgress | null;
  }

  /**
   * Get all user's scenario progress
   */
  static async getUserScenarioProgress(userId: string): Promise<ScenarioProgress[]> {
    const { data, error } = await supabase
      .from('user_scenario_progress')
      .select('*')
      .eq('user_id', userId)
      .order('last_completed_at', { ascending: false });

    if (error) throw error;
    return data as ScenarioProgress[];
  }

  /**
   * Record scenario completion
   */
  static async completeScenario(
    userId: string,
    scenarioId: string,
    accuracy: number
  ): Promise<ScenarioProgress> {
    // Get existing progress
    const existing = await this.getScenarioProgress(userId, scenarioId);

    let newAvgAccuracy: number;
    let newCompletionCount: number;

    if (existing) {
      // Calculate new average accuracy
      const totalAccuracy = existing.average_accuracy * existing.completion_count;
      newCompletionCount = existing.completion_count + 1;
      newAvgAccuracy = (totalAccuracy + accuracy) / newCompletionCount;
    } else {
      newCompletionCount = 1;
      newAvgAccuracy = accuracy;
    }

    const { data, error } = await supabase
      .from('user_scenario_progress')
      .upsert({
        user_id: userId,
        scenario_id: scenarioId,
        completion_count: newCompletionCount,
        average_accuracy: newAvgAccuracy,
        last_completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as ScenarioProgress;
  }

  /**
   * Get recommended scenarios based on user progress
   */
  static async getRecommendedScenarios(
    userId: string,
    limit: number = 5
  ): Promise<Scenario[]> {
    const [allScenarios, userProgress] = await Promise.all([
      this.getAllScenarios(),
      this.getUserScenarioProgress(userId),
    ]);

    const completedScenarioIds = new Set(
      userProgress.map(p => p.scenario_id)
    );

    // Get incomplete scenarios
    const incompleteScenarios = allScenarios.filter(
      s => !completedScenarioIds.has(s.id)
    );

    // Return first N incomplete scenarios (ordered by order_index)
    return incompleteScenarios.slice(0, limit);
  }

  /**
   * Clear cache (useful after data updates)
   */
  static clearCache(): void {
    scenariosCache = null;
    cacheTimestamp = 0;
  }

  /**
   * Prefetch scenarios (load into cache early)
   */
  static async prefetch(): Promise<void> {
    await this.getAllScenarios();
  }
}