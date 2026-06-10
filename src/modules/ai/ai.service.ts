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

export interface TurnCorrection {
  original: string;
  suggestion: string;
  explanation: string;
}

export interface TurnScore {
  pronunciationScore: number;
  fluencyScore: number;
  grammarScore: number;
  vocabularyScore: number;
  naturalnessScore: number;
  taskCompletionScore: number;
  corrections: TurnCorrection[];
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

  // Có model AI thật để hội thoại hay không (không có → dùng mock tất định).
  hasConversationModel(): boolean {
    return (
      !!this.config.get<string>('ai.supportBotApiKey', '') ||
      !!this.config.get<string>('ai.anthropicApiKey', '')
    );
  }

  // Lượt trả lời của AI trong hội thoại. Mock khi không cấu hình AI.
  async conversationReply(input: {
    scenario: string;
    targetLanguage: string;
    history: { role: string; text: string }[];
  }): Promise<string> {
    if (!this.hasConversationModel()) {
      const userTurns = input.history.filter((h) => h.role === 'user').length;
      return this.mockScenarioReply(input.scenario, userTurns);
    }
    const system =
      'You are a friendly conversation partner for language practice. Stay in character for the scenario, keep replies to 1-2 short sentences, and ask a follow-up question. Return only JSON.';
    const user = [
      `Scenario: ${input.scenario}`,
      `Target language: ${input.targetLanguage}`,
      'Conversation so far:',
      input.history.map((h) => `${h.role}: ${h.text}`).join('\n'),
      'Return JSON: { "reply": string }',
    ].join('\n\n');
    const res = (await this.callReviewModel(system, user)) as Record<string, unknown>;
    return (
      (res.reply as string) ??
      (res.rawFeedback as string) ??
      this.mockScenarioReply(input.scenario, 0)
    );
  }

  // Chấm một lượt nói của người học. Mock khi không cấu hình AI.
  async scoreSpeakingTurn(input: {
    targetLanguage: string;
    scenario: string;
    text: string;
  }): Promise<TurnScore> {
    if (!this.hasConversationModel()) {
      return this.mockTurnScore(input.text);
    }
    const system =
      'You are a speaking examiner. Score one learner utterance and list concrete corrections. Return only JSON.';
    const user = [
      `Target language: ${input.targetLanguage}`,
      `Scenario: ${input.scenario}`,
      `Learner said: ${input.text}`,
      'Return JSON with pronunciationScore, fluencyScore, grammarScore, vocabularyScore, naturalnessScore, taskCompletionScore (0-10) and corrections[] of { original, suggestion, explanation }.',
    ].join('\n\n');
    const res = (await this.callReviewModel(system, user)) as Record<string, unknown>;
    if (res.rawFeedback || res.pronunciationScore == null) {
      return this.mockTurnScore(input.text);
    }
    return {
      pronunciationScore: Number(res.pronunciationScore ?? 6),
      fluencyScore: Number(res.fluencyScore ?? 6),
      grammarScore: Number(res.grammarScore ?? 6),
      vocabularyScore: Number(res.vocabularyScore ?? 6),
      naturalnessScore: Number(res.naturalnessScore ?? 6),
      taskCompletionScore: Number(res.taskCompletionScore ?? 6),
      corrections: Array.isArray(res.corrections)
        ? (res.corrections as TurnCorrection[])
        : [],
    };
  }

  private mockScenarioReply(scenario: string, userTurns: number): string {
    const scripts: Record<string, string[]> = {
      cafe: [
        'Hi! Welcome to our cafe. What can I get for you today?',
        'Great choice! Would you like anything to eat with that?',
        'Sure thing. Is that for here or to go?',
        "That'll be $4.50. Anything else for you?",
        'Perfect, your order will be ready shortly. Have a great day!',
      ],
      travel: [
        'Hello! Where are you flying to today?',
        'Wonderful. May I see your passport and boarding pass?',
        'Is this your first time visiting? What are you most excited about?',
        'You are all set. Your gate is B12. Have a pleasant trip!',
      ],
      interview: [
        'Thanks for coming in. Could you tell me a little about yourself?',
        'Interesting. What would you say is your greatest strength?',
        'Why do you want to work with our team?',
        'Great. Do you have any questions for me?',
      ],
      business: [
        'Good morning. Shall we start with the quarterly results?',
        'Could you walk me through the main risks you see?',
        "What's your recommendation for the next steps?",
        "Let's set a follow-up. Does Friday afternoon work for you?",
      ],
      daily: [
        'Hey! How was your day today?',
        'Oh nice. Did you do anything fun this weekend?',
        'That sounds great! Any plans for tomorrow?',
        "Let's catch up again soon. Take care!",
      ],
    };
    const list = scripts[scenario] ?? scripts.daily;
    return list[Math.min(userTurns, list.length - 1)];
  }

  private mockTurnScore(text: string): TurnScore {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const base = Math.max(4, Math.min(9, 4 + Math.round(words / 3)));
    const corrections: TurnCorrection[] = [];
    if (/(^|\s)i(\s|$)/.test(text)) {
      corrections.push({
        original: 'i',
        suggestion: 'I',
        explanation: 'Capitalize the pronoun "I".',
      });
    }
    if (text.trim() && !/[.?!]$/.test(text.trim())) {
      corrections.push({
        original: text.trim().slice(-16),
        suggestion: `${text.trim()}.`,
        explanation: 'End your sentence with punctuation.',
      });
    }
    return {
      pronunciationScore: base,
      fluencyScore: base,
      grammarScore: Math.max(3, base - corrections.length),
      vocabularyScore: base,
      naturalnessScore: base,
      taskCompletionScore: words >= 3 ? base : Math.max(3, base - 2),
      corrections,
    };
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
