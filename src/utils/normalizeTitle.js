// src/utils/normalizeTitle.js
export function normalizeTitle(raw) {
  if (!raw) return 'Untitled';

  // Caso: stringa che contiene JSON come '{"romaji":"..."}'
  if (typeof raw === 'string') {
    // prova a parsare JSON; se fallisce, restituisci la stringa così com'è
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed.romaji || parsed.english || parsed.native || Object.values(parsed)[0] || 'Untitled';
      }
      return raw;
    } catch (e) {
      // non è JSON, è una semplice stringa titolo
      return raw;
    }
  }

  // Caso: oggetto titolo { romaji, english, native, ... }
  if (typeof raw === 'object') {
    return raw.romaji || raw.english || raw.native || raw.title || Object.values(raw)[0] || 'Untitled';
  }

  // fallback
  return String(raw);
}
