'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  Mic,
  Pause,
  Pill,
  Play,
  Plus,
  Save,
  Sparkles,
  Square,
  Trash2,
  TriangleAlert,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import {
  getConsultationView,
  updateConsultationDraft,
  type ConsultationDraftPatch,
} from '@/lib/demo/repository';
import { useDemoSnapshot } from '@/lib/demo/use-demo';
import type { ConsultationReportInput, DemoConsultation } from '@/lib/demo/types';
import {
  DemoAudioRecorder,
  RecordingError,
  recordingSupported,
  type RecorderState,
  type RecordingResult,
} from '@/lib/recording/media-recorder';
import {
  getLiveTranscriptionProvider,
  serverTranscriptionProvider,
} from '@/lib/ai/transcription-provider';
import { getReportProvider } from '@/lib/ai/report-provider';
import type {
  AiLocale,
  LiveTranscriptionProvider,
  LiveTranscriptionSession,
  TranscriptionState,
} from '@/lib/ai/types';
import { cn, formatDate, toDateInputValue } from '@/lib/utils';

type ReportFields = ConsultationReportInput;

function emptyReport(): ReportFields {
  return {
    reason: '',
    symptoms: null,
    examination: null,
    diagnosis: null,
    treatment: null,
    recommendations: null,
    followUpDate: null,
    prescriptions: [],
  };
}

function fromConsultation(consultation: DemoConsultation): ReportFields {
  return {
    reason: consultation.reason,
    symptoms: consultation.symptoms,
    examination: consultation.examination,
    diagnosis: consultation.diagnosis,
    treatment: consultation.treatment,
    recommendations: consultation.recommendations,
    followUpDate: consultation.followUpDate,
    prescriptions: consultation.prescriptions.map((row) => ({
      medication: row.medication,
      dosage: row.dosage,
      frequency: row.frequency,
      duration: row.duration,
      notes: row.notes,
    })),
  };
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

function ageFromBirthDate(value: string | null): number | null {
  if (!value) return null;
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

function Panel({
  icon,
  title,
  children,
  tone = 'primary',
  className,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  tone?: 'primary' | 'accent' | 'success' | 'mint';
  className?: string;
}) {
  const toneClass =
    tone === 'accent'
      ? 'bg-accent-100 text-accent-500'
      : tone === 'success'
        ? 'bg-[#E9F6F1] text-success'
        : tone === 'mint'
          ? 'bg-[#E9F1FD] text-[#5B8FCF]'
          : 'bg-primary-50 text-primary-600';
  return (
    <section className={cn('rounded-3xl bg-white p-5 shadow-card ring-1 ring-line/70 sm:p-6', className)}>
      <div className="mb-4 flex items-center gap-2.5">
        <span className={cn('grid h-9 w-9 place-items-center rounded-xl [&>svg]:h-4 [&>svg]:w-4', toneClass)}>
          {icon}
        </span>
        <h2 className="text-sm font-bold text-ink-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function ConsultationWorkspace({
  consultationId,
  doctorId,
}: {
  consultationId: string;
  doctorId: string;
}) {
  const t = useTranslations('doctor.workspace');
  const tc = useTranslations('common');
  const locale = useLocale();
  const db = useDemoSnapshot();
  // `db` est une dépendance volontaire pour recalculer la vue à chaque mutation
  // du repository (le snapshot pilote l'abonnement, pas le contenu du callback).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const view = useMemo(() => getConsultationView(consultationId), [db, consultationId]);

  const [fields, setFields] = useState<ReportFields>(() =>
    view ? fromConsultation(view.consultation) : emptyReport(),
  );
  const [transcript, setTranscript] = useState(view?.consultation.transcript ?? '');
  const [transcriptSource, setTranscriptSource] = useState(
    view?.consultation.transcriptSource ?? null,
  );
  const [reportSource, setReportSource] = useState(view?.consultation.reportSource ?? null);
  const [generatedAt, setGeneratedAt] = useState(view?.consultation.reportGeneratedAt ?? null);
  const [audioDuration, setAudioDuration] = useState(view?.consultation.audioDurationSec ?? null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [recorderState, setRecorderState] = useState<RecorderState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [audio, setAudio] = useState<RecordingResult | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [micSupported, setMicSupported] = useState(false);
  const [liveProvider, setLiveProvider] = useState<LiveTranscriptionProvider | null>(null);
  const [serverTranscriptionReady, setServerTranscriptionReady] = useState(false);
  const [liveState, setLiveState] = useState<TranscriptionState>('idle');
  const [interim, setInterim] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const [generating, setGenerating] = useState(false);

  const recorderRef = useRef<DemoAudioRecorder | null>(null);
  const liveSessionRef = useRef<LiveTranscriptionSession | null>(null);
  const audioRef = useRef<RecordingResult | null>(null);
  const initializedRef = useRef<string | null>(null);

  const consultation = view?.consultation ?? null;
  const readOnly = !consultation || consultation.status !== 'DRAFT';
  const patient = view?.patient ?? null;
  const patientUser = view?.patientUser ?? null;
  const reportProvider = useMemo(() => getReportProvider(), []);

  useEffect(() => {
    // Ces capacités dépendent du navigateur : on les détecte après l'hydratation
    // pour éviter tout écart entre le rendu serveur et le rendu client.
    setMicSupported(recordingSupported());
    setLiveProvider(getLiveTranscriptionProvider());
    setServerTranscriptionReady(serverTranscriptionProvider.available());
    return () => {
      liveSessionRef.current?.stop();
      recorderRef.current?.cancel();
      if (audioRef.current) URL.revokeObjectURL(audioRef.current.url);
    };
  }, []);

  useEffect(() => {
    if (!consultation || initializedRef.current === consultation.id) return;
    initializedRef.current = consultation.id;
    setFields(fromConsultation(consultation));
    setTranscript(consultation.transcript ?? '');
    setTranscriptSource(consultation.transcriptSource ?? null);
    setReportSource(consultation.reportSource ?? null);
    setGeneratedAt(consultation.reportGeneratedAt ?? null);
    setAudioDuration(consultation.audioDurationSec ?? null);
    setDirty(false);
  }, [consultation]);

  useEffect(() => {
    if (recorderState !== 'recording' || !recorderRef.current) return;
    const timer = setInterval(() => setElapsed(recorderRef.current?.elapsedSeconds() ?? 0), 250);
    return () => clearInterval(timer);
  }, [recorderState]);

  const saveDraft = useCallback(async () => {
    if (!consultation || readOnly || saving) return;
    setSaving(true);
    try {
      const patch: ConsultationDraftPatch = {
        ...fields,
        transcript: transcript.trim() || null,
        transcriptSource,
        reportSource,
        reportGeneratedAt: generatedAt,
        audioDurationSec: audioDuration,
      };
      updateConsultationDraft(consultation.id, patch);
      setDirty(false);
    } catch {
      toast.error(t('saveError'));
    } finally {
      setSaving(false);
    }
  }, [
    audioDuration,
    consultation,
    fields,
    generatedAt,
    readOnly,
    reportSource,
    saving,
    t,
    transcript,
    transcriptSource,
  ]);

  useEffect(() => {
    if (!dirty || readOnly || saving) return;
    const timer = setTimeout(() => void saveDraft(), 900);
    return () => clearTimeout(timer);
  }, [dirty, readOnly, saving, saveDraft, fields, transcript]);

  function markDirty() {
    if (!readOnly) setDirty(true);
  }

  function setField<K extends keyof ReportFields>(key: K, value: ReportFields[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
    markDirty();
  }

  function updatePrescription(index: number, key: keyof ReportFields['prescriptions'][number], value: string) {
    setFields((prev) => ({
      ...prev,
      prescriptions: prev.prescriptions.map((row, i) =>
        i === index ? { ...row, [key]: value } : row,
      ),
    }));
    markDirty();
  }

  function addPrescription() {
    setFields((prev) => ({
      ...prev,
      prescriptions: [
        ...prev.prescriptions,
        { medication: '', dosage: '', frequency: '', duration: '', notes: null },
      ],
    }));
    markDirty();
  }

  function removePrescription(index: number) {
    setFields((prev) => ({
      ...prev,
      prescriptions: prev.prescriptions.filter((_, i) => i !== index),
    }));
    markDirty();
  }

  const startLive = useCallback(() => {
    if (!liveProvider || liveSessionRef.current) return;
    liveSessionRef.current = liveProvider.start(locale as AiLocale, {
      onFinal(text) {
        setTranscript((prev) => `${prev}${prev.trim() ? ' ' : ''}${text}`);
        setTranscriptSource('live');
        setDirty(true);
      },
      onInterim(text) {
        setInterim(text);
      },
      onState(state) {
        setLiveState(state);
      },
      onError(message) {
        setLiveState('error');
        if (message === 'MIC_PERMISSION') setAudioError(t('micDenied'));
      },
    });
  }, [liveProvider, locale, t]);

  const stopLive = useCallback(() => {
    liveSessionRef.current?.stop();
    liveSessionRef.current = null;
    setInterim('');
  }, []);

  async function startRecording() {
    setAudioError(null);
    try {
      const recorder = recorderRef.current ?? new DemoAudioRecorder();
      recorderRef.current = recorder;
      await recorder.start();
      setRecorderState('recording');
      setElapsed(0);
      if (audioRef.current) URL.revokeObjectURL(audioRef.current.url);
      setAudio(null);
      audioRef.current = null;
      if (liveProvider) startLive();
      else setLiveState('unsupported');
    } catch (error) {
      const code = error instanceof RecordingError ? error.code : 'FAILED';
      setAudioError(
        code === 'PERMISSION_DENIED'
          ? t('micDenied')
          : code === 'NO_DEVICE'
            ? t('micUnavailable')
            : t('recordingUnsupported'),
      );
    }
  }

  function pauseRecording() {
    recorderRef.current?.pause();
    setRecorderState('paused');
    stopLive();
  }

  function resumeRecording() {
    recorderRef.current?.resume();
    setRecorderState('recording');
    if (liveProvider) startLive();
  }

  async function stopRecording() {
    try {
      const result = await recorderRef.current?.stop();
      if (result) {
        setAudio(result);
        audioRef.current = result;
        setElapsed(result.durationSec);
        setAudioDuration(result.durationSec);
        markDirty();
        toast.success(t('recordingSaved'));
      }
      setRecorderState('stopped');
      stopLive();
      setLiveState('stopped');
    } catch {
      setAudioError(t('recordingUnsupported'));
      setRecorderState('stopped');
      stopLive();
    }
  }

  function discardRecording() {
    recorderRef.current?.cancel();
    recorderRef.current = null;
    stopLive();
    setLiveState('idle');
    if (audioRef.current) URL.revokeObjectURL(audioRef.current.url);
    setAudio(null);
    audioRef.current = null;
    setRecorderState('idle');
    setElapsed(0);
    setAudioError(null);
  }

  async function transcribeWithServer() {
    if (!audio || !serverTranscriptionReady || transcribing) return;
    setTranscribing(true);
    try {
      const result = await serverTranscriptionProvider.transcribe(audio.blob, locale as AiLocale);
      setTranscript((prev) => `${prev}${prev.trim() ? '\n' : ''}${result.text}`);
      setTranscriptSource('post-recording');
      markDirty();
    } catch {
      toast.error(t('reportError'));
    } finally {
      setTranscribing(false);
    }
  }

  async function generateReport() {
    if (!transcript.trim()) {
      toast.error(t('transcriptRequired'));
      return;
    }
    setGenerating(true);
    try {
      const result = await reportProvider.generate({
        transcript,
        reason: fields.reason,
        locale: locale as AiLocale,
        patient: {
          fullName: patientUser?.fullName,
          age: ageFromBirthDate(patient?.birthDate ?? null),
          gender: patient?.gender,
          bloodType: patient?.bloodType,
          allergies: patient?.allergies,
          chronicDiseases: patient?.chronicDiseases,
        },
      });
      setFields(result.report);
      setReportSource(result.source);
      setGeneratedAt(new Date().toISOString());
      markDirty();
      toast.success(result.warning ?? t('reportGenerated'));
    } catch {
      toast.error(t('reportError'));
    } finally {
      setGenerating(false);
    }
  }

  if (!view || !consultation) {
    return (
      <div>
        <PageHeader title={t('noConsultation')} subtitle={t('noConsultationBody')} />
        <Link href={`/${locale}/doctor/consultations`} className="btn-violet">
          {t('back')}
        </Link>
      </div>
    );
  }

  const sourceLabel =
    reportSource === 'server'
      ? t('sourceServer')
      : reportSource === 'local'
        ? t('sourceLocal')
        : reportSource === 'manual'
          ? t('sourceManual')
          : null;

  return (
    <div className="animate-fade-up">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <Link
            href={`/${locale}/doctor/consultations`}
            className="btn-outline h-10 px-4 text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
            {t('back')}
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-3xl bg-white px-5 py-4 shadow-card ring-1 ring-line/70">
        <span className="text-sm font-bold text-ink-900">{consultation.reason}</span>
        <StatusBadge status={consultation.status} />
        <span className="text-[11px] text-ink-400">
          {formatDate(consultation.consultedAt, locale, {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}
        </span>
        {sourceLabel ? (
          <span className="rounded-full bg-primary-50 px-3 py-1 text-[10px] font-semibold text-primary-700">
            {sourceLabel}
          </span>
        ) : null}
      </div>

      {readOnly ? (
        <div className="mb-4 flex items-start gap-2.5 rounded-2xl bg-[#E9F6F1] px-4 py-3 text-xs text-success ring-1 ring-[#D8F0E7]">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-bold">
              {consultation.status === 'LINKED' ? t('linkedTitle') : t('readOnlyTitle')}
            </p>
            <p className="mt-0.5 text-ink-500">
              {consultation.status === 'LINKED'
                ? t('linkedBody')
                : t('readOnlyBody')}
            </p>
            {consultation.approvedAt ? (
              <p className="mt-1 text-[10px] text-ink-400">
                {t('approvedOn', {
                  date: formatDate(consultation.approvedAt, locale, {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  }),
                })}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <Panel icon={<UserRound />} title={t('patientContext')} tone="mint">
            {patient && patientUser ? (
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-ink-900">{patientUser.fullName}</p>
                  <span className="ltr-code rounded-full bg-primary-50 px-2.5 py-1 text-[10px] font-semibold text-primary-700">
                    {patient.patientCode}
                  </span>
                  <Link
                    href={`/${locale}/doctor/patients/${patient.id}`}
                    className="ms-auto text-[11px] font-bold text-primary-600 hover:underline"
                  >
                    {t('openPatientFile')}
                    <ArrowRight className="ms-1 inline h-3 w-3 rtl:rotate-180" />
                  </Link>
                </div>
                <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-2">
                  <p className="rounded-xl bg-primary-50/70 px-3 py-2 text-ink-600">
                    {t('age')}: {ageFromBirthDate(patient.birthDate) ?? '—'}
                  </p>
                  <p className="rounded-xl bg-primary-50/70 px-3 py-2 text-ink-600">
                    {t('bloodType')}: {patient.bloodType ?? t('none')}
                  </p>
                  <p className="rounded-xl bg-primary-50/70 px-3 py-2 text-ink-600">
                    {t('allergies')}: {patient.allergies.join(', ') || t('none')}
                  </p>
                  <p className="rounded-xl bg-primary-50/70 px-3 py-2 text-ink-600">
                    {t('chronic')}: {patient.chronicDiseases.join(', ') || t('none')}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm font-bold text-ink-900">{t('noPatient')}</p>
                <p className="mt-1 text-[11px] text-ink-500">{t('noPatientBody')}</p>
              </div>
            )}
          </Panel>

          <Panel icon={<Mic />} title={t('recordingTitle')}>
            <p className="text-[11px] leading-relaxed text-ink-500">{t('recordingBody')}</p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {recorderState === 'idle' || recorderState === 'stopped' ? (
                <Button
                  type="button"
                  variant="violet"
                  size="sm"
                  onClick={() => void startRecording()}
                  disabled={readOnly || !micSupported}
                >
                  <Mic className="h-4 w-4" />
                  {recorderState === 'stopped' ? t('record') : t('record')}
                </Button>
              ) : null}

              {recorderState === 'recording' ? (
                <>
                  <Button type="button" variant="soft" size="sm" onClick={pauseRecording}>
                    <Pause className="h-4 w-4" />
                    {t('pause')}
                  </Button>
                  <Button type="button" variant="danger" size="sm" onClick={() => void stopRecording()}>
                    <Square className="h-3.5 w-3.5" />
                    {t('stop')}
                  </Button>
                </>
              ) : null}

              {recorderState === 'paused' ? (
                <>
                  <Button type="button" variant="violet" size="sm" onClick={resumeRecording}>
                    <Play className="h-4 w-4" />
                    {t('resume')}
                  </Button>
                  <Button type="button" variant="danger" size="sm" onClick={() => void stopRecording()}>
                    <Square className="h-3.5 w-3.5" />
                    {t('stop')}
                  </Button>
                </>
              ) : null}

              {audio && !readOnly ? (
                <Button type="button" variant="ghost" size="sm" onClick={discardRecording}>
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('discard')}
                </Button>
              ) : null}

              <span className="ltr-code ms-auto rounded-full bg-ink-900 px-3 py-1.5 text-xs font-bold text-white">
                {t('timer')}: {formatDuration(elapsed)}
              </span>
            </div>

            {!micSupported ? (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#FDF4DE] px-3 py-2 text-[11px] text-[#8A6A18]">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {t('recordingUnsupported')}
              </p>
            ) : null}
            {audioError ? (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#FDECEC] px-3 py-2 text-[11px] text-danger">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {audioError}
              </p>
            ) : null}
            {audio ? (
              <div className="mt-4 rounded-2xl bg-primary-50/70 p-3">
                <p className="mb-2 text-[10px] font-semibold text-ink-500">
                  {t('playback')} · {t('audioDuration', { duration: formatDuration(audio.durationSec) })}
                </p>
                <audio controls src={audio.url} className="w-full" />
              </div>
            ) : null}
          </Panel>

          <Panel icon={<AudioLines />} title={t('liveTitle')} tone="accent">
            {liveProvider ? (
              <div>
                <p className="text-[11px] leading-relaxed text-ink-500">
                  {liveProvider.label} · {t('liveSupported')}
                </p>
                {liveState === 'listening' ? (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-success">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                    {t('liveListening')}
                  </p>
                ) : null}
                {interim ? (
                  <p className="mt-2 rounded-xl bg-primary-50/70 px-3 py-2 text-[11px] italic text-ink-400">
                    {t('liveInterim')}: {interim}
                  </p>
                ) : null}
              </div>
            ) : (
              <div>
                <p className="text-[11px] font-semibold text-ink-700">{t('liveUnsupported')}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
                  {t('liveUnsupportedBody')}
                </p>
              </div>
            )}

            {audio && serverTranscriptionReady ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => void transcribeWithServer()}
                disabled={transcribing || readOnly}
              >
                {transcribing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {transcribing ? t('transcribing') : t('transcribeServer')}
              </Button>
            ) : null}
          </Panel>

          <Panel icon={<FileText />} title={t('transcriptTitle')}>
            <p className="mb-3 text-[11px] text-ink-500">{t('transcriptBody')}</p>
            <Textarea
              value={transcript}
              onChange={(event) => {
                setTranscript(event.target.value);
                if (liveState !== 'listening') setTranscriptSource('manual');
                markDirty();
              }}
              placeholder={t('transcriptPlaceholder')}
              rows={7}
              disabled={readOnly}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {transcriptSource ? (
                <span className="rounded-full bg-primary-50 px-3 py-1 text-[10px] font-semibold text-primary-700">
                  {transcriptSource === 'live'
                    ? t('transcriptSourceLive')
                    : transcriptSource === 'post-recording'
                      ? t('transcriptSourcePost')
                      : t('transcriptSourceManual')}
                </span>
              ) : null}
              {!readOnly ? (
                <Button
                  type="button"
                  variant="soft"
                  size="sm"
                  className="ms-auto"
                  onClick={() => void saveDraft()}
                  disabled={saving || !dirty}
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {t('saveTranscript')}
                </Button>
              ) : null}
            </div>
          </Panel>

          <Panel icon={<ClipboardList />} title={t('reportTitle')} tone="success">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <p className="max-w-md text-[11px] leading-relaxed text-ink-500">{t('reportBody')}</p>
              {!readOnly ? (
                <Button
                  type="button"
                  variant="violet"
                  size="sm"
                  onClick={() => void generateReport()}
                  disabled={generating || !transcript.trim()}
                >
                  {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {generating ? t('generatingReport') : t('generateReport')}
                </Button>
              ) : null}
            </div>

            <p className="mb-4 flex items-start gap-2 rounded-xl bg-primary-50/70 px-3 py-2 text-[10px] leading-relaxed text-ink-500">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-500" />
              {reportProvider.source === 'local' ? t('localProviderNote') : t('serverProviderNote')}
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="report-reason">{t('reason')}</Label>
                <Input
                  id="report-reason"
                  value={fields.reason}
                  onChange={(event) => setField('reason', event.target.value)}
                  disabled={readOnly}
                />
              </div>
              <div>
                <Label htmlFor="report-symptoms">{t('symptoms')}</Label>
                <Textarea
                  id="report-symptoms"
                  value={fields.symptoms ?? ''}
                  onChange={(event) => setField('symptoms', event.target.value || null)}
                  rows={3}
                  disabled={readOnly}
                />
              </div>
              <div>
                <Label htmlFor="report-examination">{t('examination')}</Label>
                <Textarea
                  id="report-examination"
                  value={fields.examination ?? ''}
                  onChange={(event) => setField('examination', event.target.value || null)}
                  rows={3}
                  disabled={readOnly}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="report-diagnosis">{t('diagnosis')}</Label>
                <Textarea
                  id="report-diagnosis"
                  value={fields.diagnosis ?? ''}
                  onChange={(event) => setField('diagnosis', event.target.value || null)}
                  rows={2}
                  disabled={readOnly}
                />
              </div>
              <div>
                <Label htmlFor="report-treatment">{t('treatment')}</Label>
                <Textarea
                  id="report-treatment"
                  value={fields.treatment ?? ''}
                  onChange={(event) => setField('treatment', event.target.value || null)}
                  rows={3}
                  disabled={readOnly}
                />
              </div>
              <div>
                <Label htmlFor="report-recommendations">{t('recommendations')}</Label>
                <Textarea
                  id="report-recommendations"
                  value={fields.recommendations ?? ''}
                  onChange={(event) => setField('recommendations', event.target.value || null)}
                  rows={3}
                  disabled={readOnly}
                />
              </div>
              <div>
                <Label htmlFor="report-follow-up">{t('followUp')}</Label>
                <Input
                  id="report-follow-up"
                  type="date"
                  value={toDateInputValue(fields.followUpDate)}
                  onChange={(event) => setField('followUpDate', event.target.value || null)}
                  disabled={readOnly}
                />
              </div>
            </div>

            <div className="mt-5 border-t border-line pt-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-ink-900">{t('prescriptions')}</p>
                {!readOnly ? (
                  <Button type="button" variant="soft" size="sm" onClick={addPrescription}>
                    <Plus className="h-3.5 w-3.5" />
                    {t('addPrescription')}
                  </Button>
                ) : null}
              </div>

              {fields.prescriptions.length === 0 ? (
                <p className="mt-3 text-[11px] text-ink-400">{tc('none')}</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {fields.prescriptions.map((row, index) => (
                    <div
                      key={index}
                      className="rounded-2xl bg-primary-50/50 p-3 ring-1 ring-line/60"
                    >
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <Label htmlFor={`rx-med-${index}`}>{t('medication')}</Label>
                          <Input
                            id={`rx-med-${index}`}
                            value={row.medication}
                            onChange={(event) => updatePrescription(index, 'medication', event.target.value)}
                            disabled={readOnly}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`rx-dose-${index}`}>{t('dosage')}</Label>
                          <Input
                            id={`rx-dose-${index}`}
                            value={row.dosage}
                            onChange={(event) => updatePrescription(index, 'dosage', event.target.value)}
                            disabled={readOnly}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`rx-freq-${index}`}>{t('frequency')}</Label>
                          <Input
                            id={`rx-freq-${index}`}
                            value={row.frequency}
                            onChange={(event) => updatePrescription(index, 'frequency', event.target.value)}
                            disabled={readOnly}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`rx-duration-${index}`}>{t('duration')}</Label>
                          <Input
                            id={`rx-duration-${index}`}
                            value={row.duration}
                            onChange={(event) => updatePrescription(index, 'duration', event.target.value)}
                            disabled={readOnly}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label htmlFor={`rx-notes-${index}`}>{t('notes')}</Label>
                          <Input
                            id={`rx-notes-${index}`}
                            value={row.notes ?? ''}
                            onChange={(event) => updatePrescription(index, 'notes', event.target.value)}
                            disabled={readOnly}
                          />
                        </div>
                      </div>
                      {!readOnly ? (
                        <button
                          type="button"
                          onClick={() => removePrescription(index)}
                          className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-danger hover:underline"
                        >
                          <Trash2 className="h-3 w-3" />
                          {t('removePrescription')}
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {generatedAt ? (
              <p className="mt-4 text-[10px] text-ink-400">
                {t('generatedAt', {
                  date: formatDate(generatedAt, locale, {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                })}
              </p>
            ) : null}
          </Panel>
        </div>

        <aside className="space-y-4 lg:col-span-4">
          <div className="rounded-3xl bg-primary-600 p-5 text-white shadow-soft">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
              {t('title')}
            </p>
            <h2 className="mt-2 text-lg font-bold">{t('reviewCta')}</h2>
            <p className="mt-2 text-[11px] leading-relaxed text-white/70">{t('reviewHint')}</p>
            {!readOnly ? (
              <div className="mt-4 space-y-2">
                <Button
                  type="button"
                  variant="white"
                  size="md"
                  className="w-full"
                  onClick={() => void saveDraft()}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? t('saving') : t('saveDraft')}
                </Button>
                <Link
                  href={`/${locale}/doctor/consultations/${consultation.id}/finish`}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white/15 text-sm font-semibold text-white transition-colors hover:bg-white/25"
                >
                  {t('reviewCta')}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </Link>
                {!fields.diagnosis?.trim() ? (
                  <p className="text-[10px] text-white/70">{t('approvalRequired')}</p>
                ) : null}
              </div>
            ) : (
              <Link
                href={`/${locale}/doctor/consultations/${consultation.id}/finish`}
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold text-primary-700"
              >
                {tc('view')}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
            )}
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-line/70">
            <p className="text-xs font-bold text-ink-900">{tc('demoMode')}</p>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-500">{t('demoNotice')}</p>
            {!readOnly ? (
              <p className="mt-2 flex items-center gap-1.5 text-[10px] text-success">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {dirty ? tc('saving') : t('autoSave')}
              </p>
            ) : null}
          </div>

          {audioDuration !== null ? (
            <div className="flex items-center gap-2 rounded-2xl bg-[#E9F1FD] px-4 py-3 text-[11px] font-semibold text-[#5B8FCF]">
              <Pill className="h-3.5 w-3.5" />
              {t('audioDuration', { duration: formatDuration(audioDuration) })}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
