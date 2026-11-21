import type { ConsultationReportInput } from '@/lib/demo/types';

export type ReportValidationCode =
  | 'REASON_REQUIRED'
  | 'DIAGNOSIS_REQUIRED'
  | 'PRESCRIPTION_INCOMPLETE';

export type ReportValidation = {
  ok: boolean;
  errors: ReportValidationCode[];
};

export function isPrescriptionRowComplete(row: {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
}): boolean {
  return Boolean(
    row.medication.trim() &&
      row.dosage.trim() &&
      row.frequency.trim() &&
      row.duration.trim(),
  );
}

export function prescriptionRowStarted(row: {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string | null;
}): boolean {
  return Boolean(
    row.medication.trim() ||
      row.dosage.trim() ||
      row.frequency.trim() ||
      row.duration.trim() ||
      row.notes?.trim(),
  );
}

export function cleanReportInput(report: ConsultationReportInput): ConsultationReportInput {
  const clean = (value: string | null | undefined) => value?.trim() || null;
  return {
    reason: report.reason.trim(),
    symptoms: clean(report.symptoms),
    examination: clean(report.examination),
    diagnosis: clean(report.diagnosis),
    treatment: clean(report.treatment),
    recommendations: clean(report.recommendations),
    followUpDate: report.followUpDate || null,
    prescriptions: report.prescriptions
      .filter(isPrescriptionRowComplete)
      .map((row) => ({
        medication: row.medication.trim(),
        dosage: row.dosage.trim(),
        frequency: row.frequency.trim(),
        duration: row.duration.trim(),
        notes: clean(row.notes),
      })),
  };
}

export function validateReport(report: ConsultationReportInput): ReportValidation {
  const errors: ReportValidationCode[] = [];
  if (!report.reason.trim()) errors.push('REASON_REQUIRED');
  if (!report.diagnosis?.trim()) errors.push('DIAGNOSIS_REQUIRED');
  if (report.prescriptions.some((row) => prescriptionRowStarted(row) && !isPrescriptionRowComplete(row))) {
    errors.push('PRESCRIPTION_INCOMPLETE');
  }
  return { ok: errors.length === 0, errors };
}

export function isReportApprovable(report: ConsultationReportInput): boolean {
  return validateReport(report).ok;
}
