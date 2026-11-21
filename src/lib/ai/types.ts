import type { ConsultationReportInput, ReportSource } from '@/lib/demo/types';

export type AiLocale = 'ar' | 'fr';

export type ReportPatientContext = {
  fullName?: string;
  age?: number | null;
  gender?: 'M' | 'F' | null;
  bloodType?: string | null;
  allergies?: string[];
  chronicDiseases?: string[];
};

export type ReportGenerationInput = {
  transcript: string;
  reason: string;
  locale: AiLocale;
  patient?: ReportPatientContext;
};

export type GeneratedReport = {
  report: ConsultationReportInput;
  source: ReportSource;
  provider: string;
  /** Avertissement affiché au médecin (jamais une validation médicale). */
  warning?: string;
};

export type ReportProvider = {
  id: string;
  label: string;
  source: ReportSource;
  generate(input: ReportGenerationInput): Promise<GeneratedReport>;
};

export type TranscriptionState =
  | 'idle'
  | 'starting'
  | 'listening'
  | 'stopped'
  | 'unsupported'
  | 'error';

export type LiveTranscriptionHandlers = {
  onFinal: (text: string) => void;
  onInterim: (text: string) => void;
  onState: (state: TranscriptionState, message?: string) => void;
  onError: (message: string) => void;
};

export type LiveTranscriptionSession = {
  stop: () => void;
};

export type LiveTranscriptionProvider = {
  id: string;
  label: string;
  mode: 'live';
  available: () => boolean;
  start: (locale: AiLocale, handlers: LiveTranscriptionHandlers) => LiveTranscriptionSession;
};

export type PostRecordingTranscriptionResult = {
  text: string;
  provider: string;
};

export type PostRecordingTranscriptionProvider = {
  id: string;
  label: string;
  mode: 'post-recording';
  available: () => boolean;
  transcribe: (audio: Blob, locale: AiLocale) => Promise<PostRecordingTranscriptionResult>;
};
