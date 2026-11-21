/**
 * Enregistrement audio réel via MediaRecorder.
 *
 * Le flux audio reste en mémoire pendant la session : aucun fichier audio
 * n'est écrit sur le disque ni envoyé à un serveur par défaut. Seuls le
 * transcript et le rapport validé sont conservés dans le repository de démo.
 */

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'paused' | 'stopped';

export type RecordingResult = {
  blob: Blob;
  mimeType: string;
  durationSec: number;
  url: string;
};

export class RecordingError extends Error {
  code: 'UNSUPPORTED' | 'PERMISSION_DENIED' | 'NO_DEVICE' | 'FAILED';

  constructor(code: RecordingError['code'], message?: string) {
    super(message ?? code);
    this.name = 'RecordingError';
    this.code = code;
  }
}

const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/mpeg',
];

export function recordingSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.MediaRecorder !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

export function preferredMimeType(): string | null {
  if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') return null;
  for (const mime of MIME_CANDIDATES) {
    if (window.MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return '';
}

export class DemoAudioRecorder {
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: BlobPart[] = [];
  private startedAt = 0;
  private pausedMs = 0;
  private pauseStartedAt = 0;
  private stopped = false;

  get state(): RecorderState {
    if (!this.recorder) return this.stopped ? 'stopped' : 'idle';
    if (this.recorder.state === 'recording') return 'recording';
    if (this.recorder.state === 'paused') return 'paused';
    return this.stopped ? 'stopped' : 'idle';
  }

  elapsedSeconds(): number {
    if (!this.startedAt) return 0;
    const now = Date.now();
    const paused = this.pausedMs + (this.pauseStartedAt ? now - this.pauseStartedAt : 0);
    return Math.max(0, Math.floor((now - this.startedAt - paused) / 1000));
  }

  async start(): Promise<void> {
    if (!recordingSupported()) {
      throw new RecordingError('UNSUPPORTED', 'MediaRecorder non disponible');
    }
    if (this.recorder && this.recorder.state !== 'inactive') return;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        throw new RecordingError('PERMISSION_DENIED', 'Micro refusé');
      }
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        throw new RecordingError('NO_DEVICE', 'Aucun microphone');
      }
      throw new RecordingError('FAILED', 'Micro indisponible');
    }

    this.stream = stream;
    this.chunks = [];
    this.stopped = false;
    this.pausedMs = 0;
    this.pauseStartedAt = 0;
    this.startedAt = Date.now();

    const mimeType = preferredMimeType();
    try {
      this.recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
    } catch {
      this.releaseStream();
      throw new RecordingError('UNSUPPORTED', 'Format audio non pris en charge');
    }

    this.recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) this.chunks.push(event.data);
    };

    this.recorder.start(1000);
  }

  pause() {
    if (this.recorder?.state === 'recording') {
      this.recorder.pause();
      this.pauseStartedAt = Date.now();
    }
  }

  resume() {
    if (this.recorder?.state === 'paused') {
      this.recorder.resume();
      if (this.pauseStartedAt) this.pausedMs += Date.now() - this.pauseStartedAt;
      this.pauseStartedAt = 0;
    }
  }

  async stop(): Promise<RecordingResult> {
    const recorder = this.recorder;
    if (!recorder) {
      throw new RecordingError('FAILED', 'Aucun enregistrement en cours');
    }
    const durationSec = this.elapsedSeconds();
    if (recorder.state === 'paused' && this.pauseStartedAt) {
      this.pausedMs += Date.now() - this.pauseStartedAt;
      this.pauseStartedAt = 0;
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      const finish = () => {
        const type = recorder.mimeType || this.chunks[0]?.toString() || 'audio/webm';
        resolve(new Blob(this.chunks, { type }));
      };
      recorder.onstop = finish;
      recorder.onerror = () => reject(new RecordingError('FAILED', 'Échec de l’enregistrement'));
      try {
        recorder.stop();
      } catch (error) {
        reject(error instanceof Error ? error : new RecordingError('FAILED'));
      }
    });

    this.stopped = true;
    this.releaseStream();
    const mimeType = blob.type || 'audio/webm';
    return {
      blob,
      mimeType,
      durationSec,
      url: URL.createObjectURL(blob),
    };
  }

  cancel() {
    try {
      if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop();
    } catch {
      // rien à faire : on libère simplement le micro
    }
    this.stopped = true;
    this.releaseStream();
  }

  private releaseStream() {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }
}
