/* =========================================================
   ADMIN — Le Cantine del Duca (Supabase)
   - Login email/password (Supabase Auth)
   - CRUD tabella: public.vini
   - Editor: Nuovo / Modifica (no modal, 2 views)
   ========================================================= */

/* =========================
   CONFIG
========================= */
const SUPABASE_URL = "https://bxdermzgfunwpvgektnz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4ZGVybXpnZnVud3B2Z2VrdG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MDk1NzksImV4cCI6MjA4NjI4NTU3OX0.yIr_RtG2WDDl09l5MY2MWFd2PnnoE0L3c0uVxBBzQCE"; // <-- metti la tua (quella pubblica)
const TABLE = "vini";

/* =========================
   CLIENT
========================= */
const sb = window.supabase?.createClient?.(SUPABASE_URL, SUPABASE_ANON_KEY);
if (!sb) {
  alert("Supabase SDK non caricato. Controlla lo script UMD in admin.html.");
}

/* =========================
   STATE
========================= */
let VINI = [];
let EDIT_ID = null;

/* =========================
   DOM
========================= */
const $ = (s) => document.querySelector(s);

const el = {
  hint: $("#hint"),
  countPill: $("#countPill"),

  authView: $("#authView"),
  listView: $("#listView"),
  editView: $("#editView"),

  email: $("#email"),
  password: $("#password"),
  loginBtn: $("#loginBtn"),
  logoutBtn: $("#logoutBtn"),

  q: $("#q"),
  tipologia: $("#tipologia"),
  luogo: $("#luogo"),
  uvaggio: $("#uvaggio"),
  annata: $("#annata"),
  prezzoMax: $("#prezzoMax"),
  resetBtn: $("#resetBtn"),
  refreshBtn: $("#refreshBtn"),
  newBtn: $("#newBtn"),

  grid: $("#grid"),

  backBtn: $("#backBtn"),
  editorTitle: $("#editorTitle"),
  editorSub: $("#editorSub"),
  editorMeta: $("#editorMeta"),

  e_titolo: $("#e_titolo"),
  e_cantina: $("#e_cantina"),
  e_tipologia: $("#e_tipologia"),
  e_luogo: $("#e_luogo"),
  e_annata: $("#e_annata"),
  e_uvaggio: $("#e_uvaggio"),
  e_prezzo: $("#e_prezzo"),
  e_descrizione: $("#e_descrizione"),
  e_immagine_url: $("#e_immagine_url"),

  saveBtn: $("#saveBtn"),
  saveNewBtn: $("#saveNewBtn"),
  deleteBtn: $("#deleteBtn"),
};

/* =========================
   UTILS
========================= */
function setHint(msg) {
  if (el.hint) el.hint.textContent = msg || "—";
}
function setCount(n) {
  if (el.countPill) el.countPill.textContent = String(n ?? 0);
}
function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function toNumber(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
function norm(v) {
  const s = String(v ?? "").trim();
  return s.length ? s : "";
}
function uniqSorted(arr) {
  return Array.from(new Set(arr.filter(Boolean))).sort((a, b) =>
    String(a).localeCompare(String(b), "it", { sensitivity: "base" })
  );
}
function show(viewName) {
  const showAuth = viewName === "auth";
  const showList = viewName === "list";
  const showEdit = viewName === "edit";

  if (el.authView) el.authView.style.display = showAuth ? "block" : "none";
  if (el.listView) el.listView.style.display = showList ? "block" : "none";
  if (el.editView) el.editView.style.display = showEdit ? "block" : "none";
}

/* =========================
   AUTH
========================= */
async function login() {
  const email = norm(el.email?.value);
  const password = el.password?.value ?? "";

  if (!email || !password) return alert("Inserisci email e password.");

  setHint("Accesso…");

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    setHint("—");
    return alert("Login error: " + error.message);
  }

  setHint("Connesso ✓");
  el.logoutBtn.style.display = "inline-flex";
  show("list");
  await reloadAll();
}

async function logout() {
  await sb.auth.signOut();
  el.logoutBtn.style.display = "none";
  setHint("—");
  show("auth");
}

/* =========================
   DATA
========================= */
async function fetchVini() {
  setHint("Sincronizzazione…");

  // Se RLS è attiva e non hai policy, qui potrebbe fallire.
  // Tu hai detto: “lascia stare sicurezza” -> se fallisce, vediamo dopo.
  const { data, error } = await sb
    .from(TABLE)
    .select("*")
    .order("titolo", { ascending: true });

  if (error) {
    setHint("—");
    throw error;
  }

  VINI = Array.isArray(data) ? data : [];
  setCount(VINI.length);
  setHint("—");
}

function fillSelect(selectEl, options, allLabel) {
  if (!selectEl) return;
  const current = selectEl.value;
  selectEl.innerHTML =
    `<option value="">${esc(allLabel)}</option>` +
    options.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join("");
  if (current && options.includes(current)) selectEl.value = current;
}

function hydrateFilters() {
  fillSelect(el.tipologia, uniqSorted(VINI.map(v => v.tipologia)), "Tutte");
  fillSelect(el.luogo, uniqSorted(VINI.map(v => v.luogo)), "Tutti");
  fillSelect(el.uvaggio, uniqSorted(VINI.map(v => v.uvaggio)), "Tutti");

  const annate = uniqSorted(VINI.map(v => (v.annata ? String(v.annata) : "")))
    .filter(Boolean)
    .sort((a, b) => Number(b) - Number(a));

  fillSelect(el.annata, annate, "Tutte");
}

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

function applyFilters() {
  const f = getFilters();

  const items = VINI.filter(v => {
    if (f.tipologia && v.tipologia !== f.tipologia) return false;
    if (f.luogo && v.luogo !== f.luogo) return false;
    if (f.uvaggio && v.uvaggio !== f.uvaggio) return false;
    if (f.annata && String(v.annata ?? "") !== f.annata) return false;

    const prezzo = toNumber(v.prezzo);
    if (f.prezzoMax !== null && prezzo !== null && prezzo > f.prezzoMax) return false;

    if (f.q) {
      const hay = `${v.titolo || ""} ${v.cantina || ""} ${v.tipologia || ""} ${v.luogo || ""}`.toLowerCase();
      if (!hay.includes(f.q)) return false;
    }

    return true;
  });

  renderGrid(items);
}

function renderGrid(items) {
  if (!el.grid) return;

  if (!items.length) {
    el.grid.innerHTML = `
      <div class="empty">
        <div class="empty__title">Nessun risultato</div>
        <div class="empty__text">Prova a cambiare filtri o rimuovere_toggle prezzo max.</div>
      </div>
    `;
    return;
  }

  el.grid.innerHTML = items.map(v => {
    const prezzo = v.prezzo ? `€${esc(v.prezzo)}` : "";
    const img = v.immagine_url
      ? `<img class="card__img" src="${esc(v.immagine_url)}" alt="${esc(v.titolo)}" loading="lazy">`
      : `<div class="card__img card__img--ph" aria-hidden="true"><div class="ph__mark">🍷</div></div>`;

    const meta = [v.cantina, v.tipologia, v.luogo, v.annata].filter(Boolean).join(" • ");

    return `
      <article class="card card--admin" data-id="${esc(v.id)}" role="button" tabindex="0" aria-label="Modifica ${esc(v.titolo)}">
        ${img}
        <div class="card__body">
          <div class="card__top">
            <h3 class="card__title">${esc(v.titolo)}</h3>
            ${prezzo ? `<div class="card__price">${prezzo}</div>` : ""}
          </div>
          <div class="card__meta">${esc(meta)}</div>
          <div class="card__adminActions">
            <button class="btn btn--ghost btn--sm" data-edit="${esc(v.id)}" type="button">Modifica</button>
            <button class="btn btn--danger btn--sm" data-del="${esc(v.id)}" type="button">Elimina</button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  // click card = edit
  el.grid.querySelectorAll(".card--admin").forEach(card => {
    const open = () => openEdit(card.getAttribute("data-id"));
    card.addEventListener("click", (e) => {
      // se clicco un bottone, non aprire doppio
      if (e.target.closest("button")) return;
      open();
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
  });

  // buttons
  el.grid.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openEdit(btn.getAttribute("data-edit"));
    });
  });
  el.grid.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteWine(btn.getAttribute("data-del"));
    });
  });
}

async function reloadAll() {
  try {
    await fetchVini();
    hydrateFilters();
    applyFilters();
  } catch (e) {
    console.error(e);
    alert("Errore caricamento vini: " + (e?.message || e));
  }
}

/* =========================
   EDITOR (NEW / EDIT)
========================= */
function clearEditor() {
  EDIT_ID = null;

  el.e_titolo.value = "";
  el.e_cantina.value = "";
  el.e_tipologia.value = "";
  el.e_luogo.value = "";
  el.e_annata.value = "";
  el.e_uvaggio.value = "";
  el.e_prezzo.value = "";
  el.e_descrizione.value = "";
  el.e_immagine_url.value = "";

  el.deleteBtn.style.display = "none";
  el.editorTitle.textContent = "Nuovo vino";
  el.editorMeta.textContent = "";
}

function openNew() {
  clearEditor();
  el.editorSub.textContent = "Compila i campi e salva. Le immagini arrivano da immagine_url.";
  show("edit");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openEdit(id) {
  const v = VINI.find(x => String(x.id) === String(id));
  if (!v) return alert("Vino non trovato.");

  EDIT_ID = v.id;

  el.e_titolo.value = v.titolo || "";
  el.e_cantina.value = v.cantina || "";
  el.e_tipologia.value = v.tipologia || "";
  el.e_luogo.value = v.luogo || "";
  el.e_annata.value = v.annata ?? "";
  el.e_uvaggio.value = v.uvaggio || "";
  el.e_prezzo.value = v.prezzo ?? "";
  el.e_descrizione.value = v.descrizione || "";
  el.e_immagine_url.value = v.immagine_url || "";

  el.deleteBtn.style.display = "inline-flex";
  el.editorTitle.textContent = "Modifica vino";
  el.editorMeta.textContent = `ID: ${String(v.id)}`;
  el.editorSub.textContent = "Modifica i campi e salva. Indietro per tornare alla lista.";

  show("edit");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function editorPayload() {
  const titolo = norm(el.e_titolo.value);
  if (!titolo) throw new Error("Titolo obbligatorio.");

  return {
    titolo,
    cantina: norm(el.e_cantina.value) || null,
    tipologia: norm(el.e_tipologia.value) || null,
    luogo: norm(el.e_luogo.value) || null,
    annata: toNumber(el.e_annata.value),
    uvaggio: norm(el.e_uvaggio.value) || null,
    prezzo: toNumber(el.e_prezzo.value),
    descrizione: norm(el.e_descrizione.value) || null,
    immagine_url: norm(el.e_immagine_url.value) || null,
  };
}

async function save({ goNew = false } = {}) {
  try {
    const payload = editorPayload();
    setHint("Salvataggio…");

    let res;
    if (EDIT_ID) {
      res = await sb.from(TABLE).update(payload).eq("id", EDIT_ID);
    } else {
      res = await sb.from(TABLE).insert(payload);
    }

    if (res.error) throw res.error;

    setHint("Salvato ✓");
    await reloadAll();

    if (goNew) {
      openNew();
    } else {
      show("list");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  } catch (e) {
    console.error(e);
    setHint("—");
    alert("Errore salvataggio: " + (e?.message || e));
  }
}

async function deleteWine(id) {
  const v = VINI.find(x => String(x.id) === String(id));
  const name = v?.titolo ? `“${v.titolo}”` : "questo vino";
  if (!confirm(`Eliminare ${name}?`)) return;

  try {
    setHint("Eliminazione…");
    const { error } = await sb.from(TABLE).delete().eq("id", id);
    if (error) throw error;

    setHint("Eliminato ✓");
    await reloadAll();
    show("list");
  } catch (e) {
    console.error(e);
    setHint("—");
    alert("Errore delete: " + (e?.message || e));
  }
}

/* =========================
   EVENTS
========================= */
function bindEvents() {
  // Auth
  el.loginBtn?.addEventListener("click", login);
  el.logoutBtn?.addEventListener("click", logout);

  // enter in password
  el.password?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") login();
  });

  // Filters
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

  el.refreshBtn?.addEventListener("click", reloadAll);
  el.newBtn?.addEventListener("click", openNew);

  // Editor
  el.backBtn?.addEventListener("click", () => {
    show("list");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  el.saveBtn?.addEventListener("click", () => save({ goNew: false }));
  el.saveNewBtn?.addEventListener("click", () => save({ goNew: true }));
  el.deleteBtn?.addEventListener("click", () => {
    if (!EDIT_ID) return;
    deleteWine(EDIT_ID);
  });
}

/* =========================
   START
========================= */
(async function start() {
  bindEvents();
  setHint("—");

  // Se già loggato: entra e carica
  const { data } = await sb.auth.getSession();
  const session = data?.session;

  if (session) {
    el.logoutBtn.style.display = "inline-flex";
    show("list");
    await reloadAll();
  } else {
    show("auth");
  }
})();
