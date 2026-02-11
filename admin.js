import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================================================
   ADMIN — Le Cantine del Duca (Supabase)
   - Login email/password (Supabase Auth)
   - CRUD tabella: public.vini
   - Edit + New in modal
   ========================================================= */

/* =========================
   CONFIG
========================= */
const SUPABASE_URL = "https://bxdermzgfunwpvgektnz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4ZGVybXpnZnVud3B2Z2VrdG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MDk1NzksImV4cCI6MjA4NjI4NTU3OX0.yIr_RtG2WDDl09l5MY2MWFd2PnnoE0L3c0uVxBBzQCE";
const TABLE = "vini";

/* =========================
   CLIENT
========================= */
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* =========================
   STATE
========================= */
let ALL = [];
let FILTERED = [];
let EDITING_ID = null;

/* =========================
   DOM
========================= */
const $ = (s) => document.querySelector(s);

const el = {
  hint: $("#hint"),
  countPill: $("#countPill"),

  loginPanel: $("#loginPanel"),
  appPanel: $("#appPanel"),

  email: $("#email"),
  password: $("#password"),
  loginBtn: $("#loginBtn"),

  userBox: $("#userBox"),
  logoutBtn: $("#logoutBtn"),

  q: $("#q"),
  tipologia: $("#tipologia"),
  luogo: $("#luogo"),
  resetBtn: $("#resetBtn"),

  grid: $("#grid"),
  newBtn: $("#newBtn"),

  modal: $("#modal"),
  closeBtn: $("#closeBtn"),
  cancelBtn: $("#cancelBtn"),
  saveBtn: $("#saveBtn"),
  deleteBtn: $("#deleteBtn"),
  modalTitle: $("#modalTitle"),

  // form modal
  id: $("#id"),
  titolo: $("#titolo"),
  cantina: $("#cantina"),
  tipologiaM: $("#tipologiaM"),
  luogoM: $("#luogoM"),
  annata: $("#annata"),
  prezzo: $("#prezzo"),
  uvaggio: $("#uvaggio"),
  immagine_url: $("#immagine_url"),
  descrizione: $("#descrizione"),
};

/* =========================
   UTILS
========================= */
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
function uniqSorted(arr) {
  return Array.from(new Set(arr.filter(Boolean))).sort((a, b) =>
    String(a).localeCompare(String(b), "it", { sensitivity: "base" })
  );
}
function openModal() {
  el.modal?.classList.add("is-open");
  el.modal?.setAttribute("aria-hidden", "false");
}
function closeModal() {
  el.modal?.classList.remove("is-open");
  el.modal?.setAttribute("aria-hidden", "true");
  EDITING_ID = null;
}

/* =========================
   AUTH
========================= */
async function login() {
  const email = normalizeText(el.email?.value);
  const password = normalizeText(el.password?.value);

  if (!email || !password) return alert("Inserisci email e password.");

  setHint("Login…");

  const { data, error } = await sb.auth.signInWithPassword({ email, password });

  if (error) {
    setHint("");
    return alert("Errore login: " + error.message);
  }

  setHint("Accesso OK ✓");
  await onAuthed(data.user);
}

async function logout() {
  setHint("Logout…");
  await sb.auth.signOut();
  setHint("Uscito.");
  showLogin();
}

function showLogin() {
  el.loginPanel.style.display = "block";
  el.appPanel.style.display = "none";
}

async function onAuthed(user) {
  el.userBox.textContent = user?.email ? `Loggato: ${user.email}` : "Loggato";
  el.loginPanel.style.display = "none";
  el.appPanel.style.display = "block";
  await reload();
}

/* =========================
   DATA
========================= */
async function reload() {
  setHint("Caricamento vini…");

  // select * e order per titolo (come carta vini)
  const { data, error } = await sb.from(TABLE).select("*").order("titolo", { ascending: true });

  if (error) {
    setHint("");
    console.error(error);
    return alert("Errore SELECT: " + error.message);
  }

  ALL = Array.isArray(data) ? data : [];
  hydrateFilters();
  applyFilters();
  setHint("");
}

function hydrateFilters() {
  const tipologie = uniqSorted(ALL.map((v) => v.tipologia));
  const luoghi = uniqSorted(ALL.map((v) => v.luogo));

  fillSelect(el.tipologia, tipologie, "Tutte");
  fillSelect(el.luogo, luoghi, "Tutti");
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
   FILTERING + RENDER
========================= */
function getFilters() {
  return {
    q: normalizeText(el.q.value).toLowerCase(),
    tipologia: normalizeText(el.tipologia.value),
    luogo: normalizeText(el.luogo.value),
  };
}

function applyFilters() {
  const f = getFilters();

  FILTERED = ALL.filter((v) => {
    if (f.tipologia && v.tipologia !== f.tipologia) return false;
    if (f.luogo && v.luogo !== f.luogo) return false;

    if (f.q) {
      const hay = `${v.titolo ?? ""} ${v.cantina ?? ""} ${v.tipologia ?? ""} ${v.luogo ?? ""}`.toLowerCase();
      if (!hay.includes(f.q)) return false;
    }
    return true;
  });

  setCount(FILTERED.length);
  renderGrid(FILTERED);
}

function renderGrid(items) {
  if (!el.grid) return;

  if (!items.length) {
    el.grid.innerHTML = `
      <div class="empty">
        <div class="empty__title">Nessun risultato</div>
        <div class="empty__text">Prova a cambiare i filtri.</div>
      </div>
    `;
    return;
  }

  el.grid.innerHTML = items
    .map((v) => {
      const img = v.immagine_url ? `<img class="card__img" src="${escapeHtml(v.immagine_url)}" loading="lazy" alt="${escapeHtml(v.titolo)}">`
                                : `<div class="card__img card__img--ph" aria-hidden="true"><div class="ph__mark">🍷</div></div>`;
      const prezzo = v.prezzo !== null && v.prezzo !== undefined && v.prezzo !== "" ? `€ ${escapeHtml(v.prezzo)}` : "";

      const meta = [v.cantina, v.tipologia, v.luogo, v.annata].filter(Boolean).join(" • ");

      return `
        <article class="card" role="button" tabindex="0" data-id="${escapeHtml(v.id)}" aria-label="Modifica ${escapeHtml(v.titolo)}">
          ${img}
          <div class="card__body">
            <div class="card__top">
              <h3 class="card__title">${escapeHtml(v.titolo)}</h3>
              ${prezzo ? `<div class="card__price">${prezzo}</div>` : ""}
            </div>
            <div class="card__meta">${escapeHtml(meta)}</div>
            ${v.uvaggio ? `<div class="card__uvaggio">${escapeHtml(v.uvaggio)}</div>` : ""}
            <div class="admin-card-actions">
              <button class="btn btn--ghost small" data-edit="${escapeHtml(v.id)}" type="button">Modifica</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  // bind edit
  el.grid.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-edit");
      openEdit(id);
    });
  });

  // click card = edit
  el.grid.querySelectorAll("[data-id]").forEach((card) => {
    const open = () => openEdit(card.getAttribute("data-id"));
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
  });
}

/* =========================
   MODAL CRUD
========================= */
function clearForm() {
  el.id.value = "";
  el.titolo.value = "";
  el.cantina.value = "";
  el.tipologiaM.value = "";
  el.luogoM.value = "";
  el.annata.value = "";
  el.prezzo.value = "";
  el.uvaggio.value = "";
  el.immagine_url.value = "";
  el.descrizione.value = "";
}

function fillForm(v) {
  el.id.value = v.id ?? "";
  el.titolo.value = v.titolo ?? "";
  el.cantina.value = v.cantina ?? "";
  el.tipologiaM.value = v.tipologia ?? "";
  el.luogoM.value = v.luogo ?? "";
  el.annata.value = v.annata ?? "";
  el.prezzo.value = v.prezzo ?? "";
  el.uvaggio.value = v.uvaggio ?? "";
  el.immagine_url.value = v.immagine_url ?? "";
  el.descrizione.value = v.descrizione ?? "";
}

function openNew() {
  EDITING_ID = null;
  el.modalTitle.textContent = "Nuovo vino";
  el.deleteBtn.style.display = "none";
  clearForm();
  openModal();
}

function openEdit(id) {
  const v = ALL.find((x) => String(x.id) === String(id));
  if (!v) return alert("Record non trovato.");
  EDITING_ID = v.id;
  el.modalTitle.textContent = "Modifica vino";
  el.deleteBtn.style.display = "inline-flex";
  fillForm(v);
  openModal();
}

function payloadFromForm() {
  // NOTA: manteniamo nomi colonna come da screenshot: titolo, cantina, tipologia, luogo, annata, prezzo, uvaggio, descrizione, immagine_url
  return {
    titolo: normalizeText(el.titolo.value),
    cantina: normalizeText(el.cantina.value) || null,
    tipologia: normalizeText(el.tipologiaM.value) || null,
    luogo: normalizeText(el.luogoM.value) || null,
    annata: toNumber(el.annata.value),
    prezzo: toNumber(el.prezzo.value),
    uvaggio: normalizeText(el.uvaggio.value) || null,
    descrizione: normalizeText(el.descrizione.value) || null,
    immagine_url: normalizeText(el.immagine_url.value) || null,
  };
}

async function save() {
  const p = payloadFromForm();
  if (!p.titolo) return alert("Titolo obbligatorio.");

  setHint("Salvataggio…");

  if (EDITING_ID) {
    const { error } = await sb.from(TABLE).update(p).eq("id", EDITING_ID);
    if (error) {
      setHint("");
      return alert("Errore UPDATE: " + error.message);
    }
    setHint("Aggiornato ✓");
  } else {
    const { error } = await sb.from(TABLE).insert(p);
    if (error) {
      setHint("");
      return alert("Errore INSERT: " + error.message);
    }
    setHint("Creato ✓");
  }

  closeModal();
  await reload();
}

async function del() {
  if (!EDITING_ID) return;
  if (!confirm("Eliminare questo vino?")) return;

  setHint("Eliminazione…");
  const { error } = await sb.from(TABLE).delete().eq("id", EDITING_ID);

  if (error) {
    setHint("");
    return alert("Errore DELETE: " + error.message);
  }

  setHint("Eliminato ✓");
  closeModal();
  await reload();
}

/* =========================
   EVENTS
========================= */
function bindEvents() {
  el.loginBtn?.addEventListener("click", login);
  el.password?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") login();
  });

  el.logoutBtn?.addEventListener("click", logout);

  el.newBtn?.addEventListener("click", openNew);

  const bindFilter = (node, evt) => node && node.addEventListener(evt, applyFilters);
  bindFilter(el.q, "input");
  bindFilter(el.tipologia, "change");
  bindFilter(el.luogo, "change");

  el.resetBtn?.addEventListener("click", () => {
    el.q.value = "";
    el.tipologia.value = "";
    el.luogo.value = "";
    applyFilters();
  });

  // modal close
  el.closeBtn?.addEventListener("click", closeModal);
  el.cancelBtn?.addEventListener("click", closeModal);
  el.modal?.addEventListener("click", (e) => {
    if (e.target?.dataset?.close) closeModal();
  });

  el.saveBtn?.addEventListener("click", save);
  el.deleteBtn?.addEventListener("click", del);
}

/* =========================
   START
========================= */
(async function start() {
  bindEvents();

  // session check
  const { data } = await sb.auth.getSession();
  if (data?.session?.user) {
    await onAuthed(data.session.user);
  } else {
    showLogin();
  }
})();
