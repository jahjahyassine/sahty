import type { ConsultationReportInput } from '@/lib/demo/types';
import type {
  GeneratedReport,
  ReportGenerationInput,
  ReportProvider,
} from './types';

const FRENCH_STOPWORDS = new Set(['le', 'la', 'les', 'un', 'une', 'des', 'et', 'ou', 'de', 'du']);

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u064B-\u0652]/g, '')
    .toLowerCase();
}

function splitSentences(transcript: string): string[] {
  return transcript
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?؟])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 2);
}

const KEYWORDS = {
  diagnosis: [
    'diagnostic',
    'diagnostique',
    'compatible avec',
    'suspicion',
    'semble',
    'conclu',
    'تشخيص',
    'يشتبه',
    'محتمل',
    'نستنتج',
  ],
  examination: [
    'examen',
    'auscultation',
    'tension',
    'ta ',
    'pression',
    'saturation',
    'frequence',
    'temperature',
    'palpation',
    'ecg',
    'glycemie',
    'فحص',
    'ضغط',
    'تسمع',
    'نبض',
    'تشبع',
    'حرارة',
    'سكر',
  ],
  symptoms: [
    'douleur',
    'fievre',
    'toux',
    'essoufflement',
    'dyspnee',
    'nausee',
    'vomissement',
    'vertige',
    'fatigue',
    'cephalee',
    'sifflement',
    'brulure',
    'diarrhee',
    'constipation',
    'ألم',
    'حمى',
    'سعال',
    'ضيق',
    'غثيان',
    'قيء',
    'دوار',
    'تعب',
    'صداع',
    'صفير',
    'إسهال',
    'إمساك',
  ],
  treatment: [
    'traitement',
    'prescri',
    'ordonnance',
    'medicament',
    'arret',
    'repos',
    'علاج',
    'وصفة',
    'دواء',
    'راحة',
    'إيقاف',
  ],
  recommendations: [
    'conseil',
    'recommand',
    'eviter',
    'hydrat',
    'boire',
    'controle',
    'surveillance',
    'revoir',
    'ننصح',
    'تجنب',
    'شرب',
    'مراجعة',
    'مراقبة',
    'سوائل',
  ],
} as const;

function matches(sentence: string, words: readonly string[]): boolean {
  const value = normalize(sentence);
  return words.some((word) => value.includes(normalize(word)));
}

function pick(
  sentences: string[],
  used: Set<number>,
  words: readonly string[],
  limit = 3,
): string | null {
  const selected: string[] = [];
  sentences.forEach((sentence, index) => {
    if (selected.length >= limit) return;
    if (used.has(index)) return;
    if (matches(sentence, words)) {
      used.add(index);
      selected.push(sentence);
    }
  });
  return selected.length > 0 ? selected.join(' ') : null;
}

function inferFollowUpDate(transcript: string): string | null {
  const value = normalize(transcript);
  const match = value.match(
    /(?:dans|sous)\s+(\d+)\s*(jours?|semaines?|mois)|(?:بعد|خلال)\s+(\d+)\s*(يوم|أيام|أسبوع|أسابيع|شهر|أشهر)/,
  );
  if (!match) return null;
  const amount = Number(match[1] ?? match[3]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const unit = match[2] ?? match[4] ?? '';
  const date = new Date();
  if (/jour|يوم|أيام/.test(unit)) date.setDate(date.getDate() + amount);
  else if (/semaine|أسبوع|أسابيع/.test(unit)) date.setDate(date.getDate() + amount * 7);
  else if (/mois|شهر|أشهر/.test(unit)) date.setMonth(date.getMonth() + amount);
  else return null;
  return date.toISOString().slice(0, 10);
}

/**
 * Générateur local déterministe : aucune requête réseau, aucun modèle médical.
 * Il ne fait qu'extraire des phrases du transcript pour préparer un brouillon.
 */
export function generateLocalReport(input: ReportGenerationInput): GeneratedReport {
  const transcript = input.transcript.trim();
  const sentences = splitSentences(transcript);
  const used = new Set<number>();

  const diagnosis = pick(sentences, used, KEYWORDS.diagnosis, 2);
  const examination = pick(sentences, used, KEYWORDS.examination, 3);
  const symptoms = pick(sentences, used, KEYWORDS.symptoms, 3);
  const treatment = pick(sentences, used, KEYWORDS.treatment, 3);
  const recommendations = pick(sentences, used, KEYWORDS.recommendations, 3);

  const report: ConsultationReportInput = {
    reason: input.reason.trim() || (input.locale === 'ar' ? 'استشارة' : 'Consultation'),
    symptoms,
    examination,
    diagnosis,
    treatment,
    recommendations,
    followUpDate: inferFollowUpDate(transcript),
    prescriptions: [],
  };

  return {
    report,
    source: 'local',
    provider: 'local-heuristic',
    warning:
      input.locale === 'ar'
        ? 'مسودة مستخرجة محليًا من النص، دون أي نموذج خارجي. راجع كل حقل قبل الاعتماد.'
        : 'Brouillon extrait localement du transcript, sans modèle externe. Vérifiez chaque champ avant validation.',
  };
}

export const localReportProvider: ReportProvider = {
  id: 'local-heuristic',
  label: 'Extraction locale (démo)',
  source: 'local',
  async generate(input) {
    return generateLocalReport(input);
  },
};

export class AiProviderError extends Error {
  code: string;

  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = 'AiProviderError';
    this.code = code;
  }
}

export const serverReportProvider: ReportProvider = {
  id: 'server-ai',
  label: 'Service IA configuré',
  source: 'server',
  async generate(input) {
    const response = await fetch('/api/ai/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const json = (await response.json().catch(() => null)) as
      | { data?: { report?: ConsultationReportInput }; error?: { code?: string } }
      | null;
    if (!response.ok || !json?.data?.report) {
      throw new AiProviderError(json?.error?.code ?? 'AI_ERROR');
    }
    return {
      report: json.data.report,
      source: 'server',
      provider: 'server-ai',
      warning:
        input.locale === 'ar'
          ? 'مسودة مولّدة عبر خدمة ذكاء اصطناعي خارجية. راجع كل حقل قبل الاعتماد.'
          : 'Brouillon généré par un service d’IA externe. Vérifiez chaque champ avant validation.',
    };
  },
};

export function serverAiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_AI_SERVER === 'true';
}

export function getReportProvider(): ReportProvider {
  return serverAiEnabled() ? serverReportProvider : localReportProvider;
}

export const __testing = {
  splitSentences,
  inferFollowUpDate,
  FRENCH_STOPWORDS,
};
