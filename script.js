const SUPABASE_URL = "https://bxdermzgfunwpvgektnz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4ZGVybXpnZnVud3B2Z2VrdG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MDk1NzksImV4cCI6MjA4NjI4NTU3OX0.yIr_RtG2WDDl09l5MY2MWFd2PnnoE0L3c0uVxBBzQCE";

let ALL_WINES = [];
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

async function loadData() {
  el.hint.textContent = "Aggiornamento cantina...";
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/vini?select=*&order=titolo.asc`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
    });
    const data = await response.json();
    
    ALL_WINES = data.map(w => ({
      id: String(w.id),
      titolo: w.titolo || "",
      cantina: w.cantina || "",
      tipologia: w.tipologia || "",
      luogo: w.luogo || "",
      prezzo: w.prezzo || 0,
      descrizione: w.descrizione || "",
      immagine: w.immagine_url || ""
    }));

    BY_ID = new Map(ALL_WINES.map(w => [w.id, w]));
    
    fillFilters();
    render();
    el.hint.textContent = "Cantina pronta";
  } catch (err) {
    el.hint.textContent = "Errore connessione";
    console.error(err);
  }
}

function fillFilters() {
  const getUniq = (key) => [...new Set(ALL_WINES.map(w => w[key]).filter(Boolean))].sort();
  
  const tpl = (opts, label) => `<option value="">${label}</option>` + opts.map(o => `<option value="${o}">${o}</option>`).join("");
  
  el.tipologia.innerHTML = tpl(getUniq("tipologia"), "Tutte le tipologie");
  el.luogo.innerHTML = tpl(getUniq("luogo"), "Tutte le regioni");
}

function render() {
  const q = el.q.value.toLowerCase();
  const t = el.tipologia.value;
  const l = el.luogo.value;

  const filtered = ALL_WINES.filter(w => {
    return (!t || w.tipologia === t) && 
           (!l || w.luogo === l) && 
           (!q || w.titolo.toLowerCase().includes(q) || w.cantina.toLowerCase().includes(q));
  });

  el.countPill.textContent = filtered.length;

  el.grid.innerHTML = filtered.map(w => `
    <article class="card" onclick="location.hash='#wine=${w.id}'">
      <div class="card__img-container">
        <img src="${w.immagine}" class="card__img" loading="lazy" onerror="this.src='https://via.placeholder.com/200x300?text=Vino'">
      </div>
      <div class="card__body">
        <div class="card__top" style="display:flex; justify-content:space-between; align-items:flex-start;">
          <h3 class="card__title">${w.titolo}</h3>
          <span class="card__price">€${w.prezzo}</span>
        </div>
        <div class="card__meta">${w.cantina} • ${w.tipologia}</div>
      </div>
    </article>
  `).join("");
}

function handleRoute() {
  const id = location.hash.split("=")[1];
  if (id && BY_ID.has(id)) {
    const w = BY_ID.get(id);
    el.listView.style.display = "none";
    el.detailView.style.display = "block";
    el.detailCard.innerHTML = `
      <img src="${w.immagine}" class="detail__img" style="width:100%; max-height:350px; object-fit:contain; margin-bottom:20px;">
      <h2 class="detail__title" style="font-family: 'Playfair Display', serif; font-size:28px;">${w.titolo}</h2>
      <p class="detail__cantina" style="color:#b79a57; font-style:italic; font-size:18px; margin-bottom:15px;">${w.cantina}</p>
      <div class="detail__meta" style="margin-bottom:20px; font-size:14px; color:#666;">${w.tipologia} | ${w.luogo}</div>
      <p class="detail__desc" style="line-height:1.6; color:#444;">${w.descrizione}</p>
      <div class="detail__price" style="font-size:26px; font-weight:800; color:#4a0f1d; text-align:right; margin-top:20px; border-top:1px solid #eee; padding-top:15px;">€${w.prezzo}</div>
    `;
    window.scrollTo(0,0);
  } else {
    el.listView.style.display = "block";
    el.detailView.style.display = "none";
  }
}

el.q.oninput = render;
el.tipologia.onchange = render;
el.luogo.onchange = render;
el.backBtn.onclick = () => location.hash = "";
window.onhashchange = handleRoute;

loadData();
