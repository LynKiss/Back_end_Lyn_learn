import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'fs/promises';

interface WritingReviewInput {
  prompt: string;
  content: string;
  targetLanguage: string;
  feedbackLanguage: string;
}

interface SpeakingReviewInput {
  prompt: string;
  transcript: string;
  targetLanguage: string;
  feedbackLanguage: string;
}

@Injectable()
export class AiService {
  constructor(private readonly config: ConfigService) {}

  async reviewWriting(input: WritingReviewInput) {
    const system =
      'You are a strict but helpful language teacher. Return only valid JSON.';
    const user = [
      `Target language: ${input.targetLanguage}`,
      `Feedback language: ${input.feedbackLanguage}`,
      `Prompt: ${input.prompt}`,
      `Student writing: ${input.content}`,
      'Return JSON with overallScore, grammarScore, vocabularyScore, coherenceScore, taskAchievementScore, correctedText, feedback[], nextSteps[]. Scores are 0-10.',
    ].join('\n\n');
    return this.callReviewModel(system, user);
  }

  async reviewSpeaking(input: SpeakingReviewInput) {
    const system =
      'You are a language speaking examiner. Return only valid JSON.';
    const user = [
      `Target language: ${input.targetLanguage}`,
      `Feedback language: ${input.feedbackLanguage}`,
      `Speaking prompt: ${input.prompt}`,
      `Transcript: ${input.transcript}`,
      'Return JSON with pronunciationScore, fluencyScore, accuracyScore, contentScore, feedback[], nextSteps[]. Scores are 0-10.',
    ].join('\n\n');
    return this.callReviewModel(system, user);
  }

  getReviewModel() {
    if (this.config.get<string>('ai.supportBotApiKey', '')) {
      return this.config.get<string>('ai.supportBotModel', 'gemini-2.5-flash');
    }
    return this.config.get<string>('ai.anthropicModel', 'claude-sonnet-4-6');
  }

  // Có cấu hình STT server (OpenAI) hay không.
  canTranscribe(): boolean {
    return !!this.config.get<string>('ai.openaiApiKey', '');
  }

  async transcribeAudio(filePath: string, mimeType = 'audio/webm') {
    const apiKey = this.config.get<string>('ai.openaiApiKey', '');
    if (!apiKey) throw new ServiceUnavailableException('OPENAI_API_KEY chưa được cấu hình');

    const model = this.config.get<string>(
      'ai.openaiTranscribeModel',
      'gpt-4o-mini-transcribe',
    );
    const bytes = await readFile(filePath);
    const form = new FormData();
    form.append('model', model);
    form.append('file', new Blob([bytes], { type: mimeType }), 'speech.webm');
    form.append('response_format', 'json');

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new ServiceUnavailableException(
        data?.error?.message ?? 'OpenAI transcription thất bại',
      );
    }
    return String(data?.text ?? '');
  }

  private async callReviewModel(system: string, user: string) {
    const supportKey = this.config.get<string>('ai.supportBotApiKey', '');
    if (supportKey) return this.callOpenAiCompatible(system, user);
    return this.callClaude(system, user);
  }

  private async callOpenAiCompatible(system: string, user: string) {
    const apiKey = this.config.get<string>('ai.supportBotApiKey', '');
    const model = this.config.get<string>('ai.supportBotModel', 'gemini-2.5-flash');
    const baseUrl = this.config
      .get<string>(
        'ai.supportBotApiBaseUrl',
        'https://generativelanguage.googleapis.com/v1beta/openai',
      )
      .replace(/\/+$/, '');
    // Timeout dài hơn cho mô hình có "thinking"; retry khi nhà cung cấp quá tải.
    const timeoutMs = this.config.get<number>('ai.supportBotTimeoutMs', 30000);
    const maxAttempts = 3;
    let lastError = 'Support bot review thất bại';

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            model,
            temperature: 0.2,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
          }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok) {
          const text = data?.choices?.[0]?.message?.content ?? '{}';
          return this.parseJsonResponse(text);
        }
        lastError = data?.error?.message ?? `HTTP ${res.status}`;
        // Chỉ retry với lỗi tạm thời (quá tải / giới hạn tần suất).
        if (![429, 500, 502, 503, 504].includes(res.status)) break;
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'network error';
      } finally {
        clearTimeout(timeout);
      }
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 800 * attempt));
      }
    }
    throw new ServiceUnavailableException(lastError);
  }

  private async callClaude(system: string, user: string) {
    const apiKey = this.config.get<string>('ai.anthropicApiKey', '');
    if (!apiKey) throw new ServiceUnavailableException('ANTHROPIC_API_KEY chưa được cấu hình');

    const model = this.config.get<string>('ai.anthropicModel', 'claude-sonnet-4-6');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1600,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new ServiceUnavailableException(
        data?.error?.message ?? 'Anthropic review thất bại',
      );
    }
    const text = data?.content?.[0]?.text ?? '{}';
    return this.parseJsonResponse(text);
  }

  private parseJsonResponse(text: string) {
    try {
      return JSON.parse(text);
    } catch {
      return { rawFeedback: text };
    }
  }
}
