import { Audio } from 'expo-av';
import { GoogleGenAI } from '@google/genai';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';

const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey || process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY || '' });

export class VoiceService {
  private recording: Audio.Recording | null = null;

  async startRecording(): Promise<void> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Microphone permission not granted');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      this.recording = recording;
      console.log('🎤 Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
      throw err;
    }
  }

  async stopRecording(): Promise<string> {
    if (!this.recording) {
      throw new Error('No recording in progress');
    }

    await this.recording.stopAndUnloadAsync();
    const uri = this.recording.getURI();
    this.recording = null;

    if (!uri) {
      throw new Error('No recording URI');
    }

    console.log('✅ Recording stopped:', uri);
    return uri;
  }

  async transcribeAudio(audioUri: string): Promise<string> {
    try {
      console.log('📝 Transcribing audio...');

      // Read audio file as base64
      const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
        encoding: 'base64',
      });

      // Send to Gemini for transcription
      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{
          parts: [
            { text: 'Transcribe this Chinese audio. Return only the Chinese text, nothing else.' },
            {
              inlineData: {
                mimeType: 'audio/m4a',
                data: base64Audio
              }
            }
          ]
        }]
      });

      const transcription = result.text?.trim() || '';
      console.log('✅ Transcription:', transcription);
      return transcription;

    } catch (error: any) {
      console.error('❌ Transcription error:', error);
      throw new Error(`Failed to transcribe: ${error.message}`);
    }
  }
}

export const voiceService = new VoiceService();