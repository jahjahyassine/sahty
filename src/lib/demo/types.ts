export const ROLES = ['PATIENT', 'DOCTOR'] as const;
export type Role = (typeof ROLES)[number];

export const ACCESS_SCOPES = ['LINK_ONLY', 'VITALS', 'FULL'] as const;
export type AccessScope = (typeof ACCESS_SCOPES)[number];

export const CONSULTATION_STATUSES = ['DRAFT', 'COMPLETED', 'LINKED'] as const;
export type ConsultationStatus = (typeof CONSULTATION_STATUSES)[number];

export const LINK_METHODS = ['PATIENT_QR', 'DOCTOR_CODE', 'ACCESS_GRANT'] as const;
export type LinkMethod = (typeof LINK_METHODS)[number];

export const APP_LOCALES = ['ar', 'fr'] as const;
export type AppLocale = (typeof APP_LOCALES)[number];

export type DemoUser = {
  id: string;
  email: string;
  /** Mot de passe de démonstration en clair : aucun secret réel n’est stocké ici. */
  password: string;
  role: Role;
  fullName: string;
  phone: string | null;
  locale: AppLocale;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DemoPatient = {
  id: string;
  userId: string;
  patientCode: string;
  birthDate: string | null;
  gender: 'M' | 'F' | null;
  bloodType: string | null;
  allergies: string[];
  chronicDiseases: string[];
  createdAt: string;
};

export type DemoDoctor = {
  id: string;
  userId: string;
  specialty: string;
  licenseNumber: string | null;
  clinicName: string | null;
  city: string | null;
  createdAt: string;
};

export type DemoPrescription = {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes: string | null;
  position: number;
};

export type DemoAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  kind: string;
  createdAt: string;
  /** Contenu optionnel encodé en data URL (petits fichiers de démonstration). */
  dataUrl?: string | null;
};

export type DemoClaimCode = {
  code: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
};

export type TranscriptSource = 'live' | 'post-recording' | 'manual';
export type ReportSource = 'local' | 'server' | 'manual';

export type DemoConsultation = {
  id: string;
  doctorId: string;
  patientId: string | null;
  status: ConsultationStatus;
  consultedAt: string;
  reason: string;
  symptoms: string | null;
  examination: string | null;
  diagnosis: string | null;
  treatment: string | null;
  recommendations: string | null;
  followUpDate: string | null;
  linkedAt: string | null;
  linkMethod: LinkMethod | null;
  hiddenByPatient: boolean;
  createdAt: string;
  updatedAt: string;
  /** Transcription brute, éditable par le médecin. */
  transcript: string | null;
  transcriptSource: TranscriptSource | null;
  reportSource: ReportSource | null;
  reportGeneratedAt: string | null;
  audioDurationSec: number | null;
  approvedAt: string | null;
  approvedBy: string | null;
  prescriptions: DemoPrescription[];
  attachments: DemoAttachment[];
  claimCode: DemoClaimCode | null;
};

export type DemoAccessGrant = {
  id: string;
  patientId: string;
  doctorId: string;
  scope: AccessScope;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  lastAccessAt: string | null;
  accessCount: number;
};

export type DemoNotification = {
  id: string;
  userId: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export type DemoAuditLog = {
  id: string;
  userId: string | null;
  patientId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  section: string | null;
  scope: AccessScope | null;
  createdAt: string;
  meta: Record<string, unknown> | null;
};

export type DemoDatabase = {
  version: number;
  users: DemoUser[];
  patients: DemoPatient[];
  doctors: DemoDoctor[];
  consultations: DemoConsultation[];
  accessGrants: DemoAccessGrant[];
  notifications: DemoNotification[];
  auditLogs: DemoAuditLog[];
};

export type ConsultationReportInput = {
  reason: string;
  symptoms: string | null;
  examination: string | null;
  diagnosis: string | null;
  treatment: string | null;
  recommendations: string | null;
  followUpDate: string | null;
  prescriptions: Array<{
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
    notes?: string | null;
  }>;
};

export type DemoConsultationView = {
  consultation: DemoConsultation;
  doctor: DemoDoctor;
  doctorUser: DemoUser;
  patient: DemoPatient | null;
  patientUser: DemoUser | null;
};

export type DemoGrantView = {
  grant: DemoAccessGrant;
  patient: DemoPatient;
  patientUser: DemoUser;
  doctor: DemoDoctor;
  doctorUser: DemoUser;
  active: boolean;
};
