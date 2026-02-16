/* =========================================================
   CARTA VINI — Google Sheet (via Apps Script API)
   - Lista + filtri + dettaglio
   ========================================================= */

const API_URL = "https://script.google.com/macros/s/AKfycbxEUdhjKyaY-ZWsH787uhxcaBJymNWrUbcPYFjFjJazbBsQF9PH5CSF-b3MHbwRu02/exec";


// STATE
let ALL = [];
let FILTERED = [];
let BY_ID = new Map();

// DOM
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

// UTILS
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
function setHint(msg) { if (el.hint) el.hint.textContent = msg || ""; }
function setCount(n) { if (el.countPill) el.countPill.textContent = String(n ?? 0); }

function getFilters() {
  return {
    q: norm(el.q?.value).toLowerCase(),
    tipologia: norm(el.tipologia?.value),
    luogo: norm(el.luogo?.value),
    uvaggio: norm(el.uvaggio?.value),
    annata: norm(el.annata?.value),
    prezzoMax: toNumber(el.prezzoMax?.value),
  };
}

function fillSelect(selectEl, options, allLabel) {
  if (!selectEl) return;
  const current = selectEl.value;
  selectEl.innerHTML =
    `<option value="">${esc(allLabel)}</option>` +
    options.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join("");
  if (current && options.includes(current)) selectEl.value = current;
}

// LOAD
async function loadWines() {
  setHint("Caricamento…");

  const res = await fetch(API_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json();
  const data = Array.isArray(json) ? json : (json.data || []);

  const wines = data.map((w) => ({
    id: norm(w.id),
    titolo: norm(w.titolo),
    cantina: norm(w.cantina),
    tipologia: norm(w.tipologia),
    luogo: norm(w.luogo),
    annata: w.annata ?? null,
    uvaggio: norm(w.uvaggio),
    prezzo: toNumber(w.prezzo),
    descrizione: norm(w.descrizione),
    immagine: norm(w.immagine || w.immagine_url),
  }));

  ALL = wines.filter((w) => w.id && w.titolo);
  BY_ID = new Map(ALL.map((w) => [w.id, w]));

  hydrateFilters();
  applyFilters();
  handleRoute();

  setHint(`Archivio: ${ALL.length} etichette`);
}

function hydrateFilters() {
  fillSelect(el.tipologia, uniqSorted(ALL.map((w) => w.tipologia)), "Tutte");
  fillSelect(el.luogo, uniqSorted(ALL.map((w) => w.luogo)), "Tutti");
  fillSelect(el.uvaggio, uniqSorted(ALL.map((w) => w.uvaggio)), "Tutti");

  const annate = uniqSorted(ALL.map((w) => (w.annata ? String(w.annata) : null)))
    .sort((a, b) => Number(b) - Number(a));
  fillSelect(el.annata, annate, "Tutte");
}

// FILTER
function applyFilters() {
  const f = getFilters();

  FILTERED = ALL.filter((w) => {
    if (f.tipologia && w.tipologia !== f.tipologia) return false;
    if (f.luogo && w.luogo !== f.luogo) return false;
    if (f.uvaggio && w.uvaggio !== f.uvaggio) return false;
    if (f.annata && String(w.annata ?? "") !== f.annata) return false;

    if (f.prezzoMax !== null && w.prezzo !== null && w.prezzo > f.prezzoMax) return false;

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

// RENDER LIST
function renderGrid(items) {
  if (!el.grid) return;

  if (!items.length) {
    el.grid.innerHTML = `
      <div class="empty">
        <div class="empty__title">Nessun risultato</div>
        <div class="empty__text">Prova a cambiare filtri o rimuovere il prezzo massimo.</div>
      </div>`;
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
    ? `<img class="card__img" src="${esc(w.immagine)}" alt="${esc(w.titolo)}" loading="lazy">`
    : `<div class="card__img card__img--ph" aria-hidden="true"><div class="ph__mark">🍷</div></div>`;

  return `
    <article class="card" role="button" tabindex="0" data-wine-id="${esc(w.id)}" aria-label="Apri ${esc(w.titolo)}">
      ${imgHtml}
      <div class="card__body">
        <div class="card__top">
          <h3 class="card__title">${esc(w.titolo)}</h3>
          ${price ? `<div class="card__price">${esc(price)}</div>` : ""}
        </div>
        <div class="card__meta">${esc(meta)}</div>
        ${w.uvaggio ? `<div class="card__uvaggio">${esc(w.uvaggio)}</div>` : ""}
      </div>
    </article>`;
}

// ROUTE
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

function badge(text) {
  const t = norm(text);
  if (!t) return "";
  return `<span class="badge">${esc(t)}</span>`;
}

function wineDetailHtml(w) {
  const price = w.prezzo !== null ? `€ ${fmtPrice(w.prezzo)}` : "—";
  const hasImg = !!w.immagine;

  return `
    <div class="detail-card__inner">
      <div class="detail-media">
        ${
          hasImg
            ? `<img class="detail-media__img" src="${esc(w.immagine)}" alt="${esc(w.titolo)}" loading="lazy">`
            : `<div class="detail-media__img detail-media__img--ph"><div class="ph__mark">🍷</div></div>`
        }
      </div>

      <div class="detail-info">
        <div class="detail-head">
          <h2 class="detail-title">${esc(w.titolo)}</h2>
          <div class="detail-price">${esc(price)}</div>
        </div>

        <div class="detail-badges">
          ${badge(w.cantina)}
          ${badge(w.tipologia)}
          ${badge(w.luogo)}
          ${w.annata ? badge(String(w.annata)) : ""}
          ${w.uvaggio ? badge(w.uvaggio) : ""}
        </div>

        ${w.descrizione ? `<p class="detail-desc">${esc(w.descrizione)}</p>` : ""}
      </div>
    </div>`;
}

// EVENTS
function bindEvents() {
  const bind = (node, evt) => node && node.addEventListener(evt, applyFilters);

  bind(el.q, "input");
  bind(el.tipologia, "change");
  bind(el.luogo, "change");
  bind(el.uvaggio, "change");
  bind(el.annata, "change");
  bind(el.prezzoMax, "input");

  el.resetBtn?.addEventListener("click", () => {
    el.q.value = "";
    el.tipologia.value = "";
    el.luogo.value = "";
    el.uvaggio.value = "";
    el.annata.value = "";
    el.prezzoMax.value = "";
    applyFilters();
  });

  el.backBtn?.addEventListener("click", () => {
    location.hash = "";
    showList();
  });

  window.addEventListener("hashchange", handleRoute);
}

// START
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
        </div>`;
    }
  }
})();
