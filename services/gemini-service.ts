// eslint-disable-next-line import/no-unresolved
import { GoogleGenAI } from '@google/genai';
import Constants from 'expo-constants';

// Get API key from .env via expo-constants
const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey || process.env.EXPO_PUBLIC_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('⚠️ GEMINI_API_KEY not found in environment variables');
}

// Initialize the Gemini 3 client
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY || '' });

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface ScenarioResponse {
  chinese: string;
  pinyin: string;
  english: string;
}

export class GeminiService {
  /**
   * Send a message to Gemini 3 with conversation history
   * Uses gemini-3-flash-preview for fast, cost-effective responses
   */
  async sendMessage(
    userMessage: string,
    systemInstruction: string,
    conversationHistory: GeminiMessage[] = []
  ): Promise<string> {
    try {
      // Build contents array with conversation history + new message
      const contents: GeminiMessage[] = [
        ...conversationHistory,
        {
          role: 'user',
          parts: [{ text: userMessage }]
        }
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: contents,
        config: {
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          temperature: 0.9,
          maxOutputTokens: 2048,
        }
      });

      return response.text || '';
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      
      if (error.message?.includes('quota')) {
        throw new Error('API quota exceeded. Please try again later.');
      } else if (error.message?.includes('location')) {
        throw new Error('API not available in your region.');
      } else if (error.status === 400) {
        throw new Error('Invalid request. Check your API configuration.');
      }
      
      throw new Error(`Failed to get AI response: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Get a scenario-based response in Chinese with translations
   * Returns structured response with Chinese, pinyin, and English
   */
  async getScenarioResponse(
    userMessage: string,
    scenario: {
      system_prompt: string;
      title: string;
      category: string;
    },
    conversationHistory: GeminiMessage[] = []
  ): Promise<ScenarioResponse> {
    try {
      const systemInstruction = `${scenario.system_prompt}

CRITICAL: You must ALWAYS respond in this EXACT JSON format:
{
  "chinese": "你的中文回复",
  "pinyin": "nǐ de zhōngwén huífù",
  "english": "Your English translation"
}

Guidelines:
- Keep responses natural and conversational (2-3 sentences max)
- Match the user's HSK level from the scenario
- Use vocabulary appropriate for the scenario context
- Be encouraging and patient
- Stay in character for the scenario
- ALWAYS return valid JSON with all three fields`;

      const response = await this.sendMessage(userMessage, systemInstruction, conversationHistory);
      
      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          chinese: parsed.chinese || '',
          pinyin: parsed.pinyin || '',
          english: parsed.english || ''
        };
      }

      // Fallback if JSON parsing fails
      return {
        chinese: response,
        pinyin: '',
        english: ''
      };
    } catch (error: any) {
      console.error('Scenario Response Error:', error);
      throw error;
    }
  }

  /**
   * Get conversation feedback for learning
   */
  async getFeedback(
    userMessage: string,
    aiResponse: string,
    targetLanguage: string
  ): Promise<{
    grammar: string;
    vocabulary: string;
    fluency: string;
    suggestions: string;
  }> {
    const systemInstruction = `You are a language learning expert. Analyze the conversation and provide constructive feedback.`;

    const feedbackPrompt = `Analyze this ${targetLanguage} language exchange:

User: "${userMessage}"
AI: "${aiResponse}"

Provide JSON feedback with these exact fields:
{
  "grammar": "grammar feedback",
  "vocabulary": "vocabulary feedback", 
  "fluency": "fluency feedback",
  "suggestions": "improvement suggestions"
}`;

    try {
      const response = await this.sendMessage(feedbackPrompt, systemInstruction, []);
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return {
        grammar: 'Good effort!',
        vocabulary: 'Keep practicing',
        fluency: 'Making progress',
        suggestions: 'Practice regularly'
      };
    } catch (error) {
      console.error('Feedback Error:', error);
      throw new Error('Failed to generate feedback');
    }
  }
}

export const geminiService = new GeminiService();