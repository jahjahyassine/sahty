import type { ReportGenerationInput } from './types';

export const REPORT_JSON_SCHEMA = {
  reason: 'string',
  symptoms: 'string | null',
  examination: 'string | null',
  diagnosis: 'string | null',
  treatment: 'string | null',
  recommendations: 'string | null',
  followUpDate: 'YYYY-MM-DD | null',
  prescriptions: [
    {
      medication: 'string',
      dosage: 'string',
      frequency: 'string',
      duration: 'string',
      notes: 'string | null',
    },
  ],
};

export const REPORT_SYSTEM_PROMPT = `Tu es un assistant de documentation clinique pour un médecin.
Tu transformes une transcription de consultation en un brouillon de compte rendu structuré.

Règles strictes :
- Tu n'inventes aucun fait, aucun diagnostic, aucun médicament ni posologie.
- Tu reprends uniquement ce qui est explicitement présent dans la transcription.
- Si une information manque, tu renvoies null pour ce champ.
- Le diagnostic doit rester une proposition à confirmer ; ne l'invente jamais.
- Les prescriptions ne doivent contenir que des médicaments explicitement cités.
- Réponds uniquement avec un objet JSON valide, sans texte autour, au format demandé.`;

export function buildReportMessages(input: ReportGenerationInput) {
  const context = [
    `Motif renseigné par le médecin : ${input.reason || 'non renseigné'}`,
    input.patient?.fullName ? `Patient : ${input.patient.fullName}` : null,
    input.patient?.age != null ? `Âge : ${input.patient.age}` : null,
    input.patient?.allergies?.length ? `Allergies : ${input.patient.allergies.join(', ')}` : null,
    input.patient?.chronicDiseases?.length
      ? `Maladies chroniques : ${input.patient.chronicDiseases.join(', ')}`
      : null,
    `Langue de sortie : ${input.locale === 'ar' ? 'arabe' : 'français'}`,
    `Format JSON attendu : ${JSON.stringify(REPORT_JSON_SCHEMA)}`,
  ]
    .filter(Boolean)
    .join('\n');

  return [
    { role: 'system' as const, content: REPORT_SYSTEM_PROMPT },
    {
      role: 'user' as const,
      content: `${context}\n\nTranscription de la consultation :\n"""\n${input.transcript}\n"""`,
    },
  ];
}
