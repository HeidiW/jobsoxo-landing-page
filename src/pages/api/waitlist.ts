import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { CREW_SIZES, EMAIL_RE, TRADES, type WaitlistPayload, type WaitlistResponse } from '../../lib/waitlist';

// Runs as a Vercel serverless function; every other page is static.
export const prerender = false;

const FROM = 'JobsOxo <hello@jobsoxo.com>';
const UNIQUE_VIOLATION = '23505';

function json(body: WaitlistResponse, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function env(name: string): string | undefined {
  return process.env[name] || (import.meta.env[name] as string | undefined);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function str(v: unknown, max: number) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

async function sendEmail(apiKey: string, message: { to: string; subject: string; html: string; text: string; reply_to?: string }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, ...message }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

function confirmationEmail(name: string) {
  const first = name.split(/\s+/)[0];
  const greeting = first ? `Hi ${first},` : 'Hi,';
  const text = [
    greeting,
    '',
    "Thanks for joining the JobsOxo waitlist. You're on the list.",
    '',
    "We're letting in a small group of contractors first. When your spot opens up, we'll email you here and help you move your clients and jobs in.",
    '',
    'Any questions, just reply to this email.',
    '',
    '— The JobsOxo team',
    'jobsoxo.com',
  ].join('\n');
  const html = `<div style="font-family:Inter,system-ui,sans-serif;font-size:16px;line-height:1.55;color:#121412;max-width:520px">
<p>${escapeHtml(greeting)}</p>
<p>Thanks for joining the JobsOxo waitlist. <strong>You're on the list.</strong></p>
<p>We're letting in a small group of contractors first. When your spot opens up, we'll email you here and help you move your clients and jobs in.</p>
<p>Any questions, just reply to this email.</p>
<p>— The JobsOxo team<br><a href="https://jobsoxo.com" style="color:#31572C">jobsoxo.com</a></p>
</div>`;
  return { subject: "You're on the JobsOxo waitlist", html, text };
}

export const POST: APIRoute = async ({ request }) => {
  let body: Partial<WaitlistPayload>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  // Honeypot filled in: pretend it worked so bots don't retry.
  if (str(body.company, 200)) return json({ ok: true });

  const email = str(body.email, 254).toLowerCase();
  const name = str(body.name, 120);
  const trade = str(body.trade, 60);
  const crew = str(body.crew, 20);
  const source = str(body.source, 40) || 'landing';

  if (!EMAIL_RE.test(email)) return json({ ok: false, error: 'invalid_email' }, 400);
  if (trade && !(TRADES as readonly string[]).includes(trade)) return json({ ok: false, error: 'invalid_trade' }, 400);
  if (crew && !(CREW_SIZES as readonly string[]).includes(crew)) return json({ ok: false, error: 'invalid_crew' }, 400);

  const supabaseUrl = env('SUPABASE_URL');
  const supabaseKey = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseKey) {
    console.error('waitlist: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set');
    return json({ ok: false, error: 'not_configured' }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  const { error } = await supabase
    .from('waitlist')
    .insert({ name: name || null, email, trade: trade || null, crew: crew || null, source });

  if (error) {
    // Already signed up: treat as success so we don't reveal who's on the list.
    if (error.code === UNIQUE_VIOLATION) return json({ ok: true });
    console.error('waitlist: insert failed', error);
    return json({ ok: false, error: 'storage_failed' }, 500);
  }

  // Email is best-effort: a Resend failure shouldn't lose or fail the signup.
  const resendKey = env('RESEND_API_KEY');
  if (resendKey) {
    const notify = env('WAITLIST_NOTIFY_EMAIL');
    const jobs = [sendEmail(resendKey, { to: email, ...confirmationEmail(name) })];
    if (notify) {
      const summary = `${name || '(no name)'} <${email}> · ${trade || 'trade not given'} · crew ${crew || '?'}`;
      jobs.push(
        sendEmail(resendKey, {
          to: notify,
          reply_to: email,
          subject: `New waitlist signup: ${name || email}`,
          text: summary,
          html: `<p>${escapeHtml(summary)}</p>`,
        }),
      );
    }
    const results = await Promise.allSettled(jobs);
    for (const r of results) if (r.status === 'rejected') console.error('waitlist: email failed', r.reason);
  } else {
    console.warn('waitlist: RESEND_API_KEY not set, skipping confirmation email');
  }

  return json({ ok: true });
};

export const ALL: APIRoute = () =>
  new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', Allow: 'POST' },
  });
