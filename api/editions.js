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
const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer': 'https://www.animeclick.it/',
  'Cache-Control': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
};

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

// Decodifica le entità HTML più comuni nei testi AnimeClick
function decodeEntities(s) {
  if (!s) return '';
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&euro;/gi, '€')
    .replace(/&#8364;/g, '€')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&agrave;/g, 'à').replace(/&egrave;/g, 'è').replace(/&igrave;/g, 'ì')
    .replace(/&ograve;/g, 'ò').replace(/&ugrave;/g, 'ù').replace(/&eacute;/g, 'é');
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
  // Returns '' when edName is exactly the manga title (base edition → 'Standard')
  return edName.replace(new RegExp(`^${esc}\\s*`, 'i'), '').trim();
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

async function animeClickSearch(title, dbg) {
  // URL formato AnimeClick: /manga/ID/SLUG/  (es. /manga/9544/20th-century-boys)
  // Proviamo diversi formati di ricerca finché uno restituisce link /manga/ID/SLUG
  const q = encodeURIComponent(title);
  // Form ufficiale: action="/cerca" method=GET, campi tipo + name
  const candidates = [
    `/cerca?tipo=manga&name=${q}`,
    `/cerca?name=${q}`,
  ];
  // Parole del titolo per scegliere lo slug migliore
  const titleWords = title.toLowerCase().normalize('NFKD')
    .replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(w => w.length > 1);

  dbg.search_attempts = [];
  for (const cand of candidates) {
    try {
      const url = `${AC_BASE}${cand}`;
      const res = await fetch(url, { headers: FETCH_HEADERS });
      const html = await res.text();
      const links = [...new Set([...html.matchAll(/\/manga\/\d+\/[a-z0-9-]+/gi)].map(x => x[0]))];
      const pageTitle = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || '';
      dbg.search_attempts.push({
        cand, status: res.status, len: html.length,
        title: pageTitle.trim().slice(0, 60),
        manga_links: links.slice(0, 3),
      });
      if (res.ok && links.length) {
        // Scegli il link col maggior numero di parole del titolo nello slug
        const scored = links.map(href => {
          const slug = href.split('/')[3] || '';
          const score = titleWords.filter(w => slug.includes(w)).length;
          return { href, score };
        }).sort((a, b) => b.score - a.score);
        dbg.best_match = scored[0];
        if (scored[0].score > 0) return scored[0].href.replace(/\/$/, '');
      }
    } catch (e) {
      dbg.search_attempts.push({ cand, error: String(e.message || e) });
    }
  }
  return null;
}

async function animeClickVolumes(mangaPath, dbg) {
  const url = `${AC_BASE}${mangaPath}/edizioni`;
  try {
    const res = await fetch(url, { headers: { ...FETCH_HEADERS, Referer: `${AC_BASE}${mangaPath}/` } });
    const html = await res.text();
    dbg.vol_status = res.status;
    dbg.vol_len = html.length;
    dbg.vol_snippet = html.slice(0, 300);
    if (!res.ok) return {};
    return parseAcHtml(html, dbg);
  } catch (e) { dbg.vol_error = String(e.message || e); return {}; }
}

function parseAcHtml(html, dbg = {}) {
  const byEdition = {};

  // 1) Mappa id -> nome edizione dal <select id="select_collana_edizione">
  const editionMap = {};
  const selMatch = html.match(/<select[^>]*id="select_collana_edizione"[^>]*>([\s\S]*?)<\/select>/i);
  if (selMatch) {
    const optRe = /<option[^>]+value="(\d+)"[^>]*>([^<]+)<\/option>/gi;
    let om;
    while ((om = optRe.exec(selMatch[1])) !== null) {
      editionMap[om[1]] = om[2].trim();
    }
  }
  dbg.select_found = Boolean(selMatch);
  dbg.edition_map = editionMap;
  let rowsTotal = 0, rowsMatched = 0;
  const sampleRows = [];

  // 2) Righe tabella #table-edizioni
  // Struttura colonne: [hidden edition_id] [img] [title+link] [ristampa] [price] [date] [publisher] [ratings]
  const rows = [...html.matchAll(/<tr([^>]*)>([\s\S]*?)<\/tr>/gi)];

  for (const rowMatch of rows) {
    rowsTotal++;
    const inner = rowMatch[2];
    const rawCells = [...inner.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/gi)];
    if (rawCells.length < 5) continue;

    // Prima cella hidden: edition_id
    const firstAttrs = rawCells[0][1];
    const firstContent = rawCells[0][2].replace(/<[^>]+>/g, '').trim();
    const isHidden = /display\s*:\s*none/i.test(firstAttrs);
    if (!isHidden || !/^\d+$/.test(firstContent)) continue;
    const editionId = firstContent;
    rowsMatched++;

    // Nome edizione dalla mappa
    const rawEdName = editionMap[editionId] || '';
    const edName = normEditionName(rawEdName) || 'Standard';

    // Testo pulito di ogni cella (tag rimossi, entità decodificate)
    const cellText = rawCells.map(c => decodeEntities(c[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim());

    // Titolo con link (cella 2) — numero volume = ultimo numero del testo
    const volM = (cellText[2] || '').match(/(\d+)\s*$/);
    if (!volM) continue;
    const volNum = parseInt(volM[1], 10);
    if (!volNum || volNum > 300) continue;

    // Prezzo: scansiona le celle dopo il titolo cercando un importo con €
    let price = null;
    for (let i = 3; i < cellText.length; i++) {
      const pm = cellText[i].match(/(\d{1,3}[,.]\d{2})\s*€/) || cellText[i].match(/€\s*(\d{1,3}[,.]\d{2})/);
      if (pm) {
        const n = parseFloat(pm[1].replace(',', '.'));
        if (n >= 0.5 && n <= 200) { price = n; break; }
      }
    }

    // Editore: ultima cella con testo alfabetico che non sia data né prezzo
    let publisher = null;
    for (let i = cellText.length - 1; i >= 3; i--) {
      const c = cellText[i];
      if (c && /[a-zà-ù]{3,}/i.test(c) && !/\d{2}\/\d{2}\/\d{4}/.test(c) && !/€/.test(c)) {
        publisher = c; break;
      }
    }

    if (sampleRows.length < 2) {
      sampleRows.push({ editionId, edName, volNum, price, publisher, cellText: cellText.slice(0, 8) });
    }

    if (!byEdition[edName]) byEdition[edName] = {};
    // Le righe "Primo"/"1° Ristampa"/ecc. appartengono alla stessa edizione e volume.
    // Teniamo solo la prima occorrenza (Primo = edizione originale con prezzo originale).
    if (!byEdition[edName][volNum]) {
      byEdition[edName][volNum] = { volume_number: volNum, publisher, price };
    }
  }

  dbg.rows_total = rowsTotal;
  dbg.rows_matched = rowsMatched;
  dbg.sample_rows = sampleRows;
  return byEdition;
}

async function fetchAnimeClick(title, mangaTitle) {
  const dbg = {};
  const mangaPath = await animeClickSearch(title, dbg);
  if (!mangaPath) return { path: null, byEd: {}, dbg };
  const raw = await animeClickVolumes(mangaPath, dbg);

  const byEd = {};
  for (const [edName, vols] of Object.entries(raw)) {
    const cleanName = stripMangaTitle(edName, mangaTitle || title) || 'Standard';
    byEd[cleanName] = vols;
  }
  return { path: mangaPath, byEd, dbg };
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
      // Rotta di ispezione/debug: esamina una pagina AnimeClick tramite Vercel
      // ?inspect=/path[&find=keyword]
      if (req.query.inspect) {
        const path = req.query.inspect.toString();
        if (!path.startsWith('/')) return res.status(400).json({ error: 'path deve iniziare con /' });
        const url = `${AC_BASE}${path}`;
        const r = await fetch(url, { headers: FETCH_HEADERS });
        const html = await r.text();
        // Estrai i form: action + nomi input/select
        const forms = [...html.matchAll(/<form([^>]*)>([\s\S]*?)<\/form>/gi)].slice(0, 6).map(fm => {
          const action = (fm[1].match(/action="([^"]*)"/i) || [])[1] || '';
          const method = (fm[1].match(/method="([^"]*)"/i) || [])[1] || 'GET';
          const inputs = [...fm[2].matchAll(/<(?:input|select|textarea)[^>]*\bname="([^"]+)"[^>]*>/gi)].map(x => x[1]);
          return { action, method, inputs: [...new Set(inputs)] };
        });
        const out = { url, status: r.status, len: html.length, forms };
        if (req.query.find) {
          const kw = req.query.find.toString();
          const snippets = [];
          let idx = 0;
          while (snippets.length < 4) {
            idx = html.indexOf(kw, idx);
            if (idx === -1) break;
            snippets.push(html.slice(Math.max(0, idx - 200), idx + 400));
            idx += kw.length;
          }
          out.find = kw;
          out.snippets = snippets;
        }
        return res.status(200).json(out);
      }

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
        const force = (req.query.force || '').toString() === '1';
        if (!source || !external_id || (!title && !titleEn)) return res.status(400).json({ error: 'missing params' });

        // Cache hit (bypassato se force=1)
        if (!force) {
          const { data: existing } = await admin.from('manga_editions').select('id')
            .eq('source', source).eq('external_id', external_id).limit(1);
          if (existing && existing.length) {
            const { data: all } = await admin.from('manga_editions')
              .select('edition_name, volume_number, publisher, title, price, release_date, isbn')
              .eq('source', source).eq('external_id', external_id).order('edition_name').order('volume_number');
            return res.status(200).json({ ok: true, cached: true, editions_by_name: groupByEdition(all || []) });
          }
        } else {
          await admin.from('manga_editions').delete()
            .eq('source', source).eq('external_id', external_id);
        }

        const searchTitle = title || titleEn;
        const normTitle = searchTitle.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
        const [gbItems, acResult] = await Promise.all([
          fetchGoogleBooks(searchTitle),
          fetchAnimeClick(searchTitle, title)
        ]);
        const acByEd = acResult.byEd;
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

        const _debug = {
          ac_path: acResult.path,
          ac_diag: acResult.dbg,
          ac_editions: Object.fromEntries(Object.entries(acByEd).map(([k, v]) => [k, Object.keys(v).length])),
          gb_editions: Object.fromEntries(Object.entries(gbByEd).map(([k, v]) => [k, Object.keys(v).length])),
          merged_editions: Object.fromEntries(Object.entries(editionsByName).map(([k, v]) => [k, v.length])),
        };

        if (!rows.length) return res.status(200).json({ ok: true, editions_by_name: {}, fetched: false, _debug });

        const { error: saveErr } = await admin.from('manga_editions').insert(rows);
        if (saveErr) return res.status(200).json({ ok: true, editions_by_name: editionsByName, fetched: true, save_error: saveErr.message, _debug });

        return res.status(200).json({ ok: true, editions_by_name: editionsByName, fetched: true, _debug });
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
