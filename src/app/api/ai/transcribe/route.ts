import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 25 * 1024 * 1024;

function error(code: string, status: number) {
  return NextResponse.json({ error: { code } }, { status });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return error('UNAUTHORIZED', 401);
  if (session.user.role !== 'DOCTOR') return error('FORBIDDEN', 403);

  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) return error('AI_NOT_CONFIGURED', 501);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return error('VALIDATION', 400);
  }

  const audio = form.get('audio');
  if (!(audio instanceof File)) return error('AUDIO_REQUIRED', 400);
  if (audio.size <= 0) return error('AUDIO_REQUIRED', 400);
  if (audio.size > MAX_BYTES) return error('AUDIO_TOO_LARGE', 413);

  const locale = form.get('locale') === 'ar' ? 'ar' : 'fr';
  const baseUrl = (process.env.AI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.AI_TRANSCRIPTION_MODEL ?? 'whisper-1';

  const upstream = new FormData();
  upstream.append('file', audio, audio.name || 'consultation.webm');
  upstream.append('model', model);
  upstream.append('language', locale);

  try {
    const response = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream,
    });
    if (!response.ok) return error('TRANSCRIPTION_ERROR', 502);
    const json = (await response.json()) as { text?: string };
    if (!json.text?.trim()) return error('TRANSCRIPTION_EMPTY', 502);
    return NextResponse.json({
      data: { text: json.text.trim(), provider: model },
    });
  } catch {
    return error('TRANSCRIPTION_ERROR', 502);
  }
}
