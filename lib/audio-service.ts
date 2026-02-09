import { Audio } from 'expo-av';
import { GoogleGenAI } from '@google/genai';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';

const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey || process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY || '' });

export class AudioService {
  private sound: Audio.Sound | null = null;

  /**
   * Convert Chinese text to speech and play it
   * Uses Gemini TTS API with Chinese voice
   */
  async speakChinese(text: string): Promise<void> {
    try {
      // Stop any currently playing audio
      await this.stopAudio();

      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // Generate TTS audio from Gemini - following official docs structure
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [
          {
            role: 'user',
            parts: [{ text: `Read this text aloud: ${text}` }]
          }
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                // Aoede is a female voice that works well for Chinese
                // Other options: Kore, Puck, Charon, Fenrir, etc.
                voiceName: 'Aoede'
              }
            }
          }
        }
      });

      // Extract audio data using the exact path from docs
      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (!audioData) {
        throw new Error('No audio data received from Gemini TTS');
      }

      // Convert base64 to audio buffer and save as WAV
      const tempFilePath = await this.saveWavFile(audioData);

      // Load and play the audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: tempFilePath },
        { shouldPlay: true }
      );

      this.sound = sound;

      // Clean up after playback finishes
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          this.cleanupAudio(tempFilePath);
        }
      });

    } catch (error: any) {
      console.error('TTS Error:', error);
      throw new Error(`Failed to play audio: ${error.message || 'Unknown error'}`);
    }
  }

  async playAudioData(base64Audio: string): Promise<void> {
    try {
      await this.stopAudio();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const wavFilePath = await this.saveWavFile(base64Audio); // Use existing method
      const { sound } = await Audio.Sound.createAsync(
        { uri: wavFilePath },
        { shouldPlay: true }
      );
      this.sound = sound;

      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          this.cleanupAudio(wavFilePath); // Use existing method
        }
      });
    } catch (error: any) {
      console.error('Playback error:', error);
      throw error;
    }
  }

  /**
   * Save base64 PCM audio data as a WAV file
   * Gemini returns 24kHz, 16-bit, mono PCM audio
   */
  private async saveWavFile(base64Audio: string): Promise<string> {
    // eslint-disable-next-line import/namespace
    const tempFilePath = `${FileSystem.cacheDirectory}tts_${Date.now()}.wav`;
    
    // Gemini TTS returns PCM audio data at 24kHz, 16-bit, mono
    // We need to add a WAV header to make it playable
    const pcmData = this.base64ToArrayBuffer(base64Audio);
    const wavData = this.addWavHeader(pcmData, 1, 24000, 16);
    
    // Convert to base64 for FileSystem
    const wavBase64 = this.arrayBufferToBase64(wavData);
    
    // Write to file
    await FileSystem.writeAsStringAsync(tempFilePath, wavBase64, {
      encoding: 'base64',
    });

    return tempFilePath;
  }

  /**
   * Convert base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Add WAV header to raw PCM data
   * Based on WAV file format specification
   */
  private addWavHeader(
    pcmData: ArrayBuffer,
    numChannels: number,
    sampleRate: number,
    bitsPerSample: number
  ): ArrayBuffer {
    const dataSize = pcmData.byteLength;
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    const blockAlign = numChannels * bitsPerSample / 8;
    const byteRate = sampleRate * blockAlign;

    // "RIFF" chunk descriptor
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + dataSize, true); // File size - 8
    view.setUint32(8, 0x57415645, false); // "WAVE"

    // "fmt " sub-chunk
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true); // Subchunk size (16 for PCM)
    view.setUint16(20, 1, true); // Audio format (1 = PCM)
    view.setUint16(22, numChannels, true); // Number of channels
    view.setUint32(24, sampleRate, true); // Sample rate
    view.setUint32(28, byteRate, true); // Byte rate
    view.setUint16(32, blockAlign, true); // Block align
    view.setUint16(34, bitsPerSample, true); // Bits per sample

    // "data" sub-chunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, dataSize, true); // Data size

    // Combine header and PCM data
    const wavFile = new Uint8Array(44 + dataSize);
    wavFile.set(new Uint8Array(header), 0);
    wavFile.set(new Uint8Array(pcmData), 44);

    return wavFile.buffer;
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Stop currently playing audio
   */
  async stopAudio(): Promise<void> {
    if (this.sound) {
      try {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
      } catch (error) {
        console.error('Error stopping audio:', error);
      }
      this.sound = null;
    }
  }

  /**
   * Clean up audio file and sound object
   */
  private async cleanupAudio(filePath: string): Promise<void> {
    try {
      // Unload sound
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }

      // Delete temporary file
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(filePath);
      }
    } catch (error) {
      console.error('Error cleaning up audio:', error);
    }
  }
}

export const audioService = new AudioService();