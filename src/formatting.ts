import { requestUrl } from 'obsidian';
import { ServiceProvider, FormattingTemplate, TEMPLATE_MESSAGES } from './constants';

interface FormattingResult {
    text: string;
    success: boolean;
}

export class FormattingService {

    /**
     * Format transcription text using AI based on the selected template
     */
    async formatTranscription(
        transcriptionText: string,
        template: FormattingTemplate,
        apiKey: string,
        serviceProvider: ServiceProvider
    ): Promise<FormattingResult> {
        // If template has no prompt (like 'none'), return original text
        if (!template.prompt || template.id === 'none') {
            return { text: transcriptionText, success: true };
        }

        const fullPrompt = `${template.prompt}\n\n${transcriptionText}`;

        try {
            const formattedText = await this.callChatAPI(fullPrompt, apiKey, serviceProvider);
            return { text: formattedText, success: true };
        } catch (error) {
            console.error('Formatting error:', error);
            // Return original text if formatting fails
            return { text: transcriptionText, success: false };
        }
    }

    /**
     * Call OpenAI or Groq Chat API for text formatting
     */
    private async callChatAPI(
        prompt: string,
        apiKey: string,
        serviceProvider: ServiceProvider
    ): Promise<string> {
        const endpoint = serviceProvider === 'openai'
            ? 'https://api.openai.com/v1/chat/completions'
            : 'https://api.groq.com/openai/v1/chat/completions';

        const model = serviceProvider === 'openai'
            ? 'gpt-4o-mini'  // Cost-effective model for formatting
            : 'llama-3.1-8b-instant';  // Fast Groq model

        const response = await requestUrl({
            url: endpoint,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: '당신은 전문 문서 정리 도우미입니다. 사용자가 제공하는 전사 내용을 요청된 형식에 맞게 깔끔하게 정리해주세요. 마크다운 형식을 사용하고, 원본 내용의 핵심을 유지하면서 구조화해주세요.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,  // Lower temperature for consistent formatting
                max_tokens: 4000
            })
        });

        if (response.status !== 200) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = response.json;
        return data.choices[0].message.content;
    }
}
