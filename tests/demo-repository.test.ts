import { beforeEach, describe, expect, it } from 'vitest';
import {
  approveConsultation,
  claimConsultation,
  createConsultation,
  generateClaimCode,
  getClaimPreview,
  getConsultationsByPatient,
  getDoctorById,
  getDoctors,
  getNotifications,
  getPatientById,
  getPatientByQrCode,
  getPatients,
  getUnreadCount,
  linkConsultation,
  redeemPatientQr,
  resetDemoData,
  updateConsultationDraft,
} from '../src/lib/demo/repository';
import { normalizePatientCode, patientQrPayload } from '../src/lib/demo/codes';
import type { ConsultationReportInput } from '../src/lib/demo/types';

const report: ConsultationReportInput = {
  reason: 'Douleur thoracique',
  symptoms: 'Douleur depuis deux jours',
  examination: 'TA 130/80, saturation 98%',
  diagnosis: 'Suspicion d’angine',
  treatment: 'Repos et contrôle',
  recommendations: 'Revoir dans 7 jours',
  followUpDate: null,
  prescriptions: [
    {
      medication: 'Paracétamol',
      dosage: '1 comprimé',
      frequency: '3 fois par jour',
      duration: '5 jours',
      notes: null,
    },
  ],
};

beforeEach(() => {
  resetDemoData();
});

describe('fixtures déterministes', () => {
  it('expose des patients et médecins stables', () => {
    expect(getPatients().map((item) => item.patientCode)).toEqual(['SH-482913', 'SH-731042']);
    expect(getDoctors().map((item) => item.userId)).toEqual(['u-alami', 'u-benani']);
    expect(getPatientById('p-ahmed')?.allergies).toContain('Pénicilline');
    expect(getDoctorById('d-alami')?.specialty).toBe('Médecine générale');
  });
});

describe('QR et codes manuels', () => {
  it('accepte toutes les formes du code patient', () => {
    const expected = 'SH-482913';
    for (const raw of [
      expected,
      'SH482913',
      '482913',
      patientQrPayload(expected),
      'https://demo.local/patient/SH-482913',
    ]) {
      expect(getPatientByQrCode(raw)?.id).toBe('p-ahmed');
      expect(normalizePatientCode(raw)).toBe(expected);
    }
  });

  it('rejette un code inconnu', () => {
    expect(getPatientByQrCode('SH-000000')).toBeNull();
  });

  it('ouvre un accès démo lors de la lecture du QR (LINK_ONLY exclu)', () => {
    const result = redeemPatientQr('d-alami', patientQrPayload('SH-482913'));
    expect(result.patient.id).toBe('p-ahmed');
    expect(result.scope).toBe('FULL');
    expect(result.grant).not.toBeNull();
  });

  it('ne crée pas de grant avec scope LINK_ONLY', () => {
    const result = redeemPatientQr(
      'd-alami',
      `${patientQrPayload('SH-731042')}?scope=LINK_ONLY&duration=60`,
    );
    expect(result.patient.id).toBe('p-salma');
    expect(result.scope).toBe('LINK_ONLY');
    expect(result.grant).toBeNull();
  });
});

describe('cycle de vie d’une consultation', () => {
  it('crée, édite, approuve puis partage une consultation', () => {
    const created = createConsultation({
      doctorId: 'd-alami',
      patientId: 'p-ahmed',
      reason: 'Consultation de test',
    });
    expect(created.status).toBe('DRAFT');

    updateConsultationDraft(created.id, {
      transcript: 'Le patient décrit une douleur.',
      transcriptSource: 'manual',
    });
    expect(getConsultationsByPatient('p-ahmed').find((item) => item.id === created.id)?.transcript).toContain(
      'douleur',
    );

    const approved = approveConsultation(created.id, report, 'd-alami');
    expect(approved.status).toBe('COMPLETED');
    expect(approved.approvedBy).toBe('d-alami');
    expect(approved.prescriptions).toHaveLength(1);

    const linked = linkConsultation(created.id, { patientId: 'p-ahmed', method: 'PATIENT_QR' });
    expect(linked.status).toBe('LINKED');
    expect(linked.linkedAt).not.toBeNull();

    const notifications = getNotifications('u-ahmed');
    expect(notifications.some((item) => item.href === `/patient/consultations/${created.id}`)).toBe(
      true,
    );
  });

  it('refuse l’approbation sans diagnostic', () => {
    const created = createConsultation({ doctorId: 'd-alami', reason: 'Sans diagnostic' });
    expect(() => approveConsultation(created.id, { ...report, diagnosis: null })).toThrow();
    expect(() => approveConsultation(created.id, report)).not.toThrow();
  });

  it('empêche toute modification après partage', () => {
    const created = createConsultation({ doctorId: 'd-alami', patientId: 'p-salma', reason: 'Test' });
    approveConsultation(created.id, report);
    linkConsultation(created.id, { patientId: 'p-salma' });
    expect(() => updateConsultationDraft(created.id, { diagnosis: 'autre' })).toThrow();
  });
});

describe('code de remise', () => {
  it('permet à un patient de récupérer une consultation approuvée', () => {
    const created = createConsultation({ doctorId: 'd-benani', reason: 'Consultation sans patient' });
    approveConsultation(created.id, report);
    const claim = generateClaimCode(created.id);

    const preview = getClaimPreview(claim.code);
    expect(preview.doctorUser.fullName).toBe('Dr. Salma Benani');

    const claimed = claimConsultation('p-ahmed', claim.code);
    expect(claimed.status).toBe('LINKED');
    expect(claimed.patientId).toBe('p-ahmed');
    expect(claimed.claimCode?.usedAt).not.toBeNull();
    expect(() => getClaimPreview(claim.code)).toThrow();
    expect(getUnreadCount('u-benani')).toBeGreaterThan(0);
  });

  it('refuse un code inconnu ou une consultation non approuvée', () => {
    expect(() => getClaimPreview('AAAA-BBBB')).toThrow();
    const draft = createConsultation({ doctorId: 'd-alami', reason: 'Brouillon' });
    expect(() => generateClaimCode(draft.id)).toThrow();
  });
});

describe('réinitialisation', () => {
  it('restaure les fixtures et les notifications', () => {
    createConsultation({ doctorId: 'd-alami', reason: 'À supprimer' });
    expect(getNotifications('u-ahmed').length).toBeGreaterThanOrEqual(0);
    resetDemoData();
    expect(getPatients()).toHaveLength(2);
  });
});
