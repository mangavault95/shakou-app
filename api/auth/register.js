// api/auth/register.js
// Registrazione: check duplicati (admin) → crea utente → manda email verifica via Resend.
import { admin, parseBody } from '../_auth.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = process.env.VITE_APP_URL || process.env.APP_URL || '';

async function sendVerificationEmail(toEmail, verificationUrl) {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY non configurata');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Shakou <onboarding@resend.dev>',
      to: [toEmail],
      subject: 'Verifica il tuo account Shakou',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <h2 style="color:#7c3aed;margin:0 0 8px">Benvenuto su Shakou</h2>
          <p style="color:#444;margin:0 0 24px">Clicca il pulsante per verificare il tuo indirizzo email e attivare l'account.</p>
          <a href="${verificationUrl}"
             style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700">
            Verifica email
          </a>
          <p style="color:#888;font-size:12px;margin-top:24px">
            Se non hai richiesto la registrazione, ignora questa email.<br>
            Il link scade dopo 24 ore.
          </p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const { email, password } = parseBody(req);

  if (!email || !password) return res.status(400).json({ error: 'missing_fields' });
  if (password.length < 8) return res.status(400).json({ error: 'password_too_short' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'invalid_email' });

  const normalizedEmail = email.toLowerCase().trim();

  // 1) Check duplicato via admin
  try {
    const { data: existing } = await admin.auth.admin.getUserByEmail(normalizedEmail);
    if (existing?.user) return res.status(409).json({ error: 'email_taken' });
  } catch {
    // non trovato = ok, andiamo avanti
  }

  // 2) Crea utente (non confermato)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: false,
  });

  if (createErr) {
    if (createErr.message?.toLowerCase().includes('already')) {
      return res.status(409).json({ error: 'email_taken' });
    }
    return res.status(400).json({ error: createErr.message });
  }

  // 3) Genera link di verifica
  const origin = APP_URL || req.headers.origin || '';
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'signup',
    email: normalizedEmail,
    options: { redirectTo: origin || undefined },
  });

  if (linkErr || !linkData?.properties?.action_link) {
    console.error('generateLink error', linkErr);
    return res.status(200).json({ ok: true, email_sent: false, reason: 'link_generation_failed' });
  }

  // 4) Manda email via Resend
  const actionLink = linkData.properties?.action_link;
  if (!actionLink) {
    return res.status(200).json({ ok: true, email_sent: false, reason: 'no_action_link', link_keys: Object.keys(linkData.properties || {}) });
  }

  try {
    await sendVerificationEmail(normalizedEmail, actionLink);
    return res.status(200).json({ ok: true, email_sent: true });
  } catch (mailErr) {
    return res.status(200).json({ ok: true, email_sent: false, reason: mailErr.message });
  }
}
