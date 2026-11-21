import type {
  AiLocale,
  LiveTranscriptionHandlers,
  LiveTranscriptionProvider,
  LiveTranscriptionSession,
  PostRecordingTranscriptionProvider,
} from './types';
import { AiProviderError, serverAiEnabled } from './report-provider';

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

type SpeechRecognitionErrorLike = {
  error: string;
  message?: string;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const candidate =
    (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor })
      .webkitSpeechRecognition;
  return candidate ?? null;
}

export function liveTranscriptionSupported(): boolean {
  return getSpeechRecognition() !== null;
}

function speechLang(locale: AiLocale): string {
  return locale === 'ar' ? 'ar-MA' : 'fr-FR';
}

/**
 * Transcription en direct via l'API Web Speech du navigateur.
 * Elle n'est pas disponible partout (Firefox, certains navigateurs mobiles) :
 * l'interface doit alors l'indiquer clairement et proposer le mode manuel.
 */
export const webSpeechProvider: LiveTranscriptionProvider = {
  id: 'web-speech',
  label: 'Reconnaissance vocale du navigateur',
  mode: 'live',
  available: liveTranscriptionSupported,
  start(locale, handlers): LiveTranscriptionSession {
    const Constructor = getSpeechRecognition();
    if (!Constructor) {
      handlers.onState('unsupported');
      return { stop: () => undefined };
    }

    let stopped = false;
    let restartTimer: ReturnType<typeof setTimeout> | null = null;
    const recognition = new Constructor();
    recognition.lang = speechLang(locale);
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    const finish = (state: 'stopped' | 'error', message?: string) => {
      if (stopped) return;
      stopped = true;
      if (restartTimer) clearTimeout(restartTimer);
      handlers.onState(state, message);
    };

    recognition.onstart = () => handlers.onState('listening');
    recognition.onresult = (event) => {
      let interim = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result[0]?.transcript?.trim();
        if (!text) continue;
        if (result.isFinal) handlers.onFinal(text);
        else interim += `${text} `;
      }
      handlers.onInterim(interim.trim());
    };
    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        handlers.onError('MIC_PERMISSION');
        finish('error', 'MIC_PERMISSION');
        return;
      }
      if (event.error === 'audio-capture') {
        handlers.onError('MIC_UNAVAILABLE');
        finish('error', 'MIC_UNAVAILABLE');
        return;
      }
      handlers.onError(event.error || 'SPEECH_ERROR');
      finish('error', event.error || 'SPEECH_ERROR');
    };
    recognition.onend = () => {
      if (stopped) return;
      // Chrome coupe la reconnaissance après un silence : on relance tant que
      // le médecin n'a pas arrêté explicitement la session.
      restartTimer = setTimeout(() => {
        if (stopped) return;
        try {
          recognition.start();
        } catch {
          finish('error', 'SPEECH_RESTART_FAILED');
        }
      }, 300);
    };

    try {
      handlers.onState('starting');
      recognition.start();
    } catch {
      finish('error', 'SPEECH_START_FAILED');
    }

    return {
      stop() {
        if (stopped) return;
        stopped = true;
        if (restartTimer) clearTimeout(restartTimer);
        try {
          recognition.stop();
        } catch {
          // déjà arrêtée
        }
        handlers.onState('stopped');
      },
    };
  },
};

/**
 * Transcription après l'enregistrement via un service serveur optionnel.
 * Les clés restent côté serveur ; sans configuration, le bouton n'est pas
 * proposé et le médecin peut saisir/corriger le transcript manuellement.
 */
export const serverTranscriptionProvider: PostRecordingTranscriptionProvider = {
  id: 'server-transcription',
  label: 'Transcription serveur configurée',
  mode: 'post-recording',
  available: () => serverAiEnabled() && typeof window !== 'undefined',
  async transcribe(audio, locale) {
    const form = new FormData();
    const extension = audio.type.includes('mp4')
      ? 'm4a'
      : audio.type.includes('ogg')
        ? 'ogg'
        : audio.type.includes('mpeg')
          ? 'mp3'
          : 'webm';
    form.append('audio', audio, `consultation.${extension}`);
    form.append('locale', locale);
    const response = await fetch('/api/ai/transcribe', { method: 'POST', body: form });
    const json = (await response.json().catch(() => null)) as
      | { data?: { text?: string }; error?: { code?: string } }
      | null;
    if (!response.ok || !json?.data?.text) {
      throw new AiProviderError(json?.error?.code ?? 'TRANSCRIPTION_ERROR');
    }
    return { text: json.data.text, provider: 'server-transcription' };
  },
};

export function getLiveTranscriptionProvider(): LiveTranscriptionProvider | null {
  return webSpeechProvider.available() ? webSpeechProvider : null;
}
