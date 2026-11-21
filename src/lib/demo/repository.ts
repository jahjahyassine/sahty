import {
  formatDemoCode,
  generateDemoCode,
  normalizeDemoCode,
  normalizePatientCode,
  randomId,
} from './codes';
import { buildFixtures } from './fixtures';
import { clearDemoStorage, loadDemoDatabase, saveDemoDatabase } from './storage';
import type {
  AccessScope,
  ConsultationReportInput,
  DemoAccessGrant,
  DemoAuditLog,
  DemoClaimCode,
  DemoConsultation,
  DemoConsultationView,
  DemoDatabase,
  DemoDoctor,
  DemoGrantView,
  DemoNotification,
  DemoPatient,
  DemoPrescription,
  DemoUser,
  LinkMethod,
  ReportSource,
  TranscriptSource,
} from './types';

export class DemoRepositoryError extends Error {
  code: string;

  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = 'DemoRepositoryError';
    this.code = code;
  }
}

type Listener = () => void;

let db: DemoDatabase | null = null;
const listeners = new Set<Listener>();

function database(): DemoDatabase {
  if (!db) db = loadDemoDatabase();
  return db;
}

function emit() {
  for (const listener of Array.from(listeners)) listener();
}

function commit() {
  if (!db) return;
  saveDemoDatabase(db);
  emit();
}

function mutate(mutator: (current: DemoDatabase) => void) {
  const current = database();
  mutator(current);
  // Nouvelle référence racine : useSyncExternalStore détecte le changement.
  db = { ...current };
  commit();
}

function nowIso() {
  return new Date().toISOString();
}

function byDateDesc(a: { consultedAt: string }, b: { consultedAt: string }) {
  return new Date(b.consultedAt).getTime() - new Date(a.consultedAt).getTime();
}

function byCreatedDesc(a: { createdAt: string }, b: { createdAt: string }) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function assertPatient(current: DemoDatabase, patientId: string): DemoPatient {
  const patient = current.patients.find((item) => item.id === patientId);
  if (!patient) throw new DemoRepositoryError('NOT_FOUND', 'Patient introuvable');
  return patient;
}

function assertDoctor(current: DemoDatabase, doctorId: string): DemoDoctor {
  const doctor = current.doctors.find((item) => item.id === doctorId);
  if (!doctor) throw new DemoRepositoryError('NOT_FOUND', 'Médecin introuvable');
  return doctor;
}

function assertConsultation(current: DemoDatabase, id: string): DemoConsultation {
  const consultation = current.consultations.find((item) => item.id === id);
  if (!consultation) throw new DemoRepositoryError('NOT_FOUND', 'Consultation introuvable');
  return consultation;
}

function patientUser(current: DemoDatabase, patient: DemoPatient | null) {
  if (!patient) return null;
  return current.users.find((user) => user.id === patient.userId) ?? null;
}

function doctorUser(current: DemoDatabase, doctor: DemoDoctor) {
  return current.users.find((user) => user.id === doctor.userId) ?? null;
}

function toConsultationView(current: DemoDatabase, consultation: DemoConsultation): DemoConsultationView {
  const doctor = assertDoctor(current, consultation.doctorId);
  const user = doctorUser(current, doctor);
  if (!user) throw new DemoRepositoryError('NOT_FOUND', 'Utilisateur médecin introuvable');
  const patient = consultation.patientId
    ? current.patients.find((item) => item.id === consultation.patientId) ?? null
    : null;
  return {
    consultation,
    doctor,
    doctorUser: user,
    patient,
    patientUser: patientUser(current, patient),
  };
}

function grantIsActive(grant: DemoAccessGrant, now = new Date()) {
  return !grant.revokedAt && new Date(grant.expiresAt).getTime() > now.getTime();
}

function toGrantView(current: DemoDatabase, grant: DemoAccessGrant): DemoGrantView {
  const patient = assertPatient(current, grant.patientId);
  const doctor = assertDoctor(current, grant.doctorId);
  const pUser = patientUser(current, patient);
  const dUser = doctorUser(current, doctor);
  if (!pUser || !dUser) throw new DemoRepositoryError('NOT_FOUND', 'Utilisateur introuvable');
  return {
    grant,
    patient,
    patientUser: pUser,
    doctor,
    doctorUser: dUser,
    active: grantIsActive(grant),
  };
}

/* -------------------------------------------------------------------------- */
/* Souscriptions (React)                                                      */
/* -------------------------------------------------------------------------- */

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): DemoDatabase {
  return database();
}

export function getServerSnapshot(): DemoDatabase {
  return database();
}

/* -------------------------------------------------------------------------- */
/* Lectures de base                                                           */
/* -------------------------------------------------------------------------- */

export function getUsers(): DemoUser[] {
  return database().users;
}

export function getUserById(id: string): DemoUser | null {
  return database().users.find((user) => user.id === id) ?? null;
}

export function getUserByEmail(email: string): DemoUser | null {
  const normalized = email.trim().toLowerCase();
  return database().users.find((user) => user.email.toLowerCase() === normalized) ?? null;
}

export function getPatients(): DemoPatient[] {
  return database().patients;
}

export function getPatientById(id: string): DemoPatient | null {
  return database().patients.find((patient) => patient.id === id) ?? null;
}

export function getPatientByUserId(userId: string): DemoPatient | null {
  return database().patients.find((patient) => patient.userId === userId) ?? null;
}

export function getPatientByQrCode(raw: string): DemoPatient | null {
  const code = normalizePatientCode(raw);
  if (!code) return null;
  return database().patients.find((patient) => patient.patientCode === code) ?? null;
}

export function getDoctors(): DemoDoctor[] {
  return database().doctors;
}

export function getDoctorById(id: string): DemoDoctor | null {
  return database().doctors.find((doctor) => doctor.id === id) ?? null;
}

export function getDoctorByUserId(userId: string): DemoDoctor | null {
  return database().doctors.find((doctor) => doctor.userId === userId) ?? null;
}

export function getConsultations(): DemoConsultation[] {
  return database().consultations;
}

export function getConsultationById(id: string): DemoConsultation | null {
  return database().consultations.find((consultation) => consultation.id === id) ?? null;
}

export function getConsultationView(id: string): DemoConsultationView | null {
  const current = database();
  const consultation = current.consultations.find((item) => item.id === id);
  return consultation ? toConsultationView(current, consultation) : null;
}

export function getConsultationsByPatient(patientId: string): DemoConsultation[] {
  return database()
    .consultations.filter((consultation) => consultation.patientId === patientId)
    .sort(byDateDesc);
}

export function getPatientConsultations(patientId: string, includeHidden = false): DemoConsultation[] {
  return database()
    .consultations.filter(
      (consultation) =>
        consultation.patientId === patientId &&
        consultation.status === 'LINKED' &&
        (includeHidden || !consultation.hiddenByPatient),
    )
    .sort(byDateDesc);
}

export function getPatientConsultation(patientId: string, id: string): DemoConsultation | null {
  const consultation = getConsultationById(id);
  if (!consultation) return null;
  if (consultation.patientId !== patientId) return null;
  if (consultation.status !== 'LINKED') return null;
  return consultation;
}

export function getConsultationsByDoctor(doctorId: string): DemoConsultation[] {
  return database()
    .consultations.filter((consultation) => consultation.doctorId === doctorId)
    .sort(byDateDesc);
}

export function getConsultationViewsByDoctor(doctorId: string): DemoConsultationView[] {
  const current = database();
  return current.consultations
    .filter((consultation) => consultation.doctorId === doctorId)
    .sort(byDateDesc)
    .map((consultation) => toConsultationView(current, consultation));
}

export function getConsultationViewsByPatient(patientId: string, includeHidden = false): DemoConsultationView[] {
  const current = database();
  return current.consultations
    .filter(
      (consultation) =>
        consultation.patientId === patientId &&
        consultation.status === 'LINKED' &&
        (includeHidden || !consultation.hiddenByPatient),
    )
    .sort(byDateDesc)
    .map((consultation) => toConsultationView(current, consultation));
}

/* -------------------------------------------------------------------------- */
/* Écritures consultations                                                    */
/* -------------------------------------------------------------------------- */

export type CreateConsultationInput = {
  doctorId: string;
  patientId?: string | null;
  reason: string;
  symptoms?: string | null;
  consultedAt?: string;
};

export function createConsultation(input: CreateConsultationInput): DemoConsultation {
  const current = database();
  assertDoctor(current, input.doctorId);
  if (input.patientId) assertPatient(current, input.patientId);

  const timestamp = nowIso();
  const consultation: DemoConsultation = {
    id: randomId('c'),
    doctorId: input.doctorId,
    patientId: input.patientId ?? null,
    status: 'DRAFT',
    consultedAt: input.consultedAt ?? timestamp,
    reason: input.reason.trim() || 'Consultation',
    symptoms: input.symptoms?.trim() || null,
    examination: null,
    diagnosis: null,
    treatment: null,
    recommendations: null,
    followUpDate: null,
    linkedAt: null,
    linkMethod: null,
    hiddenByPatient: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    transcript: null,
    transcriptSource: null,
    reportSource: null,
    reportGeneratedAt: null,
    audioDurationSec: null,
    approvedAt: null,
    approvedBy: null,
    prescriptions: [],
    attachments: [],
    claimCode: null,
  };

  mutate((draft) => {
    draft.consultations.unshift(consultation);
  });

  return consultation;
}

export type ConsultationDraftPatch = Partial<{
  reason: string;
  symptoms: string | null;
  examination: string | null;
  diagnosis: string | null;
  treatment: string | null;
  recommendations: string | null;
  followUpDate: string | null;
  transcript: string | null;
  transcriptSource: TranscriptSource | null;
  reportSource: ReportSource | null;
  reportGeneratedAt: string | null;
  audioDurationSec: number | null;
  prescriptions: ConsultationReportInput['prescriptions'];
}>;

export function updateConsultationDraft(id: string, patch: ConsultationDraftPatch): DemoConsultation {
  const current = database();
  const consultation = assertConsultation(current, id);
  if (consultation.status === 'LINKED') {
    throw new DemoRepositoryError('CONSULTATION_NOT_LINKABLE', 'Consultation déjà partagée');
  }

  const clean = (value: string | null | undefined) =>
    value === undefined ? undefined : value === null ? null : value.trim() || null;

  mutate((draft) => {
    const target = assertConsultation(draft, id);
    if (patch.reason !== undefined) target.reason = patch.reason.trim() || target.reason;
    if (patch.symptoms !== undefined) target.symptoms = clean(patch.symptoms) ?? null;
    if (patch.examination !== undefined) target.examination = clean(patch.examination) ?? null;
    if (patch.diagnosis !== undefined) target.diagnosis = clean(patch.diagnosis) ?? null;
    if (patch.treatment !== undefined) target.treatment = clean(patch.treatment) ?? null;
    if (patch.recommendations !== undefined) target.recommendations = clean(patch.recommendations) ?? null;
    if (patch.followUpDate !== undefined) target.followUpDate = patch.followUpDate || null;
    if (patch.transcript !== undefined) target.transcript = clean(patch.transcript) ?? null;
    if (patch.transcriptSource !== undefined) target.transcriptSource = patch.transcriptSource;
    if (patch.reportSource !== undefined) target.reportSource = patch.reportSource;
    if (patch.reportGeneratedAt !== undefined) target.reportGeneratedAt = patch.reportGeneratedAt;
    if (patch.audioDurationSec !== undefined) target.audioDurationSec = patch.audioDurationSec;
    if (patch.prescriptions !== undefined) {
      target.prescriptions = toPrescriptions(patch.prescriptions);
    }
    target.updatedAt = nowIso();
  });

  return getConsultationById(id)!;
}

function toPrescriptions(
  rows: ConsultationReportInput['prescriptions'],
): DemoPrescription[] {
  // Les lignes partiellement remplies sont conservées dans le brouillon :
  // le médecin peut les compléter plus tard sans perdre sa saisie.
  return rows
    .map((row, index) => ({
      id: randomId('rx'),
      medication: row.medication.trim(),
      dosage: row.dosage.trim(),
      frequency: row.frequency.trim(),
      duration: row.duration.trim(),
      notes: row.notes?.trim() || null,
      position: index,
    }));
}

export function approveConsultation(
  sessionId: string,
  report: ConsultationReportInput,
  approvedBy?: string,
): DemoConsultation {
  const current = database();
  const consultation = assertConsultation(current, sessionId);
  if (consultation.status === 'LINKED') {
    throw new DemoRepositoryError('CONSULTATION_NOT_LINKABLE', 'Consultation déjà partagée');
  }
  if (!report.reason.trim()) {
    throw new DemoRepositoryError('VALIDATION', 'Le motif est requis');
  }
  if (!report.diagnosis?.trim()) {
    throw new DemoRepositoryError('VALIDATION', 'Le diagnostic est requis avant approbation');
  }

  const timestamp = nowIso();
  mutate((draft) => {
    const target = assertConsultation(draft, sessionId);
    target.reason = report.reason.trim();
    target.symptoms = report.symptoms?.trim() || null;
    target.examination = report.examination?.trim() || null;
    target.diagnosis = report.diagnosis?.trim() || null;
    target.treatment = report.treatment?.trim() || null;
    target.recommendations = report.recommendations?.trim() || null;
    target.followUpDate = report.followUpDate || null;
    target.prescriptions = toPrescriptions(report.prescriptions);
    target.status = 'COMPLETED';
    target.approvedAt = timestamp;
    target.approvedBy = approvedBy ?? consultation.doctorId;
    target.reportGeneratedAt = target.reportGeneratedAt ?? timestamp;
    target.reportSource = target.reportSource ?? 'manual';
    target.updatedAt = timestamp;
  });

  return getConsultationById(sessionId)!;
}

export type LinkConsultationInput = {
  patientId?: string | null;
  method?: LinkMethod;
};

export function linkConsultation(id: string, input: LinkConsultationInput = {}): DemoConsultation {
  const current = database();
  const consultation = assertConsultation(current, id);
  if (consultation.status === 'LINKED') return consultation;
  if (consultation.status !== 'COMPLETED') {
    throw new DemoRepositoryError('COMPLETE_REQUIRED', 'La consultation doit être approuvée');
  }

  const patientId = input.patientId ?? consultation.patientId;
  if (!patientId) {
    throw new DemoRepositoryError('NOT_FOUND', 'Aucun patient associé');
  }
  if (consultation.patientId && consultation.patientId !== patientId) {
    throw new DemoRepositoryError('VALIDATION', 'Consultation déjà associée à un autre patient');
  }
  const patient = assertPatient(current, patientId);
  const doctor = assertDoctor(current, consultation.doctorId);
  const doctorName = doctorUser(current, doctor)?.fullName ?? 'Médecin';
  const timestamp = nowIso();
  const method = input.method ?? 'ACCESS_GRANT';

  mutate((draft) => {
    const target = assertConsultation(draft, id);
    target.patientId = patientId;
    target.status = 'LINKED';
    target.linkedAt = timestamp;
    target.linkMethod = method;
    target.updatedAt = timestamp;

    const user = patientUser(draft, assertPatient(draft, patientId));
    if (user) {
      draft.notifications.unshift({
        id: randomId('n'),
        userId: user.id,
        title: 'Nouvelle consultation partagée',
        body: `${doctorName} a ajouté une consultation à votre dossier.`,
        href: `/patient/consultations/${id}`,
        readAt: null,
        createdAt: timestamp,
      });
    }

    draft.auditLogs.unshift({
      id: randomId('a'),
      userId: doctor.userId,
      patientId,
      action: 'LINK_VIA_GRANT',
      entityType: 'Consultation',
      entityId: id,
      section: 'consultation',
      scope: 'FULL',
      createdAt: timestamp,
      meta: { method },
    });
  });

  return getConsultationById(id)!;
}

export function generateClaimCode(consultationId: string): DemoClaimCode {
  const current = database();
  const consultation = assertConsultation(current, consultationId);
  if (consultation.status !== 'COMPLETED') {
    throw new DemoRepositoryError('COMPLETE_REQUIRED', 'La consultation doit être approuvée');
  }
  if (consultation.patientId) {
    throw new DemoRepositoryError('VALIDATION', 'Cette consultation est déjà associée à un patient');
  }

  const timestamp = nowIso();
  const claimCode: DemoClaimCode = {
    code: formatDemoCode(generateDemoCode()),
    expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    usedAt: null,
    createdAt: timestamp,
  };

  mutate((draft) => {
    const target = assertConsultation(draft, consultationId);
    target.claimCode = claimCode;
    target.updatedAt = timestamp;
  });

  return claimCode;
}

export type ClaimPreview = {
  consultation: DemoConsultation;
  doctor: DemoDoctor;
  doctorUser: DemoUser;
  expiresAt: string;
};

export function getClaimPreview(rawCode: string): ClaimPreview {
  const code = normalizeDemoCode(rawCode);
  if (!code) throw new DemoRepositoryError('CLAIM_INVALID', 'Code invalide');

  const current = database();
  const matches = current.consultations.filter(
    (consultation) =>
      consultation.claimCode &&
      normalizeDemoCode(consultation.claimCode.code) === code,
  );
  const consultation = matches[0];
  if (!consultation || !consultation.claimCode) {
    throw new DemoRepositoryError('CLAIM_INVALID', 'Code inconnu');
  }
  if (consultation.claimCode.usedAt || consultation.patientId) {
    throw new DemoRepositoryError('CLAIM_USED', 'Code déjà utilisé');
  }
  if (new Date(consultation.claimCode.expiresAt).getTime() <= Date.now()) {
    throw new DemoRepositoryError('CLAIM_EXPIRED', 'Code expiré');
  }
  if (consultation.status !== 'COMPLETED') {
    throw new DemoRepositoryError('CLAIM_INVALID', 'Consultation non disponible');
  }

  const doctor = assertDoctor(current, consultation.doctorId);
  const user = doctorUser(current, doctor);
  if (!user) throw new DemoRepositoryError('NOT_FOUND', 'Médecin introuvable');
  return {
    consultation,
    doctor,
    doctorUser: user,
    expiresAt: consultation.claimCode.expiresAt,
  };
}

export function claimConsultation(patientId: string, rawCode: string): DemoConsultation {
  const preview = getClaimPreview(rawCode);
  const current = database();
  const patient = assertPatient(current, patientId);
  const user = patientUser(current, patient);
  if (!user) throw new DemoRepositoryError('NOT_FOUND', 'Patient introuvable');
  if (preview.consultation.patientId && preview.consultation.patientId !== patientId) {
    throw new DemoRepositoryError('CLAIM_USED', 'Code déjà utilisé');
  }

  const timestamp = nowIso();
  mutate((draft) => {
    const target = assertConsultation(draft, preview.consultation.id);
    target.patientId = patientId;
    target.status = 'LINKED';
    target.linkedAt = timestamp;
    target.linkMethod = 'DOCTOR_CODE';
    target.hiddenByPatient = false;
    target.updatedAt = timestamp;
    if (target.claimCode) target.claimCode.usedAt = timestamp;

    const doctor = assertDoctor(draft, target.doctorId);
    const doctorUserRecord = doctorUser(draft, doctor);
    if (doctorUserRecord) {
      draft.notifications.unshift({
        id: randomId('n'),
        userId: doctorUserRecord.id,
        title: 'Consultation récupérée',
        body: `${user.fullName} a ajouté la consultation à son dossier.`,
        href: `/doctor/consultations/${target.id}`,
        readAt: null,
        createdAt: timestamp,
      });
    }

    draft.auditLogs.unshift({
      id: randomId('a'),
      userId: user.id,
      patientId,
      action: 'CLAIM_ACCEPTED',
      entityType: 'Consultation',
      entityId: target.id,
      section: 'consultation',
      scope: 'FULL',
      createdAt: timestamp,
      meta: { method: 'DOCTOR_CODE' },
    });

    upsertGrantInDraft(draft, {
      patientId,
      doctorId: target.doctorId,
      scope: 'FULL',
      durationMin: 60 * 24 * 30,
    });
  });

  return getConsultationById(preview.consultation.id)!;
}

export function hideConsultation(patientId: string, consultationId: string, hidden: boolean) {
  const consultation = getPatientConsultation(patientId, consultationId);
  if (!consultation) throw new DemoRepositoryError('NOT_FOUND', 'Consultation introuvable');
  mutate((draft) => {
    const target = assertConsultation(draft, consultationId);
    target.hiddenByPatient = hidden;
    target.updatedAt = nowIso();
  });
}

/* -------------------------------------------------------------------------- */
/* Accès / grants                                                             */
/* -------------------------------------------------------------------------- */

function upsertGrantInDraft(
  current: DemoDatabase,
  input: { patientId: string; doctorId: string; scope: AccessScope; durationMin: number },
): DemoAccessGrant {
  const expiresAt = new Date(Date.now() + input.durationMin * 60_000).toISOString();
  const existing = current.accessGrants.find(
    (grant) => grant.patientId === input.patientId && grant.doctorId === input.doctorId,
  );
  if (existing) {
    existing.scope = input.scope;
    existing.expiresAt = expiresAt;
    existing.revokedAt = null;
    return existing;
  }
  const grant: DemoAccessGrant = {
    id: randomId('g'),
    patientId: input.patientId,
    doctorId: input.doctorId,
    scope: input.scope,
    createdAt: nowIso(),
    expiresAt,
    revokedAt: null,
    lastAccessAt: null,
    accessCount: 0,
  };
  current.accessGrants.unshift(grant);
  return grant;
}

export function upsertGrant(input: {
  patientId: string;
  doctorId: string;
  scope: AccessScope;
  durationMin: number;
}): DemoAccessGrant {
  const current = database();
  assertPatient(current, input.patientId);
  assertDoctor(current, input.doctorId);
  let result: DemoAccessGrant | null = null;
  mutate((draft) => {
    result = upsertGrantInDraft(draft, input);
  });
  return result!;
}

export function getActiveGrant(doctorId: string, patientId: string): DemoAccessGrant | null {
  const grant = database().accessGrants.find(
    (item) => item.patientId === patientId && item.doctorId === doctorId,
  );
  if (!grant) return null;
  if (!grantIsActive(grant)) return null;
  if (grant.scope === 'LINK_ONLY') return null;
  return grant;
}

export function getGrant(doctorId: string, patientId: string): DemoAccessGrant | null {
  return (
    database().accessGrants.find(
      (item) => item.patientId === patientId && item.doctorId === doctorId,
    ) ?? null
  );
}

export type RedeemPatientResult = {
  patient: DemoPatient;
  user: DemoUser;
  grant: DemoAccessGrant | null;
  scope: AccessScope;
};

/**
 * Résout un QR patient ou un code manuel et ouvre (si demandé) un accès démo.
 * Le QR de démonstration n'est ni une authentification ni un consentement réel.
 */
export function redeemPatientQr(doctorId: string, raw: string): RedeemPatientResult {
  const current = database();
  assertDoctor(current, doctorId);
  const patient = getPatientByQrCode(raw);
  if (!patient) throw new DemoRepositoryError('LINK_INVALID', 'QR patient inconnu');
  const user = patientUser(current, patient);
  if (!user) throw new DemoRepositoryError('NOT_FOUND', 'Patient introuvable');

  let scope: AccessScope = 'FULL';
  let durationMin = 60 * 24;
  const value = raw.trim();
  if (/^sehhati:\/\/patient\//i.test(value) || /^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const scopeParam = url.searchParams.get('scope');
      if (scopeParam === 'LINK_ONLY' || scopeParam === 'VITALS' || scopeParam === 'FULL') {
        scope = scopeParam;
      }
      const duration = Number(url.searchParams.get('duration'));
      if (Number.isFinite(duration) && duration > 0) durationMin = duration;
    } catch {
      // payload simple : paramètres ignorés
    }
  }

  let grant: DemoAccessGrant | null = null;
  if (scope !== 'LINK_ONLY') {
    grant = upsertGrant({
      patientId: patient.id,
      doctorId,
      scope,
      durationMin,
    });
    const doctor = assertDoctor(database(), doctorId);
    logAudit({
      userId: doctor.userId,
      patientId: patient.id,
      action: 'ACCESS_GRANTED',
      entityType: 'AccessGrant',
      entityId: grant.id,
      scope,
      meta: { method: 'PATIENT_QR' },
    });
  }

  return { patient, user, grant, scope };
}

export function touchGrant(grantId: string) {
  const grant = database().accessGrants.find((item) => item.id === grantId);
  if (!grant) return;
  mutate((draft) => {
    const target = draft.accessGrants.find((item) => item.id === grantId);
    if (!target) return;
    target.lastAccessAt = nowIso();
    target.accessCount += 1;
  });
}

export function getGrantsForDoctor(doctorId: string): DemoGrantView[] {
  const current = database();
  return current.accessGrants
    .filter((grant) => grant.doctorId === doctorId && grant.scope !== 'LINK_ONLY')
    .sort(byCreatedDesc)
    .map((grant) => toGrantView(current, grant));
}

export function getGrantsForPatient(patientId: string): DemoGrantView[] {
  const current = database();
  return current.accessGrants
    .filter((grant) => grant.patientId === patientId && grant.scope !== 'LINK_ONLY')
    .sort((a, b) => byCreatedDesc(a, b))
    .map((grant) => toGrantView(current, grant));
}

export function revokeGrant(patientId: string, grantId: string) {
  const current = database();
  const grant = current.accessGrants.find((item) => item.id === grantId);
  if (!grant || grant.patientId !== patientId) {
    throw new DemoRepositoryError('NOT_FOUND', 'Accès introuvable');
  }
  if (grant.revokedAt) return;
  const timestamp = nowIso();
  const patient = current.patients.find((item) => item.id === patientId);
  mutate((draft) => {
    const target = draft.accessGrants.find((item) => item.id === grantId);
    if (!target) return;
    target.revokedAt = timestamp;
    draft.auditLogs.unshift({
      id: randomId('a'),
      userId: patient?.userId ?? null,
      patientId,
      action: 'ACCESS_REVOKED',
      entityType: 'AccessGrant',
      entityId: grantId,
      section: null,
      scope: grant.scope,
      createdAt: timestamp,
      meta: { doctorId: grant.doctorId },
    });
  });
}

export function getPatientSummaryForDoctor(doctorId: string, patientId: string) {
  const current = database();
  const patient = current.patients.find((item) => item.id === patientId);
  if (!patient) return null;
  const user = patientUser(current, patient);
  if (!user) return null;
  const grant = getActiveGrant(doctorId, patientId);
  if (!grant) return null;
  return { patient, user, grant, scope: grant.scope };
}

export function recordPatientFileView(
  doctorId: string,
  patientId: string,
  section: 'summary' | 'history' | 'consultation',
) {
  const current = database();
  const doctor = current.doctors.find((item) => item.id === doctorId);
  const grant = getActiveGrant(doctorId, patientId);
  if (!doctor || !grant) return;
  touchGrant(grant.id);
  logAudit({
    userId: doctor.userId,
    patientId,
    action: 'PATIENT_FILE_VIEWED',
    entityType: 'Patient',
    entityId: patientId,
    section,
    scope: grant.scope,
  });
}

export function getAccessLog(patientId: string) {
  const current = database();
  return current.auditLogs
    .filter((entry) => entry.patientId === patientId)
    .sort(byCreatedDesc)
    .slice(0, 50)
    .map((entry) => {
      const actor = entry.userId
        ? current.users.find((user) => user.id === entry.userId) ?? null
        : null;
      const doctor = actor
        ? current.doctors.find((item) => item.userId === actor.id) ?? null
        : null;
      return {
        id: entry.id,
        action: entry.action,
        createdAt: entry.createdAt,
        actorName: actor?.fullName ?? null,
        specialty: doctor?.specialty ?? null,
        section: entry.section,
        scope: entry.scope,
      };
    });
}

/* -------------------------------------------------------------------------- */
/* Notifications                                                              */
/* -------------------------------------------------------------------------- */

export function getNotifications(userId: string, limit = 50): DemoNotification[] {
  return database()
    .notifications.filter((notification) => notification.userId === userId)
    .sort(byCreatedDesc)
    .slice(0, limit);
}

export function getUnreadCount(userId: string): number {
  return database().notifications.filter(
    (notification) => notification.userId === userId && !notification.readAt,
  ).length;
}

export function createNotification(input: {
  userId: string;
  title: string;
  body: string;
  href?: string | null;
}): DemoNotification {
  const notification: DemoNotification = {
    id: randomId('n'),
    userId: input.userId,
    title: input.title,
    body: input.body,
    href: input.href ?? null,
    readAt: null,
    createdAt: nowIso(),
  };
  mutate((draft) => {
    draft.notifications.unshift(notification);
  });
  return notification;
}

export function markNotificationRead(userId: string, notificationId: string) {
  mutate((draft) => {
    const notification = draft.notifications.find(
      (item) => item.id === notificationId && item.userId === userId,
    );
    if (notification && !notification.readAt) notification.readAt = nowIso();
  });
}

export function markAllNotificationsRead(userId: string) {
  const timestamp = nowIso();
  mutate((draft) => {
    for (const notification of draft.notifications) {
      if (notification.userId === userId && !notification.readAt) {
        notification.readAt = timestamp;
      }
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Profils                                                                    */
/* -------------------------------------------------------------------------- */

export function updateUserProfile(
  userId: string,
  patch: Partial<Pick<DemoUser, 'fullName' | 'phone' | 'locale' | 'avatarUrl'>>,
): DemoUser {
  const current = database();
  const user = current.users.find((item) => item.id === userId);
  if (!user) throw new DemoRepositoryError('NOT_FOUND', 'Utilisateur introuvable');
  mutate((draft) => {
    const target = draft.users.find((item) => item.id === userId);
    if (!target) return;
    if (patch.fullName !== undefined) target.fullName = patch.fullName.trim() || target.fullName;
    if (patch.phone !== undefined) target.phone = patch.phone?.trim() || null;
    if (patch.locale !== undefined) target.locale = patch.locale;
    if (patch.avatarUrl !== undefined) target.avatarUrl = patch.avatarUrl;
    target.updatedAt = nowIso();
  });
  return getUserById(userId)!;
}

export function updatePatientMedicalInfo(
  patientId: string,
  patch: Partial<Pick<DemoPatient, 'bloodType' | 'allergies' | 'chronicDiseases' | 'birthDate' | 'gender'>>,
): DemoPatient {
  const current = database();
  if (!current.patients.some((item) => item.id === patientId)) {
    throw new DemoRepositoryError('NOT_FOUND', 'Patient introuvable');
  }
  mutate((draft) => {
    const target = draft.patients.find((item) => item.id === patientId);
    if (!target) return;
    if (patch.bloodType !== undefined) target.bloodType = patch.bloodType || null;
    if (patch.allergies !== undefined) {
      target.allergies = patch.allergies.map((item) => item.trim()).filter(Boolean);
    }
    if (patch.chronicDiseases !== undefined) {
      target.chronicDiseases = patch.chronicDiseases.map((item) => item.trim()).filter(Boolean);
    }
    if (patch.birthDate !== undefined) target.birthDate = patch.birthDate || null;
    if (patch.gender !== undefined) target.gender = patch.gender;
  });
  return getPatientById(patientId)!;
}

export function updateDoctorProfile(
  doctorId: string,
  patch: Partial<Pick<DemoDoctor, 'specialty' | 'licenseNumber' | 'clinicName' | 'city'>>,
): DemoDoctor {
  const current = database();
  if (!current.doctors.some((item) => item.id === doctorId)) {
    throw new DemoRepositoryError('NOT_FOUND', 'Médecin introuvable');
  }
  mutate((draft) => {
    const target = draft.doctors.find((item) => item.id === doctorId);
    if (!target) return;
    if (patch.specialty !== undefined) target.specialty = patch.specialty.trim() || target.specialty;
    if (patch.licenseNumber !== undefined) target.licenseNumber = patch.licenseNumber?.trim() || null;
    if (patch.clinicName !== undefined) target.clinicName = patch.clinicName?.trim() || null;
    if (patch.city !== undefined) target.city = patch.city?.trim() || null;
  });
  return getDoctorById(doctorId)!;
}

/* -------------------------------------------------------------------------- */
/* Journal d'audit                                                            */
/* -------------------------------------------------------------------------- */

export function logAudit(input: {
  userId?: string | null;
  patientId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  section?: string | null;
  scope?: AccessScope | null;
  meta?: Record<string, unknown> | null;
}): DemoAuditLog {
  const entry: DemoAuditLog = {
    id: randomId('a'),
    userId: input.userId ?? null,
    patientId: input.patientId ?? null,
    action: input.action,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    section: input.section ?? null,
    scope: input.scope ?? null,
    createdAt: nowIso(),
    meta: input.meta ?? null,
  };
  mutate((draft) => {
    draft.auditLogs.unshift(entry);
  });
  return entry;
}

/* -------------------------------------------------------------------------- */
/* Tableaux de bord                                                           */
/* -------------------------------------------------------------------------- */

export function getDoctorDashboard(doctorId: string) {
  const consultations = getConsultationsByDoctor(doctorId);
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const today = consultations.filter((item) => {
    const date = new Date(item.consultedAt);
    return date >= startOfDay && date < endOfDay;
  });
  const drafts = consultations.filter((item) => item.status === 'DRAFT');
  const pending = consultations.filter((item) => item.status === 'COMPLETED');
  const linkedThisMonth = consultations.filter(
    (item) =>
      item.status === 'LINKED' &&
      item.linkedAt &&
      new Date(item.linkedAt).getTime() >= startOfMonth.getTime(),
  );

  const current = database();
  const views = consultations.map((item) => toConsultationView(current, item));

  return {
    todayCount: today.length,
    draftCount: drafts.length,
    awaitingCount: pending.length,
    linkedThisMonthCount: linkedThisMonth.length,
    totalCount: consultations.length,
    pending: views.filter((item) => item.consultation.status === 'COMPLETED').slice(0, 4),
    drafts: views.filter((item) => item.consultation.status === 'DRAFT').slice(0, 4),
    recent: views.slice(0, 6),
  };
}

export function getPatientDashboard(patientId: string) {
  const consultations = getPatientConsultations(patientId);
  const views = getConsultationViewsByPatient(patientId);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const documents = consultations.reduce((sum, item) => sum + item.attachments.length, 0);
  const doctorIds = new Set(consultations.map((item) => item.doctorId));
  const last = views[0] ?? null;
  const upcoming =
    views
      .filter((item) => item.consultation.followUpDate && new Date(item.consultation.followUpDate) >= now)
      .sort(
        (a, b) =>
          new Date(a.consultation.followUpDate!).getTime() -
          new Date(b.consultation.followUpDate!).getTime(),
      )[0] ?? null;

  const specialtyMap = new Map<string, number>();
  for (const view of views) {
    specialtyMap.set(view.doctor.specialty, (specialtyMap.get(view.doctor.specialty) ?? 0) + 1);
  }
  const specialties = Array.from(specialtyMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const activeGrants = getGrantsForPatient(patientId).filter((item) => item.active);

  return {
    totalCount: consultations.length,
    documents,
    doctorsCount: doctorIds.size,
    last,
    upcoming,
    recent: views.slice(0, 5),
    specialties,
    activeGrants: activeGrants.length,
    linkedThisMonth: consultations.filter(
      (item) => item.linkedAt && new Date(item.linkedAt).getTime() >= startOfMonth.getTime(),
    ).length,
  };
}

/* -------------------------------------------------------------------------- */
/* Réinitialisation                                                           */
/* -------------------------------------------------------------------------- */

export function resetDemoData(): DemoDatabase {
  clearDemoStorage();
  db = buildFixtures();
  saveDemoDatabase(db);
  emit();
  return db;
}

export function replaceDemoDatabase(next: DemoDatabase) {
  db = next;
  saveDemoDatabase(next);
  emit();
}
