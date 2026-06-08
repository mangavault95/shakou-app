// api/editions.js
// Repo centrale: edizioni italiane dei manga + statistiche libreria utente.
//
// GET ?source=&external_id=              -> volumi/edizioni per un manga
// GET ?user_stats=1                      -> statistiche aggregate libreria (auth)
// GET ?fetch=1&source=&external_id=&title=&title_en=&volumes_count=N
//                                        -> auto-popola edizioni da Google Books + AnimeClick
// POST { source, external_id, volumes:[...] } -> upsert edizioni (admin only)
import { admin, getUserFromRequest, parseBody } from './_auth.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const GBOOKS = 'https://www.googleapis.com/books/v1/volumes';
const AC_BASE = 'https://www.animeclic.it';

// Prezzi medi italiani per editore (fallback quando né Google Books né AnimeClick danno il prezzo)
const PUBLISHER_DEFAULT_PRICE = {
  'star comics':  5.20,
  'panini':       4.90,
  'panini comics':4.90,
  'j-pop':        7.90,
  'jpop':         7.90,
  'planet manga': 5.20,
  'flashbook':    6.50,
  'rw goen':      5.90,
  'goen':         5.90,
  'magic press':  5.20,
  'dynit':        5.90,
  'edizioni bd':  6.90,
  'bd':           6.90,
};
const DEFAULT_MANGA_PRICE = 5.50; // media generica

async function isAdmin(user) {
  if (!user) return false;
  if (ADMIN_EMAIL && user.email === ADMIN_EMAIL) return true;
  const { data } = await admin.from('profiles').select('role').eq('id', user.id).single();
  return data?.role === 'admin';
}

// ---------- Google Books ----------
async function fetchGoogleBooks(title) {
  const q = encodeURIComponent(`"${title}" manga`);
  const url = `${GBOOKS}?q=${q}&langRestrict=it&maxResults=20&printType=books`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    return json?.items || [];
  } catch { return []; }
}

function extractVolumeNumber(s) {
  // "One Piece, Vol. 3" / "One Piece 3" / "volume 3" / "vol. 3" / "n. 3" / "#3"
  const m = (s || '').match(/(?:vol(?:ume)?\.?\s*|n[°.]?\s*|#\s*)(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

function parseGbooksItems(items, normalizedTitle) {
  const results = {};
  for (const item of items) {
    const vi = item.volumeInfo || {};
    const fullTitle = (vi.title || '') + ' ' + (vi.subtitle || '');
    const norm = fullTitle.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
    // accetta solo se il titolo normalizzato contiene il titolo cercato
    if (!norm.includes(normalizedTitle)) continue;

    const volNum = extractVolumeNumber(fullTitle) || extractVolumeNumber(vi.subtitle || '');
    if (!volNum) continue;
    if (results[volNum]) continue; // già trovato

    const publisher = (vi.publisher || '').trim() || null;
    const saleInfo = item.saleInfo || {};
    let price = null;
    if (saleInfo.listPrice?.amount) price = saleInfo.listPrice.amount;
    else if (saleInfo.retailPrice?.amount) price = saleInfo.retailPrice.amount;

    // scarta prezzi palesemente sbagliati (< 1 € o > 50 €)
    if (price !== null && (price < 1 || price > 50)) price = null;

    results[volNum] = { volume_number: volNum, publisher, price };
  }
  return Object.values(results);
}

// ---------- AnimeClick ----------
// Cerca il manga su AnimeClick e tenta di estrarre editore + prezzi dei volumi.
async function fetchAnimeClick(title) {
  try {
    const q = encodeURIComponent(title);
    // 1) Pagina di ricerca
    const searchUrl = `${AC_BASE}/archivio/manga/?q=${q}`;
    const sRes = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Shakou/1.0)' }
    });
    if (!sRes.ok) return [];
    const sHtml = await sRes.text();

    // Trova il primo link manga nell'archivio
    // Pattern tipico: href="/manga/nome-manga/" dentro una lista risultati
    const linkMatch = sHtml.match(/href="(\/manga\/[^"]+\/)"[^>]*>[^<]*<[^>]+>[^<]*<\/[^>]+>\s*[^<]*<[^>]+class="[^"]*titolo[^"]*"[^>]*>\s*([^<]+)/i)
      || sHtml.match(/href="(\/manga\/[a-z0-9\-]+\/)"/i);
    if (!linkMatch) return [];

    const mangaPath = linkMatch[1];
    // 2) Pagina del manga: cerca link alla sezione volumi/edizioni
    const mRes = await fetch(`${AC_BASE}${mangaPath}volumi/`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Shakou/1.0)' }
    });
    if (!mRes.ok) return [];
    const mHtml = await mRes.text();

    return parseAnimeClickVolumes(mHtml);
  } catch { return []; }
}

function parseAnimeClickVolumes(html) {
  const results = [];
  // Cerca pattern "Vol. N" o "Volume N" e il prezzo nelle vicinanze
  // AnimeClick mostra prezzi come "€ 5,20" o "5,20 €"
  const priceRe = /(?:€\s*([\d]+[,.][\d]{2})|([\d]+[,.][\d]{2})\s*€)/g;
  const volRe = /[Vv]ol(?:ume)?\.?\s*(\d+)/g;

  // Estrai sezioni di testo per ogni volume cercando prossimità tra numero volume e prezzo
  // Dividi l'HTML in blocchi per ogni voce di volume
  const blocks = html.split(/(?=<[^>]*class="[^"]*(?:volume|vol|book)[^"]*")/i);
  for (const block of blocks) {
    const vm = block.match(/[Vv]ol(?:ume)?\.?\s*(\d+)/);
    if (!vm) continue;
    const volNum = parseInt(vm[1], 10);

    // Cerca editore
    let publisher = null;
    const pubM = block.match(/class="[^"]*editore[^"]*"[^>]*>([^<]+)</i)
      || block.match(/[Ee]ditore[^:]*:\s*<[^>]*>([^<]+)/);
    if (pubM) publisher = pubM[1].trim();

    // Cerca prezzo nel blocco
    let price = null;
    const pm = block.match(/(?:€\s*([\d]+[,.][\d]{2})|([\d]+[,.][\d]{2})\s*€)/);
    if (pm) {
      const raw = (pm[1] || pm[2]).replace(',', '.');
      const n = parseFloat(raw);
      if (n >= 1 && n <= 50) price = n;
    }

    if (!results.find(r => r.volume_number === volNum)) {
      results.push({ volume_number: volNum, publisher, price });
    }
  }

  // Se i blocchi non hanno funzionato, prova estrazione globale prezzi ordinati
  if (results.length === 0) {
    const allVols = [...html.matchAll(/[Vv]ol(?:ume)?\.?\s*(\d+)/g)].map(m => parseInt(m[1]));
    const allPrices = [...html.matchAll(/(?:€\s*([\d,]+)|([\d,]+)\s*€)/g)]
      .map(m => parseFloat((m[1] || m[2]).replace(',', '.')))
      .filter(p => p >= 1 && p <= 50);

    for (let i = 0; i < Math.min(allVols.length, allPrices.length); i++) {
      const vn = allVols[i];
      if (!results.find(r => r.volume_number === vn)) {
        results.push({ volume_number: vn, publisher: null, price: allPrices[i] });
      }
    }
  }

  return results;
}

// ---------- Merge & store ----------
function mergeEditions(gbData, acData, volCount) {
  const map = {};

  // Priorità: Google Books per publisher e prezzo; AnimeClick come fallback prezzo
  for (const e of gbData) map[e.volume_number] = { ...e };
  for (const e of acData) {
    if (!map[e.volume_number]) map[e.volume_number] = { volume_number: e.volume_number, publisher: null, price: null };
    if (!map[e.volume_number].price && e.price) map[e.volume_number].price = e.price;
    if (!map[e.volume_number].publisher && e.publisher) map[e.volume_number].publisher = e.publisher;
  }

  // Stima del publisher prevalente per riempire quelli mancanti
  const publishers = Object.values(map).map(e => e.publisher).filter(Boolean);
  const topPub = publishers.sort((a, b) =>
    publishers.filter(x => x === b).length - publishers.filter(x => x === a).length
  )[0] || null;

  // Riempi i volumi mancanti (se volCount noto) con il publisher prevalente e prezzo default
  const defaultPrice = topPub
    ? (PUBLISHER_DEFAULT_PRICE[topPub.toLowerCase()] || DEFAULT_MANGA_PRICE)
    : DEFAULT_MANGA_PRICE;

  const n = Number(volCount);
  if (Number.isInteger(n) && n > 0) {
    for (let i = 1; i <= n; i++) {
      if (!map[i]) map[i] = { volume_number: i, publisher: topPub, price: defaultPrice };
      else {
        if (!map[i].publisher) map[i].publisher = topPub;
        if (!map[i].price) map[i].price = defaultPrice;
      }
    }
  } else {
    // Senza volCount: riempi solo i volumi trovati
    for (const e of Object.values(map)) {
      if (!e.publisher) e.publisher = topPub;
      if (!e.price) e.price = defaultPrice;
    }
  }

  return Object.values(map).sort((a, b) => a.volume_number - b.volume_number);
}

// ---------- Handler ----------
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // Statistiche aggregate libreria utente
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

      // Auto-fetch edizioni da Google Books + AnimeClick
      if ((req.query.fetch || '').toString() === '1') {
        const source = (req.query.source || '').toString();
        const external_id = (req.query.external_id || '').toString();
        const title = (req.query.title || '').toString().trim();
        const titleEn = (req.query.title_en || '').toString().trim();
        const volCount = req.query.volumes_count;
        if (!source || !external_id || (!title && !titleEn)) {
          return res.status(400).json({ error: 'missing params' });
        }

        // Se le edizioni esistono già non le ri-fetchare
        const { data: existing } = await admin
          .from('manga_editions')
          .select('id')
          .eq('source', source).eq('external_id', external_id)
          .limit(1);
        if (existing && existing.length) {
          const { data: all } = await admin.from('manga_editions')
            .select('volume_number, publisher, title, price, release_date, isbn')
            .eq('source', source).eq('external_id', external_id)
            .order('volume_number');
          return res.status(200).json({ ok: true, cached: true, editions: all || [] });
        }

        // Fetch parallelo
        const searchTitle = title || titleEn;
        const normTitle = searchTitle.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
        const [gbItems, acItems] = await Promise.all([
          fetchGoogleBooks(searchTitle),
          fetchAnimeClick(searchTitle)
        ]);

        const gbData = parseGbooksItems(gbItems, normTitle);
        const editions = mergeEditions(gbData, acItems, volCount);

        if (!editions.length) {
          return res.status(200).json({ ok: true, editions: [], fetched: false });
        }

        // Salva su DB
        const rows = editions.map(e => ({
          source, external_id,
          volume_number: e.volume_number,
          publisher: e.publisher || null,
          price: e.price || null,
          updated_at: new Date().toISOString()
        }));
        const { data: saved, error: saveErr } = await admin
          .from('manga_editions').insert(rows).select();
        if (saveErr) {
          console.error('editions insert error', saveErr);
          return res.status(200).json({ ok: true, editions, fetched: true, saved: false });
        }
        return res.status(200).json({ ok: true, editions: saved || editions, fetched: true, saved: true });
      }

      // Edizioni per un singolo manga (già salvate)
      const source = (req.query.source || '').toString();
      const external_id = (req.query.external_id || '').toString();
      if (!source || !external_id) return res.status(400).json({ error: 'missing source/external_id' });
      const { data, error } = await admin
        .from('manga_editions')
        .select('volume_number, publisher, title, price, release_date, isbn')
        .eq('source', source).eq('external_id', external_id)
        .order('volume_number', { ascending: true });
      if (error) throw error;
      return res.status(200).json({ ok: true, editions: data || [] });
    }

    if (req.method === 'POST') {
      const user = await getUserFromRequest(req);
      if (!user) return res.status(401).json({ error: 'unauthorized' });
      if (!(await isAdmin(user))) return res.status(403).json({ error: 'forbidden' });

      const body = parseBody(req);
      const source = (body.source || '').toString();
      const external_id = (body.external_id || '').toString();
      const volumes = Array.isArray(body.volumes) ? body.volumes : [];
      if (!source || !external_id || !volumes.length) return res.status(400).json({ error: 'missing params' });

      const rows = volumes
        .filter(v => v && Number.isInteger(Number(v.volume_number)))
        .map(v => ({
          source, external_id,
          volume_number: Number(v.volume_number),
          publisher: (v.publisher || '').trim() || null,
          title: (v.title || '').trim() || null,
          price: v.price != null ? Number(v.price) : null,
          release_date: v.release_date || null,
          isbn: (v.isbn || '').trim() || null,
          updated_at: new Date().toISOString()
        }));

      const volNums = rows.map(r => r.volume_number);
      await admin.from('manga_editions')
        .delete().eq('source', source).eq('external_id', external_id).in('volume_number', volNums);
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

function computeStats(items) {
  const seriesCount = items.length;
  const totalOwned = items.reduce((s, i) => s + (Number(i.volumes_owned) || 0), 0);
  const totalRead = items.reduce((s, i) => s + (Number(i.volumes_read) || 0), 0);
  const collectionValue = items.reduce((s, i) => s + (Number(i.owned_value) || 0), 0);

  const statusBreakdown = {};
  for (const i of items) {
    const st = i.status || 'sconosciuto';
    statusBreakdown[st] = (statusBreakdown[st] || 0) + 1;
  }
  const publisherBreakdown = {};
  for (const i of items) {
    if (i.publisher) publisherBreakdown[i.publisher] = (publisherBreakdown[i.publisher] || 0) + 1;
  }
  const topPublisher = Object.entries(publisherBreakdown).sort((a, b) => b[1] - a[1])[0] || null;

  return {
    seriesCount, totalOwned, totalRead,
    collectionValue: Math.round(collectionValue * 100) / 100,
    statusBreakdown, publisherBreakdown,
    topPublisher: topPublisher ? { name: topPublisher[0], count: topPublisher[1] } : null
  };
}
