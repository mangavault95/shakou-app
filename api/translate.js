// api/translate.js
// Traduzione testo (default: italiano). Usa l'endpoint pubblico keyless di
// Google Translate lato server (niente CORS, niente API key da configurare).
// In caso di errore restituisce il testo originale come fallback.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  try {
    let payload = req.body || {};
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch (e) { payload = {}; }
    }

    const text = (payload.text || '').toString();
    const target = (payload.target || 'it').toString();
    if (!text.trim()) return res.status(200).json({ translated: '' });

    const url =
      'https://translate.googleapis.com/translate_a/single' +
      `?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`;

    const r = await fetch(url);
    if (!r.ok) return res.status(200).json({ translated: text });

    const data = await r.json();
    // Formato: [ [ [ "tradotto", "originale", ... ], ... ], ... ]
    const translated = Array.isArray(data?.[0])
      ? data[0].map(seg => (seg && seg[0]) || '').join('')
      : text;

    return res.status(200).json({ translated: translated || text });
  } catch (err) {
    console.error('api/translate error', err);
    // Fallback silenzioso: meglio il testo originale che un errore
    let original = '';
    try { original = (typeof req.body === 'object' ? req.body?.text : '') || ''; } catch (e) {}
    return res.status(200).json({ translated: original });
  }
}
