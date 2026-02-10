/* =========================
   CONFIG (SUPABASE) — LASCIO LA TUA CONNESSIONE
========================= */
const SUPABASE_URL = "https://bxdermzgfunwpvgektnz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4ZGVybXpnZnVud3B2Z2VrdG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MDk1NzksImV4cCI6MjA4NjI4NTU3OX0.yIr_RtG2WDDl09l5MY2MWFd2PnnoE0L3c0uVxBBzQCE";

/* =========================
   STATE
========================= */
let ALL = [];       // tutti i vini
let FILTERED = [];  // risultato filtri
let BY_ID = new Map();

/* =========================
   DOM
========================= */
const $ = (s) => document.querySelector(s);

const el = {
  q: $("#q"),
  tipologia: $("#tipologia"),
  luogo: $("#luogo"),
  uvaggio: $("#uvaggio"),
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

/* =========================
   UTILS
========================= */
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeText(v) {
  return String(v ?? "").trim();
}

function toNumber(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function sortAlpha(a, b) {
  return String(a).localeCompare(String(b), "it", { sensitivity: "base" });
}

function uniqSorted(arr) {
  return Array.from(new Set(arr.filter(Boolean))).sort(sortAlpha);
}

function fmtPrice(n) {
  const num = toNumber(n);
  if (num === null) return "";
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 }).format(num);
}

function getFilters() {
  return {
    q: normalizeText(el.q?.value).toLowerCase(),
    tipologia: normalizeText(el.tipologia?.value),
    luogo: normalizeText(el.luogo?.value),
    uvaggio: normalizeText(el.uvaggio?.value),
    annata: normalizeText(el.annata?.value),
    prezzoMax: toNumber(el.prezzoMax?.value),
  };
}

function setHint(msg) {
  if (el.hint) el.hint.textContent = msg || "";
}

function setCount(n) {
  if (el.countPill) el.countPill.textContent = String(n ?? 0);
}

/* =========================
   FETCH + INIT (SUPABASE)
========================= */
async function loadWines() {
  setHint("Sincronizzazione cantina…");

  const endpoint = `${SUPABASE_URL}/rest/v1/vini?select=*&order=titolo.asc`;

  const res = await fetch(endpoint, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  const rows = Array.isArray(data) ? data : [];

  // Normalizzazione campi: manteniamo i nomi usati dal render "bello"
  const wines = rows.map((w) => ({
    id: normalizeText(w.id),
    titolo: normalizeText(w.titolo),
    cantina: normalizeText(w.cantina),
    tipologia: normalizeText(w.tipologia),
    luogo: normalizeText(w.luogo),
    annata: w.annata ?? null,
    uvaggio: normalizeText(w.uvaggio),
    prezzo: toNumber(w.prezzo),
    descrizione: normalizeText(w.descrizione),
    immagine: normalizeText(w.immagine_url), // <-- QUI: supabase field
  }));

  // Pulizia minima: id + titolo
  const cleaned = wines.filter((w) => w.id && w.titolo);

  ALL = cleaned;
  BY_ID = new Map(cleaned.map((w) => [w.id, w]));

  hydrateFilterOptions();
  applyFilters();
  handleRoute();

  setHint(`Archivio: ${ALL.length} etichette`);
}

/* =========================
   FILTER OPTIONS
========================= */
function hydrateFilterOptions() {
  const tipologie = uniqSorted(ALL.map((w) => w.tipologia));
  const luoghi = uniqSorted(ALL.map((w) => w.luogo));
  const uvaggi = uniqSorted(ALL.map((w) => w.uvaggio));

  const annate = uniqSorted(
    ALL.map((w) => (w.annata ? String(w.annata) : null))
  ).sort((a, b) => Number(b) - Number(a));

  fillSelect(el.tipologia, tipologie, "Tutte");
  fillSelect(el.luogo, luoghi, "Tutti");
  fillSelect(el.uvaggio, uvaggi, "Tutti");
  fillSelect(el.annata, annate, "Tutte");
}

function fillSelect(selectEl, options, allLabel) {
  if (!selectEl) return;
  const current = selectEl.value;

  selectEl.innerHTML =
    `<option value="">${escapeHtml(allLabel)}</option>` +
    options
      .map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`)
      .join("");

  if (current && options.includes(current)) selectEl.value = current;
}

/* =========================
   FILTERING
========================= */
function applyFilters() {
  const f = getFilters();

  FILTERED = ALL.filter((w) => {
    if (f.tipologia && w.tipologia !== f.tipologia) return false;
    if (f.luogo && w.luogo !== f.luogo) return false;
    if (f.uvaggio && w.uvaggio !== f.uvaggio) return false;
    if (f.annata && String(w.annata ?? "") !== f.annata) return false;

    // prezzo max: se il vino non ha prezzo e tu filtri, lo lasciamo IN
    if (f.prezzoMax !== null && w.prezzo !== null) {
      if (w.prezzo > f.prezzoMax) return false;
    }

    if (f.q) {
      const hay = (
        w.titolo + " " +
        w.cantina + " " +
        w.tipologia + " " +
        w.luogo + " " +
        (w.annata ?? "") + " " +
        w.uvaggio + " " +
        w.descrizione
      ).toLowerCase();
      if (!hay.includes(f.q)) return false;
    }

    return true;
  });

  // Ordinamento carta vini
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

/* =========================
   RENDER LIST
========================= */
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
  const meta = [w.cantina, w.tipologia, w.luogo, w.annata ? String(w.annata) : ""]
    .filter(Boolean)
    .join(" • ");

  const hasImg = !!w.immagine;
  const imgHtml = hasImg
    ? `<img class="card__img" src="${escapeHtml(w.immagine)}" alt="${escapeHtml(w.titolo)}" loading="lazy" referrerpolicy="no-referrer">`
    : `<div class="card__img card__img--ph" aria-hidden="true">
         <div class="ph__mark">🍷</div>
       </div>`;

  return `
    <article class="card" role="button" tabindex="0" data-wine-id="${escapeHtml(w.id)}" aria-label="Apri ${escapeHtml(w.titolo)}">
      ${imgHtml}
      <div class="card__body">
        <div class="card__top">
          <h3 class="card__title">${escapeHtml(w.titolo)}</h3>
          ${price ? `<div class="card__price">${escapeHtml(price)}</div>` : ""}
        </div>
        <div class="card__meta">${escapeHtml(meta)}</div>
        ${w.uvaggio ? `<div class="card__uvaggio">${escapeHtml(w.uvaggio)}</div>` : ""}
      </div>
    </article>
  `;
}

/* =========================
   ROUTING: #wine=<id>
========================= */
function handleRoute() {
  const hash = location.hash || "";
  const m = hash.match(/#wine=([^&]+)/);
  const id = m ? decodeURIComponent(m[1]) : null;

  if (id && BY_ID.has(id)) showDetail(id);
  else showList();
}

function showList() {
  if (el.detailView) el.detailView.style.display = "none";
  if (el.listView) el.listView.style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showDetail(id) {
  const w = BY_ID.get(id);
  if (!w) return showList();

  if (el.listView) el.listView.style.display = "none";
  if (el.detailView) el.detailView.style.display = "block";

  if (el.detailCard) el.detailCard.innerHTML = wineDetailHtml(w);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function wineDetailHtml(w) {
  const price = w.prezzo !== null ? `€ ${fmtPrice(w.prezzo)}` : "—";
  const hasImg = !!w.immagine;

  return `
    <div class="detail-card__inner">
      <div class="detail-media">
        ${
          hasImg
            ? `<img class="detail-media__img" src="${escapeHtml(w.immagine)}" alt="${escapeHtml(w.titolo)}" loading="lazy" referrerpolicy="no-referrer">`
            : `<div class="detail-media__img detail-media__img--ph">
                 <div class="ph__mark">🍷</div>
               </div>`
        }
      </div>

      <div class="detail-info">
        <div class="detail-head">
          <h2 class="detail-title">${escapeHtml(w.titolo)}</h2>
          <div class="detail-price">${escapeHtml(price)}</div>
        </div>

        <div class="detail-badges">
          ${badge(w.cantina)}
          ${badge(w.tipologia)}
          ${badge(w.luogo)}
          ${w.annata ? badge(String(w.annata)) : ""}
          ${w.uvaggio ? badge(w.uvaggio) : ""}
        </div>

        ${w.descrizione ? `<p class="detail-desc">${escapeHtml(w.descrizione)}</p>` : ""}
      </div>
    </div>
  `;
}

function badge(text) {
  const t = normalizeText(text);
  if (!t) return "";
  return `<span class="badge">${escapeHtml(t)}</span>`;
}

/* =========================
   EVENTS
========================= */
function bindEvents() {
  const bind = (node, evt) => node && node.addEventListener(evt, applyFilters);

  if (el.q) bind(el.q, "input");
  if (el.tipologia) bind(el.tipologia, "change");
  if (el.luogo) bind(el.luogo, "change");
  if (el.uvaggio) bind(el.uvaggio, "change");
  if (el.annata) bind(el.annata, "change");
  if (el.prezzoMax) bind(el.prezzoMax, "input");

  if (el.resetBtn) {
    el.resetBtn.addEventListener("click", () => {
      if (el.q) el.q.value = "";
      if (el.tipologia) el.tipologia.value = "";
      if (el.luogo) el.luogo.value = "";
      if (el.uvaggio) el.uvaggio.value = "";
      if (el.annata) el.annata.value = "";
      if (el.prezzoMax) el.prezzoMax.value = "";
      applyFilters();
    });
  }

  if (el.backBtn) {
    el.backBtn.addEventListener("click", () => {
      location.hash = "";
      showList();
    });
  }

  window.addEventListener("hashchange", handleRoute);
}

/* =========================
   START
========================= */
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
          <div class="empty__text">
            Controlla la policy di Supabase (RLS) e la reachability della rete.
            <br><br>
            Dettaglio: <code>${escapeHtml(err?.message || "Errore sconosciuto")}</code>
          </div>
        </div>
      `;
    }
  }
})();
