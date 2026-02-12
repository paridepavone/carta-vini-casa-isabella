/* =========================================================
   CARTA VINI — Supabase (public.vini)
   - Lista + filtri + dettaglio
   - Compatibile con tabella: id, titolo, cantina, tipologia, annata, prezzo, descrizione, immagine_url
   ========================================================= */

const SUPABASE_URL = "https://bxdermzgfunwpvgektnz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4ZGVybXpnZnVud3B2Z2VrdG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MDk1NzksImV4cCI6MjA4NjI4NTU3OX0.yIr_RtG2WDDl09l5MY2MWFd2PnnoE0L3c0uVxBBzQCE";
const TABLE = "vini";

if (!window.supabase?.createClient) {
  alert("Manca supabase-js. In index.html aggiungi prima di script.js:\n<script src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'></script>");
  throw new Error("supabase-js missing");
}

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* =========================
   STATE + DOM
========================= */
let ALL = [];
let FILTERED = [];
let BY_ID = new Map();

const $ = (s) => document.querySelector(s);

const el = {
  q: $("#q"),
  tipologia: $("#tipologia"),
  luogo: $("#luogo"),      // in tabella non c’è: lo disattiviamo se vuoto
  uvaggio: $("#uvaggio"),  // in tabella non c’è: lo disattiviamo se vuoto
  annata: $("#annata"),
  prezzoMax: $("#prezzoMax"),
  resetBtn: $("#resetBtn"),

  grid: $("#grid"),
  hint: $("#hint"),
  countPill: $("#countPill"),

  listView: $("#listView"),
  detailView: $("#detailView"),
  detailCard: $("#detailCard"),
  backBtn: $("#backBtn"),
};

function setHint(msg) { if (el.hint) el.hint.textContent = msg || ""; }
function setCount(n) { if (el.countPill) el.countPill.textContent = String(n ?? 0); }

function esc(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function norm(v) { return String(v ?? "").trim(); }

function toNumber(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function fmtPrice(n) {
  const num = toNumber(n);
  if (num === null) return "";
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 }).format(num);
}

function sortAlpha(a, b) {
  return String(a).localeCompare(String(b), "it", { sensitivity: "base" });
}

function uniqSorted(arr) {
  return Array.from(new Set(arr.filter(Boolean))).sort(sortAlpha);
}

function fillSelect(selectEl, options, allLabel) {
  if (!selectEl) return;
  const current = selectEl.value;
  selectEl.innerHTML =
    `<option value="">${esc(allLabel)}</option>` +
    options.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join("");
  if (current && options.includes(current)) selectEl.value = current;
}

function getFilters() {
  return {
    q: norm(el.q?.value).toLowerCase(),
    tipologia: norm(el.tipologia?.value),
    annata: norm(el.annata?.value),
    prezzoMax: toNumber(el.prezzoMax?.value),
    // questi due potrebbero non esistere nel DB: li lasciamo, ma se sono sempre vuoti non filtrano
    luogo: norm(el.luogo?.value),
    uvaggio: norm(el.uvaggio?.value),
  };
}

/* =========================
   LOAD
========================= */
async function loadWines() {
  setHint("Caricamento vini…");

  // usa "*" così non esplodi se cambiano colonne
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("titolo", { ascending: true });

  if (error) throw error;

  const wines = (data || []).map((w) => ({
    id: w.id,
    titolo: norm(w.titolo),
    cantina: norm(w.cantina),
    tipologia: norm(w.tipologia),
    annata: w.annata ?? null,
    prezzo: toNumber(w.prezzo),
    descrizione: norm(w.descrizione),
    immagine_url: norm(w.immagine_url),

    // campi extra se un giorno li aggiungi
    luogo: norm(w.luogo),
    uvaggio: norm(w.uvaggio),
  }));

  ALL = wines.filter((w) => w.id !== null && w.id !== undefined && w.titolo);
  BY_ID = new Map(ALL.map((w) => [String(w.id), w]));

  hydrateFilters();
  applyFilters();
  handleRoute();

  setHint(`Archivio: ${ALL.length} etichette`);
}

function hydrateFilters() {
  fillSelect(el.tipologia, uniqSorted(ALL.map((w) => w.tipologia)), "Tutte");

  const annate = uniqSorted(ALL.map((w) => (w.annata ? String(w.annata) : null)))
    .sort((a, b) => Number(b) - Number(a));
  fillSelect(el.annata, annate, "Tutte");

  // luogo/uvaggio: se nel DB sono tutti vuoti, li disattivo in UI
  const luoghi = uniqSorted(ALL.map((w) => w.luogo));
  const uvaggi = uniqSorted(ALL.map((w) => w.uvaggio));

  if (el.luogo) {
    if (!luoghi.length) {
      el.luogo.disabled = true;
      el.luogo.innerHTML = `<option value="">(non disponibile)</option>`;
      el.luogo.closest(".field")?.classList.add("is-disabled");
    } else {
      el.luogo.disabled = false;
      el.luogo.closest(".field")?.classList.remove("is-disabled");
      fillSelect(el.luogo, luoghi, "Tutti");
    }
  }

  if (el.uvaggio) {
    if (!uvaggi.length) {
      el.uvaggio.disabled = true;
      el.uvaggio.innerHTML = `<option value="">(non disponibile)</option>`;
      el.uvaggio.closest(".field")?.classList.add("is-disabled");
    } else {
      el.uvaggio.disabled = false;
      el.uvaggio.closest(".field")?.classList.remove("is-disabled");
      fillSelect(el.uvaggio, uvaggi, "Tutti");
    }
  }
}

/* =========================
   FILTER + RENDER
========================= */
function applyFilters() {
  const f = getFilters();

  FILTERED = ALL.filter((w) => {
    if (f.tipologia && w.tipologia !== f.tipologia) return false;
    if (f.annata && String(w.annata ?? "") !== f.annata) return false;

    // questi filtri entrano solo se hai valori nel DB
    if (f.luogo && w.luogo !== f.luogo) return false;
    if (f.uvaggio && w.uvaggio !== f.uvaggio) return false;

    if (f.prezzoMax !== null && w.prezzo !== null && w.prezzo > f.prezzoMax) return false;

    if (f.q) {
      const hay = (
        w.titolo + " " +
        w.cantina + " " +
        w.tipologia + " " +
        (w.annata ?? "") + " " +
        w.descrizione
      ).toLowerCase();
      if (!hay.includes(f.q)) return false;
    }

    return true;
  });

  FILTERED.sort((a, b) => {
    const t1 = sortAlpha(a.tipologia, b.tipologia);
    if (t1 !== 0) return t1;
    const t2 = sortAlpha(a.titolo, b.titolo);
    if (t2 !== 0) return t2;
    return Number(b.annata || 0) - Number(a.annata || 0);
  });

  setCount(FILTERED.length);
  renderGrid(FILTERED);
}

function renderGrid(items) {
  if (!el.grid) return;

  if (!items.length) {
    el.grid.innerHTML = `
      <div class="empty">
        <div class="empty__title">Nessun risultato</div>
        <div class="empty__text">Prova a cambiare filtri o rimuovere il prezzo massimo.</div>
      </div>
    `;
    return;
  }

  el.grid.innerHTML = items.map(wineCardHtml).join("");

  el.grid.querySelectorAll("[data-wine-id]").forEach((card) => {
    const open = () => {
      const id = card.getAttribute("data-wine-id");
      location.hash = `#wine=${encodeURIComponent(id)}`;
    };
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
  });
}

function wineCardHtml(w) {
  const price = w.prezzo !== null ? `€ ${fmtPrice(w.prezzo)}` : "";
  const meta = [w.cantina, w.tipologia, w.annata ? String(w.annata) : ""].filter(Boolean).join(" • ");

  const hasImg = !!w.immagine_url;
  const imgHtml = hasImg
    ? `<img class="card__img" src="${esc(w.immagine_url)}" alt="${esc(w.titolo)}" loading="lazy">`
    : `<div class="card__img card__img--ph" aria-hidden="true"><div class="ph__mark">🍷</div></div>`;

  return `
    <article class="card" role="button" tabindex="0" data-wine-id="${esc(String(w.id))}" aria-label="Apri ${esc(w.titolo)}">
      ${imgHtml}
      <div class="card__body">
        <div class="card__top">
          <h3 class="card__title">${esc(w.titolo)}</h3>
          ${price ? `<div class="card__price">${esc(price)}</div>` : ""}
        </div>
        <div class="card__meta">${esc(meta)}</div>
      </div>
    </article>
  `;
}

/* =========================
   ROUTING + DETAIL
========================= */
function handleRoute() {
  const hash = location.hash || "";
  const m = hash.match(/#wine=([^&]+)/);
  const id = m ? decodeURIComponent(m[1]) : null;

  if (id && BY_ID.has(String(id))) showDetail(String(id));
  else showList();
}

function showList() {
  if (el.detailView) el.detailView.style.display = "none";
  if (el.listView) el.listView.style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showDetail(id) {
  const w = BY_ID.get(String(id));
  if (!w) return showList();

  if (el.listView) el.listView.style.display = "none";
  if (el.detailView) el.detailView.style.display = "block";

  if (el.detailCard) el.detailCard.innerHTML = wineDetailHtml(w);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function wineDetailHtml(w) {
  const price = w.prezzo !== null ? `€ ${fmtPrice(w.prezzo)}` : "—";
  const hasImg = !!w.immagine_url;

  return `
    <div class="detail-card__inner">
      <div class="detail-media">
        ${
          hasImg
            ? `<img class="detail-media__img" src="${esc(w.immagine_url)}" alt="${esc(w.titolo)}" loading="lazy">`
            : `<div class="detail-media__img detail-media__img--ph"><div class="ph__mark">🍷</div></div>`
        }
      </div>

      <div class="detail-info">
        <div class="detail-head">
          <h2 class="detail-title">${esc(w.titolo)}</h2>
          <div class="detail-price">${esc(price)}</div>
        </div>

        <div class="detail-badges">
          ${w.cantina ? `<span class="badge">${esc(w.cantina)}</span>` : ""}
          ${w.tipologia ? `<span class="badge">${esc(w.tipologia)}</span>` : ""}
          ${w.annata ? `<span class="badge">${esc(String(w.annata))}</span>` : ""}
        </div>

        ${w.descrizione ? `<p class="detail-desc">${esc(w.descrizione)}</p>` : ""}
      </div>
    </div>
  `;
}

/* =========================
   EVENTS + START
========================= */
function bindEvents() {
  const bind = (node, evt) => node && node.addEventListener(evt, applyFilters);

  bind(el.q, "input");
  bind(el.tipologia, "change");
  bind(el.luogo, "change");
  bind(el.uvaggio, "change");
  bind(el.annata, "change");
  bind(el.prezzoMax, "input");

  el.resetBtn?.addEventListener("click", () => {
    if (el.q) el.q.value = "";
    if (el.tipologia) el.tipologia.value = "";
    if (el.luogo) el.luogo.value = "";
    if (el.uvaggio) el.uvaggio.value = "";
    if (el.annata) el.annata.value = "";
    if (el.prezzoMax) el.prezzoMax.value = "";
    applyFilters();
  });

  el.backBtn?.addEventListener("click", () => {
    location.hash = "";
    showList();
  });

  window.addEventListener("hashchange", handleRoute);
}

(async function start() {
  bindEvents();
  try {
    await loadWines();
  } catch (err) {
    console.error(err);
    setHint("Errore nel caricamento.");
    setCount(0);
    if (el.grid) {
      el.grid.innerHTML = `
        <div class="empty">
          <div class="empty__title">Errore di caricamento</div>
          <div class="empty__text">Dettaglio: <code>${esc(err?.message || "Errore sconosciuto")}</code></div>
        </div>
      `;
    }
  }
})();
