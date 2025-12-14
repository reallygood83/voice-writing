import { requestUrl, RequestUrlParam, Notice } from 'obsidian';
import {
    ServiceProvider,
    MODELS,
    API_ENDPOINTS,
    API_TEST_ENDPOINTS,
    API_CONFIG,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    API_TEST_ERRORS
} from './constants';

export interface ApiTestResult {
    success: boolean;
    message: string;
    details?: string;
}

export interface TranscriptionResult {
    text: string;
}

export interface TranscriptionError {
    status?: number;
    message: string;
    details?: string;
}

export class TranscriptionService {
    /**
     * Test API key validity by calling the models endpoint
     */
    async testApiKey(apiKey: string, serviceProvider: ServiceProvider): Promise<ApiTestResult> {
        if (!apiKey || apiKey.trim().length === 0) {
            return {
                success: false,
                message: API_TEST_ERRORS.INVALID_KEY,
                details: 'API key is empty'
            };
        }

        const url = API_TEST_ENDPOINTS[serviceProvider];

        const params: RequestUrlParam = {
            url: url,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey.trim()}`
            },
            throw: false
        };

        try {
            const response = await requestUrl(params);

            console.log(`API Test Response (${serviceProvider}):`, {
                status: response.status,
                data: response.json
            });

            if (response.status === 200) {
                return {
                    success: true,
                    message: SUCCESS_MESSAGES.API_KEY_VALID,
                    details: `Connected to ${serviceProvider.toUpperCase()} API successfully`
                };
            } else if (response.status === 401) {
                return {
                    success: false,
                    message: API_TEST_ERRORS.INVALID_KEY,
                    details: response.json?.error?.message || 'Authentication failed'
                };
            } else if (response.status === 429) {
                return {
                    success: false,
                    message: API_TEST_ERRORS.QUOTA_EXCEEDED,
                    details: 'Rate limit or quota exceeded'
                };
            } else {
                return {
                    success: false,
                    message: API_TEST_ERRORS.UNKNOWN_ERROR,
                    details: `HTTP ${response.status}: ${JSON.stringify(response.json)}`
                };
            }
        } catch (error) {
            console.error('API Test Error:', error);
            return {
                success: false,
                message: API_TEST_ERRORS.NETWORK_ERROR,
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async transcribe(
        audioBlob: Blob,
        apiKey: string,
        language: string,
        serviceProvider: ServiceProvider
    ): Promise<TranscriptionResult> {
        // Validate API key
        if (!apiKey) {
            new Notice(ERROR_MESSAGES.API_KEY_MISSING);
            throw new Error('API Key missing');
        }

        // Basic API key format validation
        if (!this.isValidApiKeyFormat(apiKey, serviceProvider)) {
            new Notice(ERROR_MESSAGES.API_KEY_INVALID_FORMAT(serviceProvider));
            throw new Error('Invalid API key format');
        }

        const arrayBuffer = await audioBlob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Boundary for multipart/form-data
        const boundary = '----ObsidianVoiceWritingBoundary' + Date.now();
        const body = await this.createFormData(buffer, 'recording.webm', boundary, language, serviceProvider);

        const url = API_ENDPOINTS[serviceProvider];

        const params: RequestUrlParam = {
            url: url,
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Authorization': `Bearer ${apiKey}`
            },
            body: body,
            throw: false // Don't throw on non-2xx responses
        };

        try {
            // Create timeout promise
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => {
                    reject(new Error('TIMEOUT'));
                }, API_CONFIG.TIMEOUT_MS);
            });

            // Race between request and timeout
            const response = await Promise.race([
                requestUrl(params),
                timeoutPromise
            ]);

            if (response.status !== 200) {
                console.error('Transcription failed:', response.json);
                if (response.status === 401) {
                    throw new Error('API_UNAUTHORIZED'); // Will be caught and mapped
                }
                if (response.status === 429) {
                    throw new Error('API_QUOTA_EXCEEDED');
                }
                throw new Error(`Transcription failed: ${response.status}`);
            }

            return { text: response.json.text };
        } catch (error) {
            if (error instanceof Error && error.message === 'TIMEOUT') {
                console.error('Transcription timeout after', API_CONFIG.TIMEOUT_MS, 'ms');
                new Notice(ERROR_MESSAGES.TRANSCRIPTION_TIMEOUT);
                throw new Error('Transcription timeout');
            }

            console.error('Transcription error:', error);
            new Notice(ERROR_MESSAGES.TRANSCRIPTION_FAILED);
            throw error;
        }
    }

    private isValidApiKeyFormat(apiKey: string, provider: ServiceProvider): boolean {
        // Basic validation - check if key has reasonable format
        const trimmedKey = apiKey.trim();

        if (provider === 'openai') {
            // OpenAI keys start with 'sk-' and are reasonably long
            return trimmedKey.startsWith('sk-') && trimmedKey.length > 20;
        } else if (provider === 'groq') {
            // Groq keys can have various formats (gsk_, xai-, etc.)
            // Just check for reasonable length and no whitespace
            return trimmedKey.length > 20 && !/\s/.test(trimmedKey);
        }
        return trimmedKey.length > 10;
    }

    private parseErrorResponse(response: any): TranscriptionError {
        try {
            const json = response.json;
            if (json?.error?.message) {
                return {
                    status: response.status,
                    message: json.error.message,
                    details: json.error.type || json.error.code
                };
            }
            return {
                status: response.status,
                message: `HTTP ${response.status} Error`,
                details: JSON.stringify(json)
            };
        } catch {
            return {
                status: response.status,
                message: `HTTP ${response.status} Error`,
                details: 'Could not parse error response'
            };
        }
    }

    private async createFormData(
        fileBuffer: Buffer,
        fileName: string,
        boundary: string,
        language: string,
        provider: ServiceProvider
    ): Promise<ArrayBuffer> {
        const parts: Buffer[] = [];
        const model = MODELS[provider];

        // File part
        parts.push(Buffer.from(`--${boundary}\r\n`));
        parts.push(Buffer.from(`Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`));
        parts.push(Buffer.from(`Content-Type: ${API_CONFIG.AUDIO_MIME_TYPE}\r\n\r\n`));
        parts.push(fileBuffer);
        parts.push(Buffer.from(`\r\n`));

        // Model part
        parts.push(Buffer.from(`--${boundary}\r\n`));
        parts.push(Buffer.from(`Content-Disposition: form-data; name="model"\r\n\r\n`));
        parts.push(Buffer.from(`${model}\r\n`));

        // Language part
        if (language && language !== 'auto') {
            parts.push(Buffer.from(`--${boundary}\r\n`));
            parts.push(Buffer.from(`Content-Disposition: form-data; name="language"\r\n\r\n`));
            parts.push(Buffer.from(`${language}\r\n`));
        }

        // End boundary
        parts.push(Buffer.from(`--${boundary}--\r\n`));

        return Buffer.concat(parts).buffer;
    }
}
