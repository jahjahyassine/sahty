import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { buildReportMessages } from '@/lib/ai/prompts';
import type { ConsultationReportInput } from '@/lib/demo/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  transcript?: string;
  reason?: string;
  locale?: 'ar' | 'fr';
  patient?: {
    fullName?: string;
    age?: number | null;
    allergies?: string[];
    chronicDiseases?: string[];
  };
};

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function coerceReport(raw: unknown, reason: string): ConsultationReportInput {
  const value = (raw ?? {}) as Record<string, unknown>;
  const prescriptions = Array.isArray(value.prescriptions)
    ? value.prescriptions
        .map((row) => {
          const item = (row ?? {}) as Record<string, unknown>;
          return {
            medication: text(item.medication) ?? '',
            dosage: text(item.dosage) ?? '',
            frequency: text(item.frequency) ?? '',
            duration: text(item.duration) ?? '',
            notes: text(item.notes),
          };
        })
        .filter((row) => row.medication && row.dosage && row.frequency && row.duration)
    : [];

  return {
    reason: text(value.reason) ?? reason,
    symptoms: text(value.symptoms),
    examination: text(value.examination),
    diagnosis: text(value.diagnosis),
    treatment: text(value.treatment),
    recommendations: text(value.recommendations),
    followUpDate:
      typeof value.followUpDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.followUpDate)
        ? value.followUpDate
        : null,
    prescriptions,
  };
}

function error(code: string, status: number) {
  return NextResponse.json({ error: { code } }, { status });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return error('UNAUTHORIZED', 401);
  if (session.user.role !== 'DOCTOR') return error('FORBIDDEN', 403);

  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) return error('AI_NOT_CONFIGURED', 501);

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return error('VALIDATION', 400);
  }

  const transcript = body.transcript?.trim();
  if (!transcript || transcript.length < 10) return error('TRANSCRIPT_REQUIRED', 400);
  if (transcript.length > 60_000) return error('TRANSCRIPT_TOO_LONG', 413);

  const baseUrl = (process.env.AI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.AI_REPORT_MODEL ?? 'gpt-4o-mini';
  const reason = body.reason?.trim() || (body.locale === 'ar' ? 'استشارة' : 'Consultation');

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: buildReportMessages({
          transcript,
          reason,
          locale: body.locale === 'ar' ? 'ar' : 'fr',
          patient: body.patient,
        }),
      }),
    });

    if (!response.ok) return error('AI_ERROR', 502);
    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return error('AI_ERROR', 502);

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return error('AI_INVALID_RESPONSE', 502);
    }

    return NextResponse.json({
      data: {
        report: coerceReport(parsed, reason),
        provider: model,
      },
    });
  } catch {
    return error('AI_ERROR', 502);
  }
}
