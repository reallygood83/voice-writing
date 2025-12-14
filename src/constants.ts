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

// Success Messages (Emoji-free for Obsidian Community Plugin compatibility)
export const SUCCESS_MESSAGES = {
    RECORDING_STARTED: 'Recording started...',
    TRANSCRIPTION_COMPLETE: 'Transcription complete!',
    SETTINGS_SAVED: (service: string, lang: string) => `Settings saved: ${service} / ${lang}`,
    QUICK_SETTINGS_SAVED: (service: string, lang: string, diarization: boolean) =>
        `Settings: ${service} / ${lang}${diarization ? ' / Speaker Diarization ON' : ''}`,
    COPIED_TO_CLIPBOARD: 'Text copied to clipboard (No active editor)',
    API_KEY_VALID: 'API key is valid!',
    API_KEY_TEST_START: 'Testing API key...'
} as const;

// Speaker Diarization Note
export const DIARIZATION_NOTE = {
    INFO: '⚠️ 화자 구분은 현재 OpenAI/Groq Whisper API에서 기본 지원되지 않습니다. 향후 업데이트 예정.',
    LABEL: '화자 구분 (Speaker Diarization)'
} as const;

// API Test Error Messages (Emoji-free for Obsidian Community Plugin compatibility)
export const API_TEST_ERRORS = {
    INVALID_KEY: 'Invalid API Key. Please check and try again.',
    QUOTA_EXCEEDED: 'API Quota exceeded. Check your billing.',
    NETWORK_ERROR: 'Network error. Check your internet connection.',
    UNKNOWN_ERROR: 'Test failed. Check console for details.'
} as const;

// Supported Audio Formats for Upload
export const SUPPORTED_AUDIO_FORMATS = [
    'mp3', 'wav', 'webm', 'm4a', 'ogg', 'flac', 'mp4', 'mpeg', 'mpga'
] as const;

export const AUDIO_MIME_TYPES: Record<string, string> = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    webm: 'audio/webm',
    m4a: 'audio/m4a',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
    mp4: 'audio/mp4',
    mpeg: 'audio/mpeg',
    mpga: 'audio/mpeg'
} as const;

// Built-in Formatting Templates
export type TemplateId = 'none' | 'meeting' | 'lecture' | 'idea' | 'interview' | 'custom';

export interface FormattingTemplate {
    id: TemplateId | string;
    name: string;
    nameKo: string;
    description: string;
    prompt: string;
    isBuiltIn: boolean;
}

export const BUILT_IN_TEMPLATES: readonly FormattingTemplate[] = [
    {
        id: 'none',
        name: 'None (Raw Transcript)',
        nameKo: '없음 (원본 텍스트)',
        description: 'Keep the original transcription without formatting',
        prompt: '',
        isBuiltIn: true
    },
    {
        id: 'meeting',
        name: 'Meeting Notes',
        nameKo: '회의록',
        description: 'Format as structured meeting notes with participants, agenda, decisions, and action items',
        prompt: `다음 전사 내용을 회의록 형식으로 정리해주세요:

## 📋 회의록

### 📅 일시
- 날짜/시간: [추정]

### 👥 참석자
- [언급된 참석자들]

### 📌 주요 안건
1. [안건1]
2. [안건2]

### 💬 논의 내용
[주요 논의 내용 요약]

### ✅ 결정 사항
- [결정1]
- [결정2]

### 📝 Action Items
- [ ] [액션1] - 담당자
- [ ] [액션2] - 담당자

### 🔜 다음 단계
[후속 조치 및 다음 회의 일정]

---
원본 전사:
`,
        isBuiltIn: true
    },
    {
        id: 'lecture',
        name: 'Lecture Notes',
        nameKo: '강의 노트',
        description: 'Format as organized lecture notes with key concepts and summary',
        prompt: `다음 전사 내용을 강의 노트 형식으로 정리해주세요:

## 📚 강의 노트

### 🎯 강의 주제
[주제]

### 📝 핵심 개념
1. **[개념1]**: 설명
2. **[개념2]**: 설명
3. **[개념3]**: 설명

### 📖 상세 내용
[강의 내용을 체계적으로 정리]

### 💡 중요 포인트
> [강조된 내용이나 중요한 인사이트]

### ❓ 질문/토론 사항
- [질문1]
- [질문2]

### 📋 요약
[전체 내용 3-5문장 요약]

### 🔗 관련 자료/참고
- [관련 자료]

---
원본 전사:
`,
        isBuiltIn: true
    },
    {
        id: 'idea',
        name: 'Brainstorming / Ideas',
        nameKo: '아이디어 브레인스토밍',
        description: 'Organize ideas and brainstorming sessions',
        prompt: `다음 전사 내용을 아이디어 브레인스토밍 형식으로 정리해주세요:

## 💡 아이디어 브레인스토밍

### 🎯 주제/목표
[브레인스토밍 주제]

### 💭 아이디어 목록
1. **[아이디어1]**
   - 설명:
   - 장점:
   - 단점:

2. **[아이디어2]**
   - 설명:
   - 장점:
   - 단점:

### ⭐ Top 3 유망 아이디어
1. [가장 유망한 아이디어]
2. [두 번째]
3. [세 번째]

### 🔄 다음 단계
- [ ] [액션1]
- [ ] [액션2]

### 📝 추가 메모
[기타 논의 사항]

---
원본 전사:
`,
        isBuiltIn: true
    },
    {
        id: 'interview',
        name: 'Interview Notes',
        nameKo: '인터뷰 정리',
        description: 'Format interview conversations with Q&A structure',
        prompt: `다음 전사 내용을 인터뷰 정리 형식으로 정리해주세요:

## 🎤 인터뷰 정리

### 📅 인터뷰 정보
- 일시: [추정]
- 인터뷰이: [이름/역할]
- 인터뷰어: [이름/역할]

### 🎯 인터뷰 목적
[인터뷰 목적]

### 💬 주요 Q&A

**Q1: [질문]**
> A: [답변 요약]

**Q2: [질문]**
> A: [답변 요약]

### 📌 핵심 인사이트
1. [인사이트1]
2. [인사이트2]
3. [인사이트3]

### 💡 주요 인용구
> "[기억에 남는 인용]"

### 📝 후속 조치
- [ ] [액션1]
- [ ] [액션2]

---
원본 전사:
`,
        isBuiltIn: true
    }
] as const;

// Template Messages (Emoji-free for Obsidian Community Plugin compatibility)
export const TEMPLATE_MESSAGES = {
    SELECT_TEMPLATE: 'Select a template to format the transcription',
    FORMATTING: 'Formatting with template...',
    FORMAT_COMPLETE: 'Formatting complete!',
    FORMAT_FAILED: 'Formatting failed. Original text preserved.',
    CUSTOM_TEMPLATE_SAVED: 'Custom template saved!',
    CUSTOM_TEMPLATE_DELETED: 'Template deleted.',
    FILE_UPLOAD_SUCCESS: 'File uploaded and transcribed!',
    FILE_TOO_LARGE: 'File too large. Maximum size is 25MB.',
    INVALID_FILE_TYPE: 'Invalid file type. Supported: mp3, wav, m4a, webm, ogg, flac'
} as const;
