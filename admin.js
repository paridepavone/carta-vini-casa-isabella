/* =========================================================
   ADMIN — Le Cantine del Duca (Supabase)
   - Login email/password (Supabase Auth)
   - CRUD tabella: public.vini
   - Edit + New in modal
   ========================================================= */

/* =========================
   CONFIG (INCOLLA QUI LE TUE CHIAVI)
========================= */
const SUPABASE_URL = "https://bxdermzgfunwpvgektnz.supabase.co";
// ✅ usa ANON PUBLIC key (NON service role) in frontend
const SUPABASE_ANON_KEY = "INCOLLA_LA_TUA_ANON_PUBLIC_KEY_QUI";

const TABLE = "vini";

/* =========================
   CLIENT
========================= */
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* =========================
   STATE
========================= */
let VINI = [];
let EDITING_ID = null;

/* =========================
   DOM
========================= */
const $ = (s) => document.querySelector(s);

const el = {
  hint: $("#hint"),
  countPill: $("#countPill"),
  logoutBtn: $("#logoutBtn"),

  authBox: $("#authBox"),
  app: $("#app"),
  email: $("#email"),
  password: $("#password"),
  loginBtn: $("#loginBtn"),
  signupBtn: $("#signupBtn"),

  q: $("#q"),
  tipologia: $("#tipologia"),
  luogo: $("#luogo"),
  uvaggio: $("#uvaggio"),
  annata: $("#annata"),
  prezzoMax: $("#prezzoMax"),
  resetBtn: $("#resetBtn"),
  newBtn: $("#newBtn"),
  grid: $("#grid"),

  // modal
  modal: $("#modal"),
  modalOverlay: $("#modalOverlay"),
  closeModalBtn: $("#closeModalBtn"),
  cancelBtn: $("#cancelBtn"),
  saveBtn: $("#saveBtn"),
  deleteBtn: $("#deleteBtn"),
  modalTitle: $("#modalTitle"),

  f_titolo: $("#f_titolo"),
  f_cantina: $("#f_cantina"),
  f_tipologia: $("#f_tipologia"),
  f_luogo: $("#f_luogo"),
  f_annata: $("#f_annata"),
  f_uvaggio: $("#f_uvaggio"),
  f_prezzo: $("#f_prezzo"),
  f_immagine_url: $("#f_immagine_url"),
  f_descrizione: $("#f_descrizione"),
  imgPrevWrap: $("#imgPrevWrap"),
  imgPrev: $("#imgPrev"),
};

/* =========================
   UTILS
========================= */
function setHint(msg) { if (el.hint) el.hint.textContent = msg || ""; }
function setCount(n) { if (el.countPill) el.countPill.textContent = String(n ?? 0); }

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeText(v) { return String(v ?? "").trim(); }

function toNumber(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function sortAlpha(a, b) {
  return String(a ?? "").localeCompare(String(b ?? ""), "it", { sensitivity: "base" });
}

function uniqSorted(arr) {
  return Array.from(new Set(arr.map((x) => normalizeText(x)).filter(Boolean))).sort(sortAlpha);
}

function fmtPrice(n) {
  const num = toNumber(n);
  if (num === null) return "";
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 }).format(num);
}

/* =========================
   AUTH UI
========================= */
function showAuth() {
  el.authBox.style.display = "block";
  el.app.style.display = "none";
  el.logoutBtn.style.display = "none";
}
function showApp() {
  el.authBox.style.display = "none";
  el.app.style.display = "block";
  el.logoutBtn.style.display = "inline-flex";
}

async function refreshSession() {
  const { data } = await supabase.auth.getSession();
  if (data?.session) showApp();
  else showAuth();
}

async function login() {
  setHint("Accesso…");
  const email = normalizeText(el.email.value);
  const password = String(el.password.value || "");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { setHint(""); return alert("Login: " + error.message); }
  setHint("Ok ✓");
  showApp();
  await reloadAll();
  setTimeout(() => setHint(""), 800);
}

async function signup() {
  const email = normalizeText(el.email.value);
  const password = String(el.password.value || "");
  if (!email || !password) return alert("Inserisci email e password.");
  setHint("Creazione utente…");
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) { setHint(""); return alert("Signup: " + error.message); }
  setHint("Utente creato ✓ (se richiesto, verifica email)");
  setTimeout(() => setHint(""), 1200);
}

async function logout() {
  setHint("Uscita…");
  await supabase.auth.signOut();
  setHint("");
  showAuth();
}

/* =========================
   DATA
========================= */
async function fetchWines() {
  setHint("Caricamento vini…");

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("titolo", { ascending: true });

  if (error) { setHint(""); throw error; }

  VINI = Array.isArray(data) ? data : [];
  setCount(VINI.length);
  setHint("");
}

function hydrateFilterOptions() {
  fillSelect(el.tipologia, uniqSorted(VINI.map((w) => w.tipologia)), "Tutte");
  fillSelect(el.luogo, uniqSorted(VINI.map((w) => w.luogo)), "Tutti");
  fillSelect(el.uvaggio, uniqSorted(VINI.map((w) => w.uvaggio)), "Tutti");

  const annate = uniqSorted(VINI.map((w) => (w.annata ? String(w.annata) : null)))
    .sort((a, b) => Number(b) - Number(a));
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
    q: normalizeText(el.q.value).toLowerCase(),
    tipologia: normalizeText(el.tipologia.value),
    luogo: normalizeText(el.luogo.value),
    uvaggio: normalizeText(el.uvaggio.value),
    annata: normalizeText(el.annata.value),
    prezzoMax: toNumber(el.prezzoMax.value),
  };
}

function applyFilters() {
  const f = getFilters();

  let items = VINI.filter((w) => {
    if (f.tipologia && w.tipologia !== f.tipologia) return false;
    if (f.luogo && w.luogo !== f.luogo) return false;
    if (f.uvaggio && w.uvaggio !== f.uvaggio) return false;
    if (f.annata && String(w.annata ?? "") !== f.annata) return false;

    if (f.prezzoMax !== null && w.prezzo !== null && Number(w.prezzo) > f.prezzoMax) return false;

    if (f.q) {
      const hay = (
        (w.titolo || "") + " " +
        (w.cantina || "") + " " +
        (w.tipologia || "") + " " +
        (w.luogo || "") + " " +
        (w.annata || "") + " " +
        (w.uvaggio || "") + " " +
        (w.descrizione || "")
      ).toLowerCase();
      if (!hay.includes(f.q)) return false;
    }
    return true;
  });

  // Ordinamento “menu”
  items.sort((a, b) => {
    const t1 = sortAlpha(a.tipologia, b.tipologia);
    if (t1 !== 0) return t1;
    const t2 = sortAlpha(a.titolo, b.titolo);
    if (t2 !== 0) return t2;
    return Number(b.annata || 0) - Number(a.annata || 0);
  });

  setCount(items.length);
  renderGrid(items);
}

/* =========================
   RENDER
========================= */
function wineCardHtml(w) {
  const price = w.prezzo !== null && w.prezzo !== undefined && w.prezzo !== "" ? `€ ${fmtPrice(w.prezzo)}` : "";
  const meta = [w.cantina, w.tipologia, w.luogo, w.annata ? String(w.annata) : ""].filter(Boolean).join(" • ");

  const img = normalizeText(w.immagine_url);
  const imgHtml = img
    ? `<img class="card__img" src="${escapeHtml(img)}" alt="${escapeHtml(w.titolo)}" loading="lazy">`
    : `<div class="card__img card__img--ph" aria-hidden="true"><div class="ph__mark">🍷</div></div>`;

  return `
    <article class="card" role="button" tabindex="0" data-id="${escapeHtml(w.id)}" aria-label="Modifica ${escapeHtml(w.titolo)}">
      ${imgHtml}
      <div class="card__body">
        <div class="card__top">
          <h3 class="card__title">${escapeHtml(w.titolo || "")}</h3>
          ${price ? `<div class="card__price">${escapeHtml(price)}</div>` : ""}
        </div>
        <div class="card__meta">${escapeHtml(meta)}</div>
        ${w.uvaggio ? `<div class="card__uvaggio">${escapeHtml(w.uvaggio)}</div>` : ""}
        <div class="adminRow">
          <button class="btn btn--ghost btn--xs" data-edit="${escapeHtml(w.id)}" type="button">Modifica</button>
        </div>
      </div>
    </article>
  `;
}

function renderGrid(items) {
  if (!el.grid) return;

  if (!items.length) {
    el.grid.innerHTML = `
      <div class="empty">
        <div class="empty__title">Nessun risultato</div>
        <div class="empty__text">Prova a cambiare filtri.</div>
      </div>`;
    return;
  }

  el.grid.innerHTML = items.map(wineCardHtml).join("");

  el.grid.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => openEdit(btn.getAttribute("data-edit")));
  });

  el.grid.querySelectorAll("[data-id]").forEach((card) => {
    card.addEventListener("dblclick", () => openEdit(card.getAttribute("data-id")));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter") openEdit(card.getAttribute("data-id"));
    });
  });
}

/* =========================
   MODAL (NEW / EDIT)
========================= */
function openModal() {
  el.modal.setAttribute("aria-hidden", "false");
  el.modal.classList.add("is-open");
  document.body.classList.add("no-scroll");
}

function closeModal() {
  el.modal.setAttribute("aria-hidden", "true");
  el.modal.classList.remove("is-open");
  document.body.classList.remove("no-scroll");
  EDITING_ID = null;
}

function setFormValues(w) {
  el.f_titolo.value = w?.titolo ?? "";
  el.f_cantina.value = w?.cantina ?? "";
  el.f_tipologia.value = w?.tipologia ?? "";
  el.f_luogo.value = w?.luogo ?? "";
  el.f_annata.value = w?.annata ?? "";
  el.f_uvaggio.value = w?.uvaggio ?? "";
  el.f_prezzo.value = w?.prezzo ?? "";
  el.f_immagine_url.value = w?.immagine_url ?? "";
  el.f_descrizione.value = w?.descrizione ?? "";

  updateImgPreview(el.f_immagine_url.value);
}

function getFormValues() {
  return {
    titolo: normalizeText(el.f_titolo.value),
    cantina: normalizeText(el.f_cantina.value),
    tipologia: normalizeText(el.f_tipologia.value),
    luogo: normalizeText(el.f_luogo.value),
    annata: normalizeText(el.f_annata.value) || null,
    uvaggio: normalizeText(el.f_uvaggio.value),
    prezzo: toNumber(el.f_prezzo.value),
    immagine_url: normalizeText(el.f_immagine_url.value),
    descrizione: normalizeText(el.f_descrizione.value),
  };
}

function updateImgPreview(url) {
  const u = normalizeText(url);
  if (!u) {
    el.imgPrevWrap.style.display = "none";
    el.imgPrev.removeAttribute("src");
    return;
  }
  el.imgPrevWrap.style.display = "block";
  el.imgPrev.src = u;
}

function openNew() {
  EDITING_ID = null;
  el.modalTitle.textContent = "Nuovo vino";
  el.deleteBtn.style.display = "none";
  setFormValues({});
  openModal();
}

function openEdit(id) {
  const w = VINI.find((x) => String(x.id) === String(id));
  if (!w) return alert("Vino non trovato.");
  EDITING_ID = w.id;
  el.modalTitle.textContent = "Modifica vino";
  el.deleteBtn.style.display = "inline-flex";
  setFormValues(w);
  openModal();
}

async function saveCurrent() {
  const payload = getFormValues();

  if (!payload.titolo) return alert("Titolo obbligatorio.");
  if (!payload.tipologia) payload.tipologia = "—";

  setHint("Salvataggio…");

  if (EDITING_ID === null) {
    const { error } = await supabase.from(TABLE).insert(payload);
    if (error) { setHint(""); return alert("INSERT: " + error.message); }
    setHint("Creato ✓");
  } else {
    const { error } = await supabase.from(TABLE).update(payload).eq("id", EDITING_ID);
    if (error) { setHint(""); return alert("UPDATE: " + error.message); }
    setHint("Aggiornato ✓");
  }

  closeModal();
  await reloadAll();
  setTimeout(() => setHint(""), 900);
}

async function deleteCurrent() {
  if (EDITING_ID === null) return;
  const ok = confirm("Eliminare questo vino? Operazione irreversibile.");
  if (!ok) return;

  setHint("Eliminazione…");
  const { error } = await supabase.from(TABLE).delete().eq("id", EDITING_ID);
  if (error) { setHint(""); return alert("DELETE: " + error.message); }

  closeModal();
  setHint("Eliminato ✓");
  await reloadAll();
  setTimeout(() => setHint(""), 900);
}

/* =========================
   RELOAD
========================= */
async function reloadAll() {
  await fetchWines();
  hydrateFilterOptions();
  applyFilters();
}

/* =========================
   EVENTS
========================= */
function bindEvents() {
  el.loginBtn?.addEventListener("click", login);
  el.signupBtn?.addEventListener("click", signup);
  el.logoutBtn?.addEventListener("click", logout);

  // Enter per login
  [el.email, el.password].forEach((n) => n?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") login();
  }));

  // Filtri
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

  el.newBtn?.addEventListener("click", openNew);

  // Modal close
  el.modalOverlay?.addEventListener("click", closeModal);
  el.closeModalBtn?.addEventListener("click", closeModal);
  el.cancelBtn?.addEventListener("click", closeModal);

  // Modal actions
  el.saveBtn?.addEventListener("click", saveCurrent);
  el.deleteBtn?.addEventListener("click", deleteCurrent);

  // Preview immagine
  el.f_immagine_url?.addEventListener("input", (e) => updateImgPreview(e.target.value));

  // ESC
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && el.modal.classList.contains("is-open")) closeModal();
  });
}

/* =========================
   START
========================= */
(async function start() {
  bindEvents();

  // auto refresh session UI
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) showApp();
    else showAuth();
  });

  await refreshSession();

  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session) await reloadAll();
  } catch (e) {
    console.error(e);
  }
})();
