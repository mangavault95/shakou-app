// api/editions.js
// Repo centrale: edizioni italiane dei manga + statistiche libreria utente.
//
// GET ?source=&external_id=              -> edizioni raggruppate per nome
// GET ?user_stats=1                      -> statistiche aggregate libreria (auth)
// GET ?fetch=1&source=&external_id=&title=&title_en=&volumes_count=N
//                                        -> auto-popola edizioni da Google Books + AnimeClick
// POST { source, external_id, editions:[{edition_name, volumes:[...]}] } -> upsert (admin)
import { admin, getUserFromRequest, parseBody } from './_auth.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const GBOOKS = 'https://www.googleapis.com/books/v1/volumes';
const AC_BASE = 'https://www.animeclick.it';
const FETCH_HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' };

const PUBLISHER_DEFAULT_PRICE = {
  'star comics': 5.20, 'panini': 4.90, 'panini comics': 4.90,
  'j-pop': 7.90, 'jpop': 7.90, 'planet manga': 5.20,
  'flashbook': 6.50, 'rw goen': 5.90, 'goen': 5.90,
  'magic press': 5.20, 'dynit': 5.90, 'edizioni bd': 6.90, 'bd': 6.90,
};
const DEFAULT_MANGA_PRICE = 5.50;

// Parole chiave che indicano un'edizione speciale italiana
const EDITION_KEYWORDS = [
  'perfect edition', 'ultimate deluxe', 'deluxe edition', 'deluxe',
  'kanzenban', 'complete edition', 'omnibus', 'big', 'wide',
  'gold edition', 'master edition', 'nuova edizione', 'collector',
  'starter pack', 'ristampa', 'new edition'
];

async function isAdmin(user) {
  if (!user) return false;
  if (ADMIN_EMAIL && user.email === ADMIN_EMAIL) return true;
  const { data } = await admin.from('profiles').select('role').eq('id', user.id).single();
  return data?.role === 'admin';
}

function normEditionName(raw) {
  if (!raw) return 'Standard';
  const s = raw.trim();
  if (!s || s.toLowerCase() === 'primo' || s.toLowerCase() === 'standard') return 'Standard';
  return s;
}

// Normalizza il nome dell'edizione eliminando il titolo del manga dal prefisso
// es. "20th Century Boys Ultimate Deluxe Edition" -> "Ultimate Deluxe Edition"
function stripMangaTitle(edName, mangaTitle) {
  if (!edName || !mangaTitle) return edName;
  const esc = mangaTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return edName.replace(new RegExp(`^${esc}\\s*`, 'i'), '').trim() || edName;
}

// ─── Google Books ──────────────────────────────────────────────────
async function fetchGoogleBooks(title) {
  const q = encodeURIComponent(`"${title}" manga`);
  try {
    const res = await fetch(`${GBOOKS}?q=${q}&langRestrict=it&maxResults=40&printType=books`);
    const json = await res.json();
    return json?.items || [];
  } catch { return []; }
}

function extractVolNum(s) {
  const m = (s || '').match(/(?:vol(?:ume)?\.?\s*|n[°.]?\s*|#\s*)(\d+)/i)
    || (s || '').match(/\b(\d+)\s*$/);
  return m ? parseInt(m[1], 10) : null;
}

function parseGbooksItems(items, normTitle) {
  const byEdition = {};
  for (const item of items) {
    const vi = item.volumeInfo || {};
    const full = [(vi.title || ''), (vi.subtitle || '')].join(' ').trim();
    const norm = full.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
    if (!norm.includes(normTitle)) continue;

    const volNum = extractVolNum(full) || extractVolNum(vi.subtitle || '');
    if (!volNum || volNum > 500) continue;

    // Rileva nome edizione dal titolo
    let edName = 'Standard';
    for (const kw of EDITION_KEYWORDS) {
      if (norm.includes(kw)) { edName = kw.replace(/\b\w/g, c => c.toUpperCase()); break; }
    }

    if (!byEdition[edName]) byEdition[edName] = {};
    if (byEdition[edName][volNum]) continue;

    const publisher = (vi.publisher || '').trim() || null;
    const si = item.saleInfo || {};
    let price = si.listPrice?.amount || si.retailPrice?.amount || null;
    if (price !== null && (price < 1 || price > 50)) price = null;

    byEdition[edName][volNum] = { volume_number: volNum, publisher, price };
  }
  return byEdition;
}

// ─── AnimeClick ────────────────────────────────────────────────────
// Struttura AnimeClick:
//   Ricerca: GET /ricerca/?q=TITLE&mezzi[]=7   (7 = manga)
//   Pagina manga: /manga/SLUG/
//   Volumi: GET /manga/SLUG/volumi/?per_page=500
//           con parametro &edizione=ID per filtrare
//   La pagina volumi contiene:
//     - select#edizione con le opzioni edizione (value=id, testo=nome)
//     - tabella con righe: titolo | edizione | prezzo | data | editore

async function animeClickSearch(title) {
  // Prova prima con il titolo completo, poi con le prime parole
  for (const q of [title, title.split(' ').slice(0, 3).join(' ')]) {
    try {
      const url = `${AC_BASE}/ricerca/?q=${encodeURIComponent(q)}&mezzi[]=7`;
      const res = await fetch(url, { headers: FETCH_HEADERS });
      if (!res.ok) continue;
      const html = await res.text();
      // Cerca link /manga/SLUG/ nei risultati
      const m = html.match(/href="(https?:\/\/www\.animeclick\.it\/manga\/[a-z0-9\-]+\/?)"/i)
        || html.match(/href="(\/manga\/[a-z0-9\-]+\/?)"/i);
      if (m) {
        const path = m[1].startsWith('http') ? new URL(m[1]).pathname : m[1];
        return path.replace(/\/$/, ''); // es. "/manga/20th-century-boys"
      }
    } catch { /* prova il prossimo */ }
  }
  return null;
}

async function animeClickVolumes(mangaPath) {
  // Fetch pagina volumi — chiediamo tutti i risultati in una volta
  const url = `${AC_BASE}${mangaPath}/volumi/?per_page=1000`;
  try {
    const res = await fetch(url, { headers: FETCH_HEADERS });
    if (!res.ok) return {};
    const html = await res.text();
    return parseAcHtml(html, null);
  } catch { return {}; }
}

function parseAcHtml(html, filterEditionId) {
  const byEdition = {};

  // 1) Estrai le opzioni dal select edizione
  //    <select ... id="edizione"...> <option value="">Tutte</option> <option value="1">Nome</option>
  const editionMap = {}; // id -> nome
  const selMatch = html.match(/<select[^>]*(?:id|name)="edizione"[^>]*>([\s\S]*?)<\/select>/i);
  if (selMatch) {
    const optRe = /<option[^>]+value="(\d+)"[^>]*>([^<]+)<\/option>/gi;
    let om;
    while ((om = optRe.exec(selMatch[1])) !== null) {
      editionMap[om[1]] = om[2].trim();
    }
  }

  // 2) Parsing delle righe della tabella volumi
  //    Struttura tipica: <tr> <td>TITOLO</td> <td>EDIZIONE</td> <td>PREZZO</td> <td>DATA</td> <td>EDITORE</td> </tr>
  //    Oppure con data-edizione="ID" sull'elemento <tr>
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];

  for (const rowMatch of rows) {
    const row = rowMatch[1];
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m =>
      m[1].replace(/<[^>]+>/g, '').trim()
    );
    if (cells.length < 3) continue;

    // Cerca il numero di volume nel titolo (prima cella)
    const titleCell = cells[0] || '';
    const volNum = extractVolNum(titleCell);
    if (!volNum) continue;

    // Edizione: seconda cella o attributo data-edizione sul <tr>
    let edCellText = cells[1] || '';
    const dataEdM = rowMatch[0].match(/data-edizione="([^"]+)"/i);
    if (dataEdM && editionMap[dataEdM[1]]) edCellText = editionMap[dataEdM[1]];

    const edName = normEditionName(edCellText);

    // Prezzo: cerca il pattern €/EUR nelle celle
    let price = null;
    for (const cell of cells) {
      const pm = cell.match(/([\d]+[,.][\d]{2})\s*[€E]|[€E]\s*([\d]+[,.][\d]{2})/);
      if (pm) {
        const n = parseFloat((pm[1] || pm[2]).replace(',', '.'));
        if (n >= 1 && n <= 50) { price = n; break; }
      }
    }

    // Editore: ultima cella significativa
    let publisher = null;
    for (let i = cells.length - 1; i >= 2; i--) {
      const c = cells[i].trim();
      if (c && !c.match(/^\d/) && !c.match(/[€]/)) { publisher = c; break; }
    }

    if (!byEdition[edName]) byEdition[edName] = {};
    // Per ogni volume tieni solo la riga più recente (ultima ristampa = prezzo aggiornato)
    // Sostituiamo sempre (le righe sono ordinate per data asc, l'ultima sovrascrive)
    byEdition[edName][volNum] = { volume_number: volNum, publisher, price };
  }

  return byEdition;
}

async function fetchAnimeClick(title, mangaTitle) {
  const mangaPath = await animeClickSearch(title);
  if (!mangaPath) return {};
  const raw = await animeClickVolumes(mangaPath);

  // Normalizza i nomi edizione rimuovendo il prefisso del titolo manga
  const cleaned = {};
  for (const [edName, vols] of Object.entries(raw)) {
    const cleanName = stripMangaTitle(edName, mangaTitle || title);
    cleaned[cleanName] = vols;
  }
  return cleaned;
}

// ─── Merge ────────────────────────────────────────────────────────
function mergeEditions(gbByEd, acByEd, volCount) {
  const allEdNames = new Set([...Object.keys(gbByEd), ...Object.keys(acByEd)]);
  if (!allEdNames.size) allEdNames.add('Standard');

  const result = {};
  for (const edName of allEdNames) {
    const gb = gbByEd[edName] || {};
    const ac = acByEd[edName] || {};
    const map = {};

    // Priorità: AnimeClick per edizioni italiane, Google Books integra
    for (const [vn, e] of Object.entries(gb)) map[vn] = { ...e };
    for (const [vn, e] of Object.entries(ac)) {
      if (!map[vn]) map[vn] = { ...e };
      else {
        // AnimeClick ha dati più precisi per Italia
        if (e.price) map[vn].price = e.price;
        if (e.publisher) map[vn].publisher = e.publisher;
      }
    }

    const publishers = Object.values(map).map(e => e.publisher).filter(Boolean);
    const topPub = publishers.sort((a, b) =>
      publishers.filter(x => x === b).length - publishers.filter(x => x === a).length
    )[0] || null;
    const defPrice = topPub
      ? (PUBLISHER_DEFAULT_PRICE[topPub.toLowerCase()] || DEFAULT_MANGA_PRICE)
      : DEFAULT_MANGA_PRICE;

    // Completa serie Standard con volumi AniList
    if (edName === 'Standard') {
      const n = Number(volCount);
      if (Number.isInteger(n) && n > 0) {
        for (let i = 1; i <= n; i++) {
          if (!map[i]) map[i] = { volume_number: i, publisher: topPub, price: defPrice };
          else { if (!map[i].publisher) map[i].publisher = topPub; if (!map[i].price) map[i].price = defPrice; }
        }
      }
    }
    for (const e of Object.values(map)) {
      if (!e.publisher) e.publisher = topPub;
      if (!e.price) e.price = defPrice;
    }

    result[edName] = Object.values(map).sort((a, b) => a.volume_number - b.volume_number);
  }
  return result;
}

// ─── Handler ──────────────────────────────────────────────────────
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      if ((req.query.user_stats || '').toString() === '1') {
        const user = await getUserFromRequest(req);
        if (!user) return res.status(401).json({ error: 'unauthorized' });
        const { data: items, error } = await admin
          .from('user_library_stats_view')
          .select('source, external_id, status, volumes_owned, volumes_read, publisher, owned_value')
          .eq('user_id', user.id);
        if (error) throw error;
        return res.status(200).json({ ok: true, stats: computeStats(items || []) });
      }

      if ((req.query.fetch || '').toString() === '1') {
        const source = (req.query.source || '').toString();
        const external_id = (req.query.external_id || '').toString();
        const title = (req.query.title || '').toString().trim();
        const titleEn = (req.query.title_en || '').toString().trim();
        const volCount = req.query.volumes_count;
        if (!source || !external_id || (!title && !titleEn)) return res.status(400).json({ error: 'missing params' });

        // Cache hit
        const { data: existing } = await admin.from('manga_editions').select('id')
          .eq('source', source).eq('external_id', external_id).limit(1);
        if (existing && existing.length) {
          const { data: all } = await admin.from('manga_editions')
            .select('edition_name, volume_number, publisher, title, price, release_date, isbn')
            .eq('source', source).eq('external_id', external_id).order('edition_name').order('volume_number');
          return res.status(200).json({ ok: true, cached: true, editions_by_name: groupByEdition(all || []) });
        }

        const searchTitle = title || titleEn;
        const normTitle = searchTitle.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
        const [gbItems, acByEd] = await Promise.all([
          fetchGoogleBooks(searchTitle),
          fetchAnimeClick(searchTitle, title)
        ]);
        const gbByEd = parseGbooksItems(gbItems, normTitle);
        const editionsByName = mergeEditions(gbByEd, acByEd, volCount);

        const rows = [];
        for (const [edName, vols] of Object.entries(editionsByName)) {
          for (const v of vols) {
            rows.push({
              source, external_id, edition_name: edName,
              volume_number: v.volume_number,
              publisher: v.publisher || null,
              price: v.price || null,
              updated_at: new Date().toISOString()
            });
          }
        }

        if (!rows.length) return res.status(200).json({ ok: true, editions_by_name: {}, fetched: false });

        const { error: saveErr } = await admin.from('manga_editions').insert(rows);
        if (saveErr) console.error('editions insert error', saveErr);

        return res.status(200).json({ ok: true, editions_by_name: editionsByName, fetched: true });
      }

      // GET edizioni salvate
      const source = (req.query.source || '').toString();
      const external_id = (req.query.external_id || '').toString();
      if (!source || !external_id) return res.status(400).json({ error: 'missing source/external_id' });
      const { data, error } = await admin.from('manga_editions')
        .select('edition_name, volume_number, publisher, title, price, release_date, isbn')
        .eq('source', source).eq('external_id', external_id)
        .order('edition_name').order('volume_number');
      if (error) throw error;
      return res.status(200).json({ ok: true, editions_by_name: groupByEdition(data || []) });
    }

    if (req.method === 'POST') {
      const user = await getUserFromRequest(req);
      if (!user) return res.status(401).json({ error: 'unauthorized' });
      if (!(await isAdmin(user))) return res.status(403).json({ error: 'forbidden' });

      const body = parseBody(req);
      const source = (body.source || '').toString();
      const external_id = (body.external_id || '').toString();
      const editions = Array.isArray(body.editions) ? body.editions : [];
      if (!source || !external_id || !editions.length) return res.status(400).json({ error: 'missing params' });

      const rows = [];
      for (const ed of editions) {
        const edName = (ed.edition_name || 'Standard').toString().trim();
        for (const v of (Array.isArray(ed.volumes) ? ed.volumes : [])) {
          if (!Number.isInteger(Number(v.volume_number))) continue;
          rows.push({
            source, external_id, edition_name: edName,
            volume_number: Number(v.volume_number),
            publisher: (v.publisher || '').trim() || null,
            title: (v.title || '').trim() || null,
            price: v.price != null ? Number(v.price) : null,
            release_date: v.release_date || null,
            isbn: (v.isbn || '').trim() || null,
            updated_at: new Date().toISOString()
          });
        }
      }

      const edNames = [...new Set(rows.map(r => r.edition_name))];
      const volNums = [...new Set(rows.map(r => r.volume_number))];
      for (const en of edNames) {
        await admin.from('manga_editions').delete()
          .eq('source', source).eq('external_id', external_id)
          .eq('edition_name', en).in('volume_number', volNums);
      }
      const { data, error } = await admin.from('manga_editions').insert(rows).select();
      if (error) throw error;
      return res.status(200).json({ ok: true, upserted: data?.length || 0 });
    }

    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (err) {
    console.error('editions error', err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}

function groupByEdition(rows) {
  const out = {};
  for (const r of rows) {
    const n = r.edition_name || 'Standard';
    if (!out[n]) out[n] = [];
    out[n].push(r);
  }
  return out;
}

function computeStats(items) {
  const seriesCount = items.length;
  const totalOwned = items.reduce((s, i) => s + (Number(i.volumes_owned) || 0), 0);
  const totalRead = items.reduce((s, i) => s + (Number(i.volumes_read) || 0), 0);
  const collectionValue = items.reduce((s, i) => s + (Number(i.owned_value) || 0), 0);
  const statusBreakdown = {};
  for (const i of items) { const st = i.status || 'sconosciuto'; statusBreakdown[st] = (statusBreakdown[st] || 0) + 1; }
  const publisherBreakdown = {};
  for (const i of items) { if (i.publisher) publisherBreakdown[i.publisher] = (publisherBreakdown[i.publisher] || 0) + 1; }
  const topPublisher = Object.entries(publisherBreakdown).sort((a, b) => b[1] - a[1])[0] || null;
  return {
    seriesCount, totalOwned, totalRead,
    collectionValue: Math.round(collectionValue * 100) / 100,
    statusBreakdown, publisherBreakdown,
    topPublisher: topPublisher ? { name: topPublisher[0], count: topPublisher[1] } : null
  };
}
