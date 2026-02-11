/* =========================
   CONFIG (SUPABASE) — LASCIO LA TUA CONNESSIONE
========================= */
const SUPABASE_URL = "https://bxdermzgfunwpvgektnz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4ZGVybXpnZnVud3B2Z2VrdG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MDk1NzksImV4cCI6MjA4NjI4NTU3OX0.yIr_RtG2WDDl09l5MY2MWFd2PnnoE0L3c0uVxBBzQCE";
/* =========================

// Tabella
const TABLE = "vini";

/* =========================
   STATE
========================= */
let VINI = [];
let FILTERED = [];
let BY_ID = new Map();
let SESSION = null;

/* =========================
   DOM
========================= */
const $ = (s) => document.querySelector(s);

const el = {
  hint: $("#hint"),
  countPill: $("#countPill"),

  q: $("#q"),
  tipologia: $("#tipologia"),
  luogo: $("#luogo"),
  uvaggio: $("#uvaggio"),
  annata: $("#annata"),
  prezzoMax: $("#prezzoMax"),
  resetBtn: $("#resetBtn"),

  grid: $("#grid"),

  listView: $("#listView"),
  detailView: $("#detailView"),
  detailCard: $("#detailCard"),
  backBtn: $("#backBtn"),

  featuredContainer: $("#featuredContainer"),
};

function setHint(msg) {
  if (el.hint) el.hint.textContent = msg || "";
}
function setCount(n) {
  if (el.countPill) el.countPill.textContent = String(n ?? 0);
}

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

/* =========================
   SUPABASE CLIENT
========================= */
const supabase = window.supabase?.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

/* =========================
   LOGIN UI (inject)
========================= */
function injectAuthUI() {
  const container = el.featuredContainer || el.listView;
  if (!container) return;

  const box = document.createElement("section");
  box.className = "panel";
  box.style.padding = "16px";
  box.style.marginBottom = "14px";

  box.innerHTML = `
    <div class="filters__grid" style="grid-template-columns: 1.2fr 1.2fr auto auto; align-items:end;">
      <div class="field">
        <label for="adminEmail">Email admin</label>
        <input id="adminEmail" type="email" placeholder="nome@azienda.it" autocomplete="username">
      </div>
      <div class="field">
        <label for="adminPass">Password</label>
        <input id="adminPass" type="password" placeholder="••••••••" autocomplete="current-password">
      </div>
      <div class="actions" style="grid-column:auto; padding-top:0;">
        <button class="btn btn--soft" id="loginBtn" type="button">Login</button>
        <button class="btn btn--ghost" id="logoutBtn" type="button" style="display:none;">Logout</button>
      </div>
      <div class="actions" style="grid-column:auto; padding-top:0; justify-content:flex-start;">
        <button class="btn btn--soft" id="newWineBtn" type="button">+ Nuovo vino</button>
      </div>
    </div>
    <div style="margin-top:10px; font-size:12px; color:#6b6f76;">
      Stato: <strong id="authState">non autenticato</strong>
    </div>
  `;

  // metti in alto
  container.prepend(box);

  // bind
  $("#loginBtn")?.addEventListener("click", login);
  $("#logoutBtn")?.addEventListener("click", logout);
  $("#newWineBtn")?.addEventListener("click", () => openNewWine());
}

function renderAuthState() {
  const st = $("#authState");
  const loginBtn = $("#loginBtn");
  const logoutBtn = $("#logoutBtn");

  if (!st || !loginBtn || !logoutBtn) return;

  const isLogged = !!SESSION;
  st.textContent = isLogged ? `loggato (${SESSION.user.email})` : "non autenticato";
  loginBtn.style.display = isLogged ? "none" : "inline-flex";
  logoutBtn.style.display = isLogged ? "inline-flex" : "none";
}

/* =========================
   AUTH
========================= */
async function refreshSession() {
  if (!supabase) {
    setHint("Manca supabase-js nel HTML.");
    return;
  }
  const { data } = await supabase.auth.getSession();
  SESSION = data.session || null;
  renderAuthState();
}

async function login() {
  const email = ($("#adminEmail")?.value || "").trim();
  const password = $("#adminPass")?.value || "";

  if (!email || !password) {
    alert("Inserisci email e password.");
    return;
  }

  setHint("Login…");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    setHint("");
    alert("Login fallito: " + error.message);
    return;
  }

  SESSION = data.session;
  renderAuthState();
  setHint("Login OK ✓");
  setTimeout(() => setHint(""), 800);
}

async function logout() {
  setHint("Logout…");
  await supabase.auth.signOut();
  SESSION = null;
  renderAuthState();
  setHint("Logout ✓");
  setTimeout(() => setHint(""), 800);
}

/* =========================
   DB
========================= */
async function fetchWines() {
  setHint("Caricamento vini…");

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("titolo", { ascending: true });

  if (error) {
    console.error(error);
    setHint("Errore: " + error.message);
    VINI = [];
    BY_ID = new Map();
    return;
  }

  VINI = (data || []).map(normalizeWine);
  BY_ID = new Map(VINI.map((w) => [String(w.id), w]));
  setHint("");
}

function normalizeWine(w) {
  return {
    id: w.id,
    titolo: normalizeText(w.titolo),
    cantina: normalizeText(w.cantina),
    tipologia: normalizeText(w.tipologia),
    luogo: normalizeText(w.luogo),
    uvaggio: normalizeText(w.uvaggio),
    annata: w.annata ?? null,
    prezzo: toNumber(w.prezzo),
    descrizione: normalizeText(w.descrizione),
    immagine_url: normalizeText(w.immagine_url),
    in_evidenza: !!w.in_evidenza,
  };
}

async function insertWine(payload) {
  if (!SESSION) return alert("Devi fare login per aggiungere.");
  setHint("Salvataggio…");

  const { error } = await supabase.from(TABLE).insert([payload]);

  if (error) {
    console.error(error);
    setHint("");
    alert("Errore INSERT: " + error.message);
    return;
  }

  setHint("Salvato ✓");
  await reloadAndGoList();
}

async function updateWine(id, patch) {
  if (!SESSION) return alert("Devi fare login per modificare.");
  setHint("Aggiornamento…");

  const { error } = await supabase.from(TABLE).update(patch).eq("id", id);

  if (error) {
    console.error(error);
    setHint("");
    alert("Errore UPDATE: " + error.message);
    return;
  }

  setHint("Aggiornato ✓");
  await reloadAndStayDetail(id);
}

async function deleteWine(id) {
  if (!SESSION) return alert("Devi fare login per eliminare.");
  const ok = confirm("Eliminare questo vino? Azione irreversibile.");
  if (!ok) return;

  setHint("Eliminazione…");
  const { error } = await supabase.from(TABLE).delete().eq("id", id);

  if (error) {
    console.error(error);
    setHint("");
    alert("Errore DELETE: " + error.message);
    return;
  }

  setHint("Eliminato ✓");
  await reloadAndGoList();
}

/* =========================
   FILTERS
========================= */
function hydrateFilterOptions() {
  const tipologie = uniqSorted(VINI.map((w) => w.tipologia));
  const luoghi = uniqSorted(VINI.map((w) => w.luogo));
  const uvaggi = uniqSorted(VINI.map((w) => w.uvaggio));

  const annate = uniqSorted(VINI.map((w) => (w.annata ? String(w.annata) : null)))
    .sort((a, b) => Number(b) - Number(a));

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
    options.map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join("");

  if (current && options.includes(current)) selectEl.value = current;
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

function applyFilters() {
  const f = getFilters();

  FILTERED = VINI.filter((w) => {
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

/* =========================
   RENDER LIST
========================= */
function renderGrid(items) {
  if (!el.grid) return;

  if (!items.length) {
    el.grid.innerHTML = `
      <div class="empty">
        <div class="empty__title">Nessun risultato</div>
        <div class="empty__text">Prova a cambiare filtri.</div>
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

  const hasImg = !!w.immagine_url;
  const imgHtml = hasImg
    ? `<img class="card__img" src="${escapeHtml(w.immagine_url)}" alt="${escapeHtml(w.titolo)}" loading="lazy">`
    : `<div class="card__img card__img--ph" aria-hidden="true">
         <div class="ph__mark">🍷</div>
       </div>`;

  return `
    <article class="card" role="button" tabindex="0" data-wine-id="${escapeHtml(String(w.id))}">
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
   DETAIL (EDIT FORM)
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
  if (el.detailCard) el.detailCard.innerHTML = wineDetailFormHtml(w);

  // bind buttons
  $("#saveBtn")?.addEventListener("click", () => onSave(id));
  $("#deleteBtn")?.addEventListener("click", () => deleteWine(id));

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openNewWine() {
  if (el.listView) el.listView.style.display = "none";
  if (el.detailView) el.detailView.style.display = "block";
  if (el.detailCard) el.detailCard.innerHTML = wineDetailFormHtml(null);

  $("#saveBtn")?.addEventListener("click", () => onCreate());
  $("#deleteBtn")?.remove(); // non serve

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function wineDetailFormHtml(w) {
  const isNew = !w;

  const img = w?.immagine_url ? escapeHtml(w.immagine_url) : "";
  const titolo = escapeHtml(w?.titolo || "");
  const cantina = escapeHtml(w?.cantina || "");
  const tipologia = escapeHtml(w?.tipologia || "");
  const luogo = escapeHtml(w?.luogo || "");
  const uvaggio = escapeHtml(w?.uvaggio || "");
  const annata = w?.annata ?? "";
  const prezzo = w?.prezzo ?? "";
  const descrizione = escapeHtml(w?.descrizione || "");
  const evidenza = w?.in_evidenza ? "checked" : "";

  return `
    <div class="detail-card__inner">
      <div class="detail-media">
        ${
          img
            ? `<img class="detail-media__img" src="${img}" alt="${titolo}" loading="lazy">`
            : `<div class="detail-media__img detail-media__img--ph"><div class="ph__mark">🍷</div></div>`
        }
        <div style="margin-top:10px;">
          <label style="display:block; font-size:12px; color:#6b6f76; margin-bottom:6px;">URL immagine (immagine_url)</label>
          <input id="f_immagine_url" type="text" value="${img}" placeholder="https://...">
        </div>
      </div>

      <div class="detail-info">
        <div class="detail-head">
          <h2 class="detail-title">${isNew ? "Nuovo vino" : escapeHtml(w.titolo)}</h2>
          <div class="detail-price">${isNew ? "—" : (w.prezzo !== null ? "€ " + fmtPrice(w.prezzo) : "—")}</div>
        </div>

        <div class="admin-form" style="margin-top:14px; display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
          <div class="field" style="gap:6px;">
            <label>Titolo</label>
            <input id="f_titolo" type="text" value="${titolo}">
          </div>
          <div class="field" style="gap:6px;">
            <label>Cantina</label>
            <input id="f_cantina" type="text" value="${cantina}">
          </div>

          <div class="field" style="gap:6px;">
            <label>Tipologia</label>
            <input id="f_tipologia" type="text" value="${tipologia}">
          </div>
          <div class="field" style="gap:6px;">
            <label>Territorio</label>
            <input id="f_luogo" type="text" value="${luogo}">
          </div>

          <div class="field" style="gap:6px;">
            <label>Uvaggio</label>
            <input id="f_uvaggio" type="text" value="${uvaggio}">
          </div>
          <div class="field" style="gap:6px;">
            <label>Annata</label>
            <input id="f_annata" type="number" value="${annata}" placeholder="2021">
          </div>

          <div class="field" style="gap:6px;">
            <label>Prezzo (€)</label>
            <input id="f_prezzo" type="number" step="0.5" value="${prezzo}" placeholder="12">
          </div>

          <div class="field" style="gap:6px; align-items:flex-start;">
            <label style="display:flex; gap:10px; align-items:center; margin-top:22px;">
              <input id="f_in_evidenza" type="checkbox" ${evidenza} style="width:auto;">
              In evidenza
            </label>
          </div>

          <div class="field" style="grid-column: 1 / -1; gap:6px;">
            <label>Descrizione</label>
            <input id="f_descrizione" type="text" value="${descrizione}" placeholder="Note, abbinamenti, ecc.">
          </div>
        </div>

        <div class="detail-actions" style="margin-top:14px;">
          <button class="btn btn--soft" id="saveBtn" type="button">${isNew ? "Crea vino" : "Salva modifiche"}</button>
          ${isNew ? "" : `<button class="btn btn--ghost" id="deleteBtn" type="button">Elimina</button>`}
        </div>

        <div class="detail-small">
          ${SESSION ? "Puoi modificare: sei autenticato." : "Per salvare devi fare login."}
        </div>
      </div>
    </div>
  `;
}

function readForm() {
  return {
    titolo: normalizeText($("#f_titolo")?.value),
    cantina: normalizeText($("#f_cantina")?.value),
    tipologia: normalizeText($("#f_tipologia")?.value),
    luogo: normalizeText($("#f_luogo")?.value),
    uvaggio: normalizeText($("#f_uvaggio")?.value),
    annata: toNumber($("#f_annata")?.value),
    prezzo: toNumber($("#f_prezzo")?.value),
    descrizione: normalizeText($("#f_descrizione")?.value),
    immagine_url: normalizeText($("#f_immagine_url")?.value),
    in_evidenza: !!$("#f_in_evidenza")?.checked,
  };
}

async function onSave(id) {
  const patch = readForm();
  if (!patch.titolo) return alert("Titolo obbligatorio.");
  await updateWine(id, patch);
}

async function onCreate() {
  const payload = readForm();
  if (!payload.titolo) return alert("Titolo obbligatorio.");
  await insertWine(payload);
}

/* =========================
   EVENTS
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

/* =========================
   RELOAD HELPERS
========================= */
async function reloadAndGoList() {
  await fetchWines();
  hydrateFilterOptions();
  applyFilters();
  location.hash = "";
  showList();
  setTimeout(() => setHint(""), 900);
}

async function reloadAndStayDetail(id) {
  await fetchWines();
  hydrateFilterOptions();
  applyFilters();
  location.hash = `#wine=${encodeURIComponent(id)}`;
  showDetail(id);
  setTimeout(() => setHint(""), 900);
}

/* =========================
   START
========================= */
(async function start() {
  if (!supabase) {
    alert("Manca supabase-js. Aggiungi lo script CDN in admin.html.");
    return;
  }

  injectAuthUI();
  bindEvents();

  await refreshSession();
  await fetchWines();
  hydrateFilterOptions();
  applyFilters();
  handleRoute();
})();


