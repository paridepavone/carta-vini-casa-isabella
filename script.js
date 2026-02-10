/* =========================
   CONFIG SUPABASE
========================= */
const SUPABASE_URL = "https://bxdermzgfunwpvgektnz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4ZGVybXpnZnVud3B2Z2VrdG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MDk1NzksImV4cCI6MjA4NjI4NTU3OX0.yIr_RtG2WDDl09l5MY2MWFd2PnnoE0L3c0uVxBBzQCE";

/* =========================
   STATE
========================= */
let ALL = [];       
let FILTERED = [];  
let BY_ID = new Map();

/* =========================
   DOM ELEMENTS
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
   UTILITIES
========================= */
function normalizeText(v) { return String(v ?? "").trim(); }

function toNumber(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function escapeHtml(str) {
  return String(str ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function fmtPrice(n) {
  const num = toNumber(n);
  return num !== null ? new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(num) : "";
}

/* =========================
   CORE FUNCTIONS (FETCH)
========================= */
async function loadWines() {
  if (el.hint) el.hint.textContent = "Sincronizzazione cantina...";

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/vini?select=*&order=titolo.asc`, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!res.ok) throw new Error(`Errore API: ${res.status}`);

    const data = await res.json();
    console.log("Dati ricevuti da Supabase:", data); // Debug in console

    // Mappatura con i nomi esatti delle tue colonne Supabase
    ALL = data.map(w => ({
      id: String(w.id),
      titolo: normalizeText(w.titolo),
      cantina: normalizeText(w.cantina),
      tipologia: normalizeText(w.tipologia),
      luogo: normalizeText(w.luogo),
      annata: w.annata,
      prezzo: toNumber(w.prezzo),
      descrizione: normalizeText(w.descrizione),
      immagine: normalizeText(w.immagine_url)
    })).filter(w => w.titolo !== "");

    BY_ID = new Map(ALL.map(w => [w.id, w]));

    hydrateFilters();
    applyFilters();
    handleRoute();

    if (el.hint) el.hint.textContent = `In carta: ${ALL.length} etichette`;
  } catch (err) {
    console.error("Errore Caricamento:", err);
    if (el.hint) el.hint.textContent = "Errore nel caricamento dei vini.";
  }
}

/* =========================
   UI & FILTERING
========================= */
function hydrateFilters() {
  const getUniq = (key) => [...new Set(ALL.map(w => w[key]).filter(Boolean))].sort();
  
  fillSelect(el.tipologia, getUniq("tipologia"), "Tutte le tipologie");
  fillSelect(el.luogo, getUniq("luogo"), "Tutte le regioni");
}

function fillSelect(select, options, firstLabel) {
  if (!select) return;
  select.innerHTML = `<option value="">${firstLabel}</option>` + 
    options.map(o => `<option value="${o}">${o}</option>`).join("");
}

function applyFilters() {
  const query = el.q ? el.q.value.toLowerCase() : "";
  const tip = el.tipologia ? el.tipologia.value : "";
  const reg = el.luogo ? el.luogo.value : "";

  FILTERED = ALL.filter(w => {
    if (tip && w.tipologia !== tip) return false;
    if (reg && w.luogo !== reg) return false;
    if (query && !w.titolo.toLowerCase().includes(query) && !w.cantina.toLowerCase().includes(query)) return false;
    return true;
  });

  if (el.countPill) el.countPill.textContent = FILTERED.length;
  renderGrid();
}

function renderGrid() {
  if (!el.grid) return;
  el.grid.innerHTML = FILTERED.map(w => `
    <div class="card" onclick="location.hash='#wine=${w.id}'">
      <div class="card__img-container">
        ${w.immagine ? `<img src="${w.immagine}" class="card__img" loading="lazy">` : `<div class="card__placeholder">🍷</div>`}
      </div>
      <div class="card__content">
        <h3 class="card__title">${escapeHtml(w.titolo)}</h3>
        <p class="card__subtitle">${escapeHtml(w.cantina)}</p>
        <div class="card__footer">
          <span class="card__type">${escapeHtml(w.tipologia)}</span>
          <span class="card__price">${fmtPrice(w.prezzo)}</span>
        </div>
      </div>
    </div>
  `).join("");
}

/* =========================
   ROUTING & DETAIL
========================= */
function handleRoute() {
  const hash = location.hash;
  if (hash.startsWith("#wine=")) {
    const id = hash.split("=")[1];
    showDetail(id);
  } else {
    showList();
  }
}

function showList() {
  if (el.listView) el.listView.style.display = "block";
  if (el.detailView) el.detailView.style.display = "none";
}

function showDetail(id) {
  const w = BY_ID.get(id);
  if (!w) return showList();

  if (el.listView) el.listView.style.display = "none";
  if (el.detailView) el.detailView.style.display = "block";

  if (el.detailCard) {
    el.detailCard.innerHTML = `
      <div class="detail">
        <img src="${w.immagine || ''}" class="detail__img">
        <h2 class="detail__title">${escapeHtml(w.titolo)}</h2>
        <p class="detail__cantina">${escapeHtml(w.cantina)}</p>
        <div class="detail__meta">
          <span>${escapeHtml(w.tipologia)}</span> | <span>${escapeHtml(w.luogo)}</span>
        </div>
        <p class="detail__desc">${escapeHtml(w.descrizione)}</p>
        <div class="detail__price">${fmtPrice(w.prezzo)}</div>
      </div>
    `;
  }
}

/* =========================
   INITIALIZATION
========================= */
function init() {
  if (el.q) el.q.oninput = applyFilters;
  if (el.tipologia) el.tipologia.onchange = applyFilters;
  if (el.luogo) el.luogo.onchange = applyFilters;
  if (el.backBtn) el.backBtn.onclick = () => location.hash = "";
  if (el.resetBtn) el.resetBtn.onclick = () => { if(el.q) el.q.value=""; applyFilters(); };
  
  window.onhashchange = handleRoute;
  loadWines();
}

init();
