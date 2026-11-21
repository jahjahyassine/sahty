import { describe, expect, it } from 'vitest';
import { generateLocalReport } from '../src/lib/ai/report-provider';
import { __testing } from '../src/lib/ai/report-provider';

describe('générateur local déterministe', () => {
  it('extrait les phrases du transcript sans appel réseau', async () => {
    const input = {
      transcript:
        'Le patient a mal à la tête. Examen: tension 130/80 et saturation 98%. Diagnostic: migraine probable. Traitement: repos. Conseil: boire de l’eau et revoir dans 5 jours.',
      reason: 'Céphalée',
      locale: 'fr' as const,
    };
    const result = await generateLocalReport(input);
    expect(result.source).toBe('local');
    expect(result.provider).toBe('local-heuristic');
    expect(result.report.reason).toBe('Céphalée');
    expect(result.report.examination).toContain('tension');
    expect(result.report.diagnosis).toContain('migraine');
    expect(result.report.recommendations).toContain('boire');
    expect(result.report.followUpDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.warning).toContain('sans modèle externe');
  });

  it('fonctionne avec un transcript arabe', async () => {
    const result = await generateLocalReport({
      transcript: 'ألم في الصدر. تشخيص محتمل ضغط الدم. ننصح بشرب الماء.',
      reason: 'ألم صدر',
      locale: 'ar',
    });
    expect(result.report.reason).toBe('ألم صدر');
    expect(result.report.symptoms).toContain('ألم');
    expect(result.report.diagnosis).toContain('تشخيص');
  });

  it('ne déduit aucune date sans mention explicite', () => {
    expect(__testing.inferFollowUpDate('Le patient va mieux.')).toBeNull();
    expect(__testing.inferFollowUpDate('Revoir dans 10 jours.')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
