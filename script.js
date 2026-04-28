const API_URL = "https://script.google.com/macros/s/AKfycbxO3dF6EinCF5ilRQk01DQaPXgNk8yV_6uy2LENdVbEtmbUQxpj0SxHZ_S61LxOV2Ff/exec";

let ALL = [];
let FILTERED = [];
let BY_ID = new Map();

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
  countPill: $("#countPill"),
  listView: $("#listView"),
  detailView: $("#detailView"),
  detailCard: $("#detailCard"),
  backBtn: $("#backBtn"),
};

function esc(str) { return String(str ?? "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m])); }
function norm(v) { return String(v ?? "").trim(); }
function toNumber(v) { 
  if (!v) return null;
  let n = parseFloat(String(v).replace(/[^0-9.,]/g, "").replace(",", "."));
  return isNaN(n) ? null : n;
}

async function loadWines() {
  try {
    const resp = await fetch(API_URL);
    if (!resp.ok) throw new Error("Errore di rete");
    const data = await resp.json();

    ALL = data.map((w, i) => ({
      id: norm(w.idcantina) || `v-${i}`,
      titolo: norm(w.idcantina) || "Vino senza nome",
      tipologia: norm(w.tipologia) || "Altro",
      luogo: norm(w.luogo) || "",
      annata: norm(w.annata) || "",
      uvaggio: norm(w.uvaggio) || "",
      prezzo: toNumber(w.prezzo),
      descrizione: norm(w.descrizione) || norm(w["Note Degustative"]) || "",
      immagine: norm(w.immagine)
    }));

    BY_ID.clear();
    ALL.forEach(w => BY_ID.set(w.id, w));
    
    populateFilters(ALL);
    applyFilters();
    handleRoute();
  } catch (err) {
    el.grid.innerHTML = `<div class="error">Impossibile caricare i dati. Verifica la connessione.</div>`;
    console.error(err);
  }
}

function populateFilters(data) {
  const getUnique = (key) => [...new Set(data.map(i => i[key]).filter(v => v !== ""))].sort();
  const fill = (select, vals) => {
    if(!select) return;
    select.innerHTML = '<option value="">Tutti</option>' + vals.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join("");
  };
  fill(el.tipologia, getUnique("tipologia"));
  fill(el.luogo, getUnique("luogo"));
  fill(el.uvaggio, getUnique("uvaggio"));
  fill(el.annata, getUnique("annata").sort((a,b) => b-a));
}

function applyFilters() {
  const q = el.q.value.toLowerCase();
  const tip = el.tipologia.value;
  const luo = el.luogo.value;
  const pMax = toNumber(el.prezzoMax.value);

  FILTERED = ALL.filter(w => {
    if (tip && w.tipologia !== tip) return false;
    if (luo && w.luogo !== luo) return false;
    if (pMax && w.prezzo && w.prezzo > pMax) return false;
    if (q && !`${w.titolo} ${w.luogo}`.toLowerCase().includes(q)) return false;
    return true;
  });
  renderGrid();
}

function renderGrid() {
  el.countPill.textContent = `${FILTERED.length} vini`;
  el.grid.innerHTML = FILTERED.map(w => `
    <article class="card" onclick="location.hash='wine=${encodeURIComponent(w.id)}'">
      <div class="card__img">${w.immagine ? `<img src="${w.immagine}">` : "🍷"}</div>
      <div class="card__body">
        <div class="card__cat">${esc(w.tipologia)}</div>
        <h3 class="card__title">${esc(w.titolo)}</h3>
        <div class="card__foot">
          <span class="card__price">${w.prezzo ? w.prezzo.toFixed(2) + ' €' : '—'}</span>
        </div>
      </div>
    </article>
  `).join("");
}

function handleRoute() {
  const h = location.hash.replace("#", "");
  if (h.startsWith("wine=")) showDetail(decodeURIComponent(h.split("=")[1]));
  else showList();
}

function showList() {
  el.listView.style.display = "block";
  el.detailView.style.display = "none";
}

function showDetail(id) {
  const w = BY_ID.get(id);
  if (!w) { location.hash = ""; return; }
  el.listView.style.display = "none";
  el.detailView.style.display = "block";
  el.detailCard.innerHTML = `
    <h1>${esc(w.titolo)}</h1>
    <p>${esc(w.descrizione)}</p>
    <button onclick="location.hash=''">Indietro</button>
  `;
}

window.addEventListener("hashchange", handleRoute);
el.q.addEventListener("input", applyFilters);
el.tipologia.addEventListener("change", applyFilters);
el.luogo.addEventListener("change", applyFilters);
el.prezzoMax.addEventListener("input", applyFilters);
el.resetBtn.onclick = () => { [el.q, el.tipologia, el.luogo, el.prezzoMax].forEach(i => i.value=""); applyFilters(); };

loadWines();
