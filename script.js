/* =========================================================
CARTA VINI — Le Cantine del Duca
Configurato per la nuova intestazione Google Sheet
========================================================= */

const API_URL = "https://script.google.com/macros/s/AKfycbxO3dF6EinCF5ilRQk01DQaPXgNk8yV_6uy2LENdVbEtmbUQxpj0SxHZ_S61LxOV2Ff/exec";

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
  if (typeof v === "number") return v;
  let s = String(v).replace(/[^0-9.,]/g, "").replace(",", ".");
  let n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// FETCH DATA
async function loadWines() {
  el.grid.innerHTML = '<div class="loading">Caricamento carta vini...</div>';
  
  try {
    const resp = await fetch(API_URL, { cache: "no-store" });
    const raw = await resp.json();

    // MAPPATURA NUOVE COLONNE
    ALL = raw.map((item, index) => {
      return {
        // Usiamo 'idcantina' come titolo e ID unico
        id: norm(item.idcantina) || `v-${index}`,
        titolo: norm(item.idcantina), 
        tipologia: norm(item.tipologia),
        luogo: norm(item.luogo),
        annata: norm(item.annata),
        uvaggio: norm(item.uvaggio),
        prezzo: toNumber(item.prezzo),
        // Uniamo le varie descrizioni per il dettaglio
        descrizione: norm(item.descrizione) || norm(item["Note Degustative"]),
        immagine: norm(item.immagine),
        abbinamenti: norm(item.Abbinamenti)
      };
    });

    // Crea Mappa per dettaglio rapido
    BY_ID.clear();
    ALL.forEach(w => BY_ID.set(w.id, w));

    populateFilters(ALL);
    applyFilters();
    handleRoute();

  } catch (err) {
    el.grid.innerHTML = `<div class="error">Errore nel caricamento: <code>${err.message}</code></div>`;
  }
}

// POPOLA FILTRI DINAMICI
function populateFilters(data) {
  const getUnique = (key) => [...new Set(data.map(i => i[key]).filter(v => v !== ""))].sort((a,b) => a.localeCompare(b, 'it'));

  const fill = (select, vals) => {
    if(!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">Tutti</option>' + 
      vals.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join("");
    select.value = current;
  };

  fill(el.tipologia, getUnique("tipologia"));
  fill(el.luogo, getUnique("luogo"));
  fill(el.uvaggio, getUnique("uvaggio"));
  fill(el.annata, getUnique("annata").sort((a,b) => b - a)); // Annate decrescenti
}

// FILTRA E RENDERING
function applyFilters() {
  const q = norm(el.q.value).toLowerCase();
  const tip = el.tipologia.value;
  const luo = el.luogo.value;
  const uva = el.uvaggio.value;
  const ann = el.annata.value;
  const pMax = toNumber(el.prezzoMax.value);

  FILTERED = ALL.filter(w => {
    if (tip && w.tipologia !== tip) return false;
    if (luo && w.luogo !== luo) return false;
    if (uva && w.uvaggio !== uva) return false;
    if (ann && w.annata !== ann) return false;
    if (pMax !== null && w.prezzo !== null && w.prezzo > pMax) return false;
    
    if (q) {
      const haystack = `${w.titolo} ${w.tipologia} ${w.luogo} ${w.uvaggio} ${w.descrizione}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  renderGrid();
}

function renderGrid() {
  el.countPill.textContent = `${FILTERED.length} vini`;
  
  if (FILTERED.length === 0) {
    el.grid.innerHTML = '<div class="empty">Nessun vino trovato con questi filtri.</div>';
    return;
  }

  el.grid.innerHTML = FILTERED.map(w => `
    <article class="card" onclick="location.hash='wine=${encodeURIComponent(w.id)}'">
      <div class="card__img">
        ${w.immagine ? `<img src="${w.immagine}" alt="${esc(w.titolo)}" loading="lazy">` : `<span class="emoji">🍷</span>`}
      </div>
      <div class="card__body">
        <div class="card__cat">${esc(w.tipologia)}</div>
        <h3 class="card__title">${esc(w.titolo)}</h3>
        <div class="card__meta">${esc(w.luogo)}${w.annata ? ' · ' + esc(w.annata) : ''}</div>
        <div class="card__foot">
          <span class="card__price">${w.prezzo ? w.prezzo.toFixed(2).replace('.',',') + ' €' : '—'}</span>
          <span class="card__more">Dettaglio →</span>
        </div>
      </div>
    </article>
  `).join("");
}

// ROUTING & DETTAGLIO
function handleRoute() {
  const hash = location.hash.replace("#", "");
  if (hash.startsWith("wine=")) {
    const id = decodeURIComponent(hash.split("=")[1]);
    showDetail(id);
  } else {
    showList();
  }
}

function showList() {
  el.listView.style.display = "block";
  el.detailView.style.display = "none";
  document.title = "Le Cantine del Duca — Carta Vini";
}

function showDetail(id) {
  const w = BY_ID.get(id);
  if (!w) { location.hash = ""; return; }

  el.listView.style.display = "none";
  el.detailView.style.display = "block";
  document.title = `${w.titolo} — Dettaglio`;

  const badges = [w.tipologia, w.luogo, w.annata, w.uvaggio]
    .filter(v => v !== "")
    .map(v => `<span class="badge">${esc(v)}</span>`)
    .join("");

  el.detailCard.innerHTML = `
    <div class="detail-grid">
      <div class="detail-media">
        ${w.immagine ? `<img src="${w.immagine}" alt="${esc(w.titolo)}">` : `<div class="detail-placeholder">🍷</div>`}
      </div>
      <div class="detail-info">
        <div class="detail-head">
          <h1 class="detail-title">${esc(w.titolo)}</h1>
          <div class="detail-price">${w.prezzo ? w.prezzo.toFixed(2).replace('.',',') + ' €' : ''}</div>
        </div>
        <div class="detail-badges">${badges}</div>
        ${w.descrizione ? `<p class="detail-desc">${esc(w.descrizione)}</p>` : ""}
        ${w.abbinamenti ? `<div class="detail-extra"><strong>Abbinamenti:</strong><br>${esc(w.abbinamenti)}</div>` : ""}
      </div>
    </div>
  `;
  window.scrollTo(0,0);
}

// EVENTS
function bindEvents() {
  el.q.addEventListener("input", applyFilters);
  el.tipologia.addEventListener("change", applyFilters);
  el.luogo.addEventListener("change", applyFilters);
  el.uvaggio.addEventListener("change", applyFilters);
  el.annata.addEventListener("change", applyFilters);
  el.prezzoMax.addEventListener("input", applyFilters);

  el.resetBtn.addEventListener("click", () => {
    el.q.value = "";
    el.tipologia.value = "";
    el.luogo.value = "";
    el.uvaggio.value = "";
    el.annata.value = "";
    el.prezzoMax.value = "";
    applyFilters();
  });

  el.backBtn.addEventListener("click", () => {
    location.hash = "";
  });

  window.addEventListener("hashchange", handleRoute);
}

// START
bindEvents();
loadWines();
