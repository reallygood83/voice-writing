/**
 * Voice Writing Plugin Constants
 * Centralized configuration for models, timeouts, and supported languages
 */

// Service Provider Types
export type ServiceProvider = 'openai' | 'groq';

// Model configuration per provider
export const MODELS: Record<ServiceProvider, string> = {
    openai: 'whisper-1',
    groq: 'whisper-large-v3'
} as const;

// API Endpoints
export const API_ENDPOINTS: Record<ServiceProvider, string> = {
    openai: 'https://api.openai.com/v1/audio/transcriptions',
    groq: 'https://api.groq.com/openai/v1/audio/transcriptions'
} as const;

// API Test Endpoints (for validating API keys)
export const API_TEST_ENDPOINTS: Record<ServiceProvider, string> = {
    openai: 'https://api.openai.com/v1/models',
    groq: 'https://api.groq.com/openai/v1/models'
} as const;

// API Request Configuration
export const API_CONFIG = {
    TIMEOUT_MS: 30000, // 30 seconds
    MAX_FILE_SIZE_MB: 25,
    AUDIO_MIME_TYPE: 'audio/webm'
} as const;

// Supported Languages with display names
export const SUPPORTED_LANGUAGES = [
    { code: 'auto', name: 'Auto Detect' },
    { code: 'en', name: 'English' },
    { code: 'ko', name: 'Korean (한국어)' },
    { code: 'ja', name: 'Japanese (日本語)' },
    { code: 'zh', name: 'Chinese (中文)' },
    { code: 'es', name: 'Spanish (Español)' },
    { code: 'fr', name: 'French (Français)' },
    { code: 'de', name: 'German (Deutsch)' }
] as const;

// Error Messages
export const ERROR_MESSAGES = {
    API_KEY_MISSING: 'API Key is missing. Please set it in settings.',
    API_KEY_INVALID_FORMAT: (provider: ServiceProvider) =>
        `Invalid API key format for ${provider}. Please check your API key.`,
    TRANSCRIPTION_FAILED: 'Transcription failed. Check console for details.',
    TRANSCRIPTION_TIMEOUT: 'Transcription timed out. Please try again.',
    MICROPHONE_PERMISSION_DENIED: 'Microphone access denied. Please allow microphone access in your browser/system settings.',
    MICROPHONE_NOT_FOUND: 'No microphone found. Please connect a microphone and try again.',
    MICROPHONE_GENERAL_ERROR: 'Failed to access microphone. Please check your audio settings.',
    NO_ACTIVE_RECORDING: 'No active recording to stop.',
    API_UNAUTHORIZED: 'Incorrect API Key (401). Please check your settings.',
    API_QUOTA_EXCEEDED: 'API Quota Exceeded (429). Please check your plan.'
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
    RECORDING_STARTED: '🎙️ Recording started...',
    TRANSCRIPTION_COMPLETE: '✅ Transcription complete!',
    SETTINGS_SAVED: (service: string, lang: string) => `Settings saved: ${service} / ${lang}`,
    COPIED_TO_CLIPBOARD: 'Text copied to clipboard (No active editor)',
    API_KEY_VALID: '✅ API Key is valid!',
    API_KEY_TEST_START: '🔄 Testing API Key...'
} as const;

// API Test Error Messages
export const API_TEST_ERRORS = {
    INVALID_KEY: '❌ Invalid API Key. Please check and try again.',
    QUOTA_EXCEEDED: '⚠️ API Quota exceeded. Check your billing.',
    NETWORK_ERROR: '❌ Network error. Check your internet connection.',
    UNKNOWN_ERROR: '❌ Test failed. Check console for details.'
} as const;
