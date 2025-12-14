import { ERROR_MESSAGES } from './constants';

export interface RecordingError {
    type: 'permission_denied' | 'not_found' | 'general';
    message: string;
    originalError?: Error;
}

export class MicrophoneRecorder {
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];

    constructor() {
    }

    async startRecording(): Promise<void> {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];

            this.mediaRecorder.addEventListener("dataavailable", (event) => {
                this.audioChunks.push(event.data);
            });

            this.mediaRecorder.start();
        } catch (error) {
            console.error("Error starting recording:", error);
            throw this.parseMediaError(error);
        }
    }

    async stopRecording(): Promise<Blob> {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder) {
                reject(new Error(ERROR_MESSAGES.NO_ACTIVE_RECORDING));
                return;
            }

            this.mediaRecorder.addEventListener("stop", () => {
                const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });
                this.audioChunks = [];
                // Stop all tracks to release the microphone
                this.mediaRecorder?.stream.getTracks().forEach(track => track.stop());
                this.mediaRecorder = null;
                resolve(audioBlob);
            });

            this.mediaRecorder.stop();
        });
    }

    isRecording(): boolean {
        return this.mediaRecorder?.state === "recording";
    }

    /**
     * Parse media device errors and provide user-friendly messages
     */
    private parseMediaError(error: unknown): RecordingError {
        if (error instanceof DOMException) {
            switch (error.name) {
                case 'NotAllowedError':
                case 'PermissionDeniedError':
                    return {
                        type: 'permission_denied',
                        message: ERROR_MESSAGES.MICROPHONE_PERMISSION_DENIED,
                        originalError: error
                    };
                case 'NotFoundError':
                case 'DevicesNotFoundError':
                    return {
                        type: 'not_found',
                        message: ERROR_MESSAGES.MICROPHONE_NOT_FOUND,
                        originalError: error
                    };
                default:
                    return {
                        type: 'general',
                        message: ERROR_MESSAGES.MICROPHONE_GENERAL_ERROR,
                        originalError: error
                    };
            }
        }

        return {
            type: 'general',
            message: ERROR_MESSAGES.MICROPHONE_GENERAL_ERROR,
            originalError: error instanceof Error ? error : new Error(String(error))
        };
    }
}
