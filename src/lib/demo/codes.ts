const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const DEMO_CODE_LENGTH = 8;

function randomInt(max: number) {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0] % max;
  }
  return Math.floor(Math.random() * max);
}

export function randomString(length: number) {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export function randomId(prefix: string) {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : randomString(12).toLowerCase();
  return `${prefix}-${random}`;
}

export function generateDemoCode() {
  return randomString(DEMO_CODE_LENGTH);
}

export function formatDemoCode(code: string) {
  const clean = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (clean.length <= 4) return clean;
  return `${clean.slice(0, 4)}-${clean.slice(4, 8)}`;
}

export function normalizeDemoCode(input: string) {
  const clean = (input ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return clean.length === DEMO_CODE_LENGTH ? clean : null;
}

/** Payload QR déterministe d’un patient de démonstration. */
export function patientQrPayload(patientCode: string) {
  return `Sahty://patient/${patientCode}`;
}

/** Payload QR d’un code de remise de démonstration. */
export function claimQrPayload(code: string) {
  return `Sahty://claim?c=${code.replace(/-/g, '')}`;
}

/**
 * Accepte un QR patient, une URL, `SH-482913`, `SH482913` ou `482913`.
 * Retourne le code canonique `SH-######` ou null.
 */
export function normalizePatientCode(input: string): string | null {
  if (!input) return null;
  let value = input.trim();
  if (!value) return null;

  if (/^Sahty:\/\/patient\//i.test(value) || /^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const segments = url.pathname.split('/').filter(Boolean);
      value = segments[segments.length - 1] ?? '';
    } catch {
      const match = value.match(/patient\/([^/?#]+)/i);
      value = match?.[1] ?? value;
    }
  }

  const compact = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const withPrefix = compact.startsWith('SH') ? compact.slice(2) : compact;
  if (/^\d{6}$/.test(withPrefix)) return `SH-${withPrefix}`;
  return null;
}

/** Extrait un code de remise depuis un QR `Sahty://claim?c=…` ou une saisie libre. */
export function extractClaimCode(raw: string): string | null {
  if (!raw) return null;
  let value = raw.trim();
  if (!value) return null;

  if (/^(Sahty:|https?:)/i.test(value)) {
    try {
      const url = new URL(value);
      value =
        url.searchParams.get('c') ??
        url.searchParams.get('code') ??
        url.pathname.split('/').filter(Boolean).pop() ??
        '';
    } catch {
      const match = value.match(/[?&](?:c|code)=([^&]+)/i);
      value = match ? decodeURIComponent(match[1]) : '';
    }
  }

  return normalizeDemoCode(value);
}
