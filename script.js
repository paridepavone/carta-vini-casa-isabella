const SUPABASE_URL = "https://bxdermzgfunwpvgektnz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4ZGVybXpnZnVud3B2Z2VrdG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MDk1NzksImV4cCI6MjA4NjI4NTU3OX0.yIr_RtG2WDDl09l5MY2MWFd2PnnoE0L3c0uVxBBzQCE";

let ALL = [];
let BY_ID = new Map();

const $ = (s) => document.querySelector(s);
const el = {
  q: $("#q"),
  tipologia: $("#tipologia"),
  luogo: $("#luogo"),
  grid: $("#grid"),
  countPill: $("#countPill"),
  listView: $("#listView"),
  detailView: $("#detailView"),
  detailCard: $("#detailCard"),
  backBtn: $("#backBtn"),
  hint: $("#hint")
};

async function loadWines() {
  el.hint.textContent = "Sincronizzazione...";
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/vini?select=*&order=titolo.asc`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
    });
    const data = await res.json();
    
    ALL = data.map(w => ({
      id: String(w.id),
      titolo: w.titolo || "",
      cantina: w.cantina || "",
      tipologia: w.tipologia || "",
      luogo: w.luogo || "",
      prezzo: w.prezzo || 0,
      descrizione: w.descrizione || "",
      immagine: w.immagine_url || ""
    }));

    BY_ID = new Map(ALL.map(w => [w.id, w]));
    hydrateFilters();
    applyFilters();
    el.hint.textContent = "Cantina aggiornata";
  } catch (err) {
    el.hint.textContent = "Errore di connessione";
  }
}

function hydrateFilters() {
  const uniq = (key) => [...new Set(ALL.map(w => w[key]).filter(Boolean))].sort();
  fillSelect(el.tipologia, uniq("tipologia"), "Tutte le tipologie");
  fillSelect(el.luogo, uniq("luogo"), "Tutte le regioni");
}

function fillSelect(s, opts, label) {
  s.innerHTML = `<option value="">${label}</option>` + opts.map(o => `<option value="${o}">${o}</option>`).join("");
}

function applyFilters() {
  const q = el.q.value.toLowerCase();
  const t = el.tipologia.value;
  const l = el.luogo.value;

  const filtered = ALL.filter(w => {
    return (!t || w.tipologia === t) && 
           (!l || w.luogo === l) && 
           (!q || w.titolo.toLowerCase().includes(q) || w.cantina.toLowerCase().includes(q));
  });

  el.countPill.textContent = filtered.length;
  renderGrid(filtered);
}

function renderGrid(list) {
  el.grid.innerHTML = list.map(w => `
    <div class="card" onclick="location.hash='#wine=${w.id}'">
      <div class="card__img-container">
        <img src="${w.immagine}" class="card__img" loading="lazy">
      </div>
      <div class="card__body">
        <div class="card__top">
          <h3 class="card__title">${w.titolo}</h3>
          <div class="card__price">€${w.prezzo}</div>
        </div>
        <div class="card__meta">${w.cantina} • ${w.tipologia}</div>
      </div>
    </div>
  `).join("");
}

window.addEventListener("hashchange", () => {
  const id = location.hash.split("=")[1];
  if (id) {
    const w = BY_ID.get(id);
    el.listView.style.display = "none";
    el.detailView.style.display = "block";
    el.detailCard.innerHTML = `
      <img src="${w.immagine}" style="width:100%; max-height:300px; object-fit:contain;">
      <h2 style="font-family:serif; margin-top:20px;">${w.titolo}</h2>
      <p style="color:#b79a57; font-style:italic;">${w.cantina}</p>
      <p>${w.descrizione}</p>
      <div style="font-size:24px; font-weight:800; color:#4a0f1d; text-align:right;">€${w.prezzo}</div>
    `;
  } else {
    el.listView.style.display = "block";
    el.detailView.style.display = "none";
  }
});

el.q.oninput = applyFilters;
el.tipologia.onchange = applyFilters;
el.luogo.onchange = applyFilters;
el.backBtn.onclick = () => location.hash = "";

loadWines();
