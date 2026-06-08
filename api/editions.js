// api/editions.js
// Repo centrale: edizioni italiane dei manga + statistiche libreria utente.
//
// GET ?source=&external_id=              -> edizioni raggruppate per nome
// GET ?user_stats=1                      -> statistiche aggregate libreria (auth)
// GET ?fetch=1&source=&external_id=&title=&title_en=&volumes_count=N
//                                        -> auto-popola edizioni da Google Books + AnimeClick
// POST { source, external_id, editions:[{edition_name, volumes:[{volume_number,publisher,price,...}]}] }
//                                        -> upsert edizioni (admin)
import { admin, getUserFromRequest, parseBody } from './_auth.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const GBOOKS = 'https://www.googleapis.com/books/v1/volumes';
const AC_BASE = 'https://www.animeclic.it';

// Keywords che indicano un'edizione speciale — usati per raggruppare i risultati
const EDITION_KEYWORDS = [
  'perfect edition', 'deluxe edition', 'deluxe', 'kanzenban',
  'complete edition', 'omnibus', 'big', 'wide edition', 'gold edition',
  'master edition', 'nuova edizione', 'edizione deluxe', 'edizione perfect',
  'edizione completa', 'ultimate', 'collector'
];

const PUBLISHER_DEFAULT_PRICE = {
  'star comics': 5.20, 'panini': 4.90, 'panini comics': 4.90,
  'j-pop': 7.90, 'jpop': 7.90, 'planet manga': 5.20,
  'flashbook': 6.50, 'rw goen': 5.90, 'goen': 5.90,
  'magic press': 5.20, 'dynit': 5.90, 'edizioni bd': 6.90, 'bd': 6.90,
};
const DEFAULT_MANGA_PRICE = 5.50;

async function isAdmin(user) {
  if (!user) return false;
  if (ADMIN_EMAIL && user.email === ADMIN_EMAIL) return true;
  const { data } = await admin.from('profiles').select('role').eq('id', user.id).single();
  return data?.role === 'admin';
}

// Estrae il nome dell'edizione da un titolo Google Books
function detectEditionName(fullTitle) {
  const lower = fullTitle.toLowerCase();
  for (const kw of EDITION_KEYWORDS) {
    if (lower.includes(kw)) {
      // Capitalizza correttamente
      return kw.replace(/\b\w/g, c => c.toUpperCase());
    }
  }
  return 'Standard';
}

function extractVolumeNumber(s) {
  const m = (s || '').match(/(?:vol(?:ume)?\.?\s*|n[°.]?\s*|#\s*)(\d+)/i)
    || (s || '').match(/\b(\d+)\s*$/);
  return m ? parseInt(m[1], 10) : null;
}

// ---------- Google Books ----------
async function fetchGoogleBooks(title) {
  const q = encodeURIComponent(`"${title}" manga`);
  try {
    const res = await fetch(`${GBOOKS}?q=${q}&langRestrict=it&maxResults=40&printType=books`);
    const json = await res.json();
    return json?.items || [];
  } catch { return []; }
}

function parseGbooksItems(items, normTitle) {
  // Raggruppa per edition_name
  const byEdition = {};
  for (const item of items) {
    const vi = item.volumeInfo || {};
    const fullTitle = [(vi.title || ''), (vi.subtitle || '')].join(' ').trim();
    const norm = fullTitle.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
    if (!norm.includes(normTitle)) continue;

    const volNum = extractVolumeNumber(fullTitle) || extractVolumeNumber(vi.subtitle || '');
    if (!volNum || volNum > 500) continue;

    const edName = detectEditionName(fullTitle);
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

// ---------- AnimeClick ----------
async function fetchAnimeClick(title) {
  try {
    const q = encodeURIComponent(title);
    const sRes = await fetch(`${AC_BASE}/archivio/manga/?q=${q}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Shakou/1.0)' }
    });
    if (!sRes.ok) return {};
    const sHtml = await sRes.text();

    const linkMatch = sHtml.match(/href="(\/manga\/[a-z0-9\-]+\/)"/i);
    if (!linkMatch) return {};

    const mRes = await fetch(`${AC_BASE}${linkMatch[1]}volumi/`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Shakou/1.0)' }
    });
    if (!mRes.ok) return {};
    const mHtml = await mRes.text();
    return parseAcVolumes(mHtml);
  } catch { return {}; }
}

function parseAcVolumes(html) {
  const byEdition = {};
  // Divide in blocchi per tipo/serie di edizione se presenti
  // Cerca intestazioni di edizione (h2/h3 con nome edizione)
  const edSections = html.split(/(?=<h[23][^>]*>[^<]*<\/h[23]>)/i);

  for (const section of edSections) {
    // Determina nome edizione dalla intestazione
    const hMatch = section.match(/<h[23][^>]*>([^<]+)<\/h[23]>/i);
    const sectionTitle = hMatch ? hMatch[1].trim() : '';
    const edName = detectEditionName(sectionTitle) !== 'Standard' ? detectEditionName(sectionTitle) : 'Standard';
    if (!byEdition[edName]) byEdition[edName] = {};

    // Blocchi volume
    const blocks = section.split(/(?=<[^>]*class="[^"]*(?:volume|vol|book)[^"]*")/i);
    for (const block of blocks) {
      const vm = block.match(/[Vv]ol(?:ume)?\.?\s*(\d+)/);
      if (!vm) continue;
      const volNum = parseInt(vm[1], 10);
      if (byEdition[edName][volNum]) continue;

      let publisher = null;
      const pubM = block.match(/class="[^"]*editore[^"]*"[^>]*>([^<]+)</i);
      if (pubM) publisher = pubM[1].trim();

      let price = null;
      const pm = block.match(/(?:€\s*([\d]+[,.][\d]{2})|([\d]+[,.][\d]{2})\s*€)/);
      if (pm) {
        const n = parseFloat((pm[1] || pm[2]).replace(',', '.'));
        if (n >= 1 && n <= 50) price = n;
      }
      byEdition[edName][volNum] = { volume_number: volNum, publisher, price };
    }
  }
  return byEdition;
}

// ---------- Merge ----------
function mergeEditions(gbByEd, acByEd, volCount) {
  const allEdNames = new Set([...Object.keys(gbByEd), ...Object.keys(acByEd)]);
  if (!allEdNames.size) allEdNames.add('Standard');

  const result = {};
  for (const edName of allEdNames) {
    const gb = gbByEd[edName] || {};
    const ac = acByEd[edName] || {};
    const map = { ...gb };
    for (const [vn, e] of Object.entries(ac)) {
      if (!map[vn]) map[vn] = { ...e };
      else {
        if (!map[vn].price && e.price) map[vn].price = e.price;
        if (!map[vn].publisher && e.publisher) map[vn].publisher = e.publisher;
      }
    }

    const publishers = Object.values(map).map(e => e.publisher).filter(Boolean);
    const topPub = publishers.sort((a, b) =>
      publishers.filter(x => x === b).length - publishers.filter(x => x === a).length
    )[0] || null;
    const defPrice = topPub
      ? (PUBLISHER_DEFAULT_PRICE[topPub.toLowerCase()] || DEFAULT_MANGA_PRICE)
      : DEFAULT_MANGA_PRICE;

    // Completa i volumi mancanti solo per l'edizione Standard (quella principale)
    if (edName === 'Standard') {
      const n = Number(volCount);
      if (Number.isInteger(n) && n > 0) {
        for (let i = 1; i <= n; i++) {
          if (!map[i]) map[i] = { volume_number: i, publisher: topPub, price: defPrice };
          else {
            if (!map[i].publisher) map[i].publisher = topPub;
            if (!map[i].price) map[i].price = defPrice;
          }
        }
      }
    }
    // Per edizioni speciali: riempi solo i volumi già trovati
    for (const e of Object.values(map)) {
      if (!e.publisher) e.publisher = topPub;
      if (!e.price) e.price = defPrice;
    }

    result[edName] = Object.values(map).sort((a, b) => a.volume_number - b.volume_number);
  }
  return result;
}

// ---------- Handler ----------
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
        if (!source || !external_id || (!title && !titleEn)) {
          return res.status(400).json({ error: 'missing params' });
        }

        // Cache hit: ritorna direttamente
        const { data: existing } = await admin
          .from('manga_editions').select('id').eq('source', source).eq('external_id', external_id).limit(1);
        if (existing && existing.length) {
          const { data: all } = await admin.from('manga_editions')
            .select('edition_name, volume_number, publisher, title, price, release_date, isbn')
            .eq('source', source).eq('external_id', external_id).order('volume_number');
          return res.status(200).json({ ok: true, cached: true, editions_by_name: groupByEdition(all || []) });
        }

        const searchTitle = title || titleEn;
        const normTitle = searchTitle.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
        const [gbItems, acByEd] = await Promise.all([
          fetchGoogleBooks(searchTitle),
          fetchAnimeClick(searchTitle)
        ]);
        const gbByEd = parseGbooksItems(gbItems, normTitle);
        const editionsByName = mergeEditions(gbByEd, acByEd, volCount);

        const rows = [];
        for (const [edName, vols] of Object.entries(editionsByName)) {
          for (const v of vols) {
            rows.push({
              source, external_id,
              edition_name: edName,
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
      const { data, error } = await admin
        .from('manga_editions')
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
        await admin.from('manga_editions')
          .delete().eq('source', source).eq('external_id', external_id)
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
