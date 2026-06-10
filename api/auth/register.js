// api/auth/register.js
// Registrazione sicura: controlla duplicati via admin prima di creare l'utente.
import { admin, parseBody } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const { email, password } = parseBody(req);

  if (!email || !password) return res.status(400).json({ error: 'missing_fields' });
  if (password.length < 8) return res.status(400).json({ error: 'password_too_short' });

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email)) return res.status(400).json({ error: 'invalid_email' });

  try {
    // Controlla se l'email è già registrata (client admin, invisibile al frontend)
    const { data: existing } = await admin.auth.admin.getUserByEmail(email.toLowerCase().trim());
    if (existing?.user) {
      return res.status(409).json({ error: 'email_taken' });
    }
  } catch {
    // getUserByEmail lancia se non trovato — non è un errore reale
  }

  try {
    // Crea l'utente: Supabase invia la mail di verifica automaticamente
    const { data, error } = await admin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: false,  // richiede verifica email
    });

    if (error) {
      if (error.message?.toLowerCase().includes('already')) {
        return res.status(409).json({ error: 'email_taken' });
      }
      return res.status(400).json({ error: error.message });
    }

    // Genera e invia il link di conferma email tramite Supabase
    const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || '';
    const { error: linkErr } = await admin.auth.admin.generateLink({
      type: 'signup',
      email: email.toLowerCase().trim(),
      options: { redirectTo: origin || undefined },
    });

    if (linkErr) {
      // L'utente è creato ma il link non è stato inviato — segnaliamo
      console.error('generateLink error', linkErr);
      return res.status(200).json({ ok: true, email_sent: false });
    }

    return res.status(200).json({ ok: true, email_sent: true });
  } catch (err) {
    console.error('register error', err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}
