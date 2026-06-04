// src/utils/translate.js
export async function translateText(text, target = 'it') {
  if (!text) return null;

  // Preferisci LibreTranslate se disponibile (setta LIBRE_TRANSLATE_URL e LIBRE_TRANSLATE_KEY)
  const LIBRE_URL = process.env.LIBRE_TRANSLATE_URL || '';
  const LIBRE_KEY = process.env.LIBRE_TRANSLATE_KEY || '';

  try {
    if (LIBRE_URL) {
      const r = await fetch(`${LIBRE_URL}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(LIBRE_KEY ? { 'Authorization': `Bearer ${LIBRE_KEY}` } : {})
        },
        body: JSON.stringify({ q: text, source: 'auto', target, format: 'text' })
      });
      const j = await r.json();
      return j.translatedText || text;
    }

    // Fallback: Google Translate REST (richiede API key in env GOOGLE_TRANSLATE_KEY)
    const GOOGLE_KEY = process.env.GOOGLE_TRANSLATE_KEY || '';
    if (GOOGLE_KEY) {
      const r = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, target })
      });
      const j = await r.json();
      return j.data?.translations?.[0]?.translatedText || text;
    }

    // No translator configured: return original
    return text;
  } catch (err) {
    console.warn('translateText failed', err);
    return text;
  }
}
