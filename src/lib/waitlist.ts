// Shared by the waitlist form (client) and the /api/waitlist endpoint (server).

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const TRADES = [
  'Painting & decorating',
  'General contracting',
  'Plastering & drywall',
  'Carpentry',
  'Electrical',
  'Plumbing',
  'Roofing',
  'Something else',
] as const;

export const CREW_SIZES = ['Just me', '2–5', '6–15', '16+'] as const;

export const DEFAULT_CREW: (typeof CREW_SIZES)[number] = '2–5';

export interface WaitlistPayload {
  name: string;
  email: string;
  trade: string;
  crew: string;
  source: string;
  /** Honeypot — real people never fill this in. */
  company?: string;
}

export interface WaitlistResponse {
  ok: boolean;
  error?: string;
}
