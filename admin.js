/* =========================
   CONFIG
========================= */
const SUPABASE_URL = "https://bxdermzgfunwpvgektnz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4ZGVybXpnZnVud3B2Z2VrdG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MDk1NzksImV4cCI6MjA4NjI4NTU3OX0.yIr_RtG2WDDl09l5MY2MWFd2PnnoE0L3c0uVxBBzQCE";

/* =========================
   CLIENT
========================= */
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* =========================
   DOM
========================= */
const $ = (s) => document.querySelector(s);

const el = {
  hint: $("#hint"),
  count: $("#countPill"),

  // auth
  email: $("#email"),
  password: $("#password"),
  loginBtn: $("#loginBtn"),
  logoutBtn: $("#logoutBtn"),

  // create
  new_titolo: $("#new_titolo"),
  new_cantina: $("#new_cantina"),
  new_tipologia: $("#new_tipologia"),
  new_annata: $("#new_annata"),
  new_prezzo: $("#new_prezzo"),
  new_descrizione: $("#new_descrizione"),
  new_immagine_url: $("#new_immagine_url"),
  createBtn: $("#createBtn"),

  // list
  q: $("#q"),
  rows: $("#rows"),
  empty: $("#empty"),

  // modal edit
  modal: $("#modal"),
  closeModalBtn: $("#closeModalBtn"),
  cancelBtn: $("#cancelBtn"),
  saveBtn: $("#saveBtn"),

  edit_id: $("#edit_id"),
  edit_titolo: $("#edit_titolo"),
  edit_cantina: $("#edit_cantina"),
  edit_tipologia: $("#edit_tipologia"),
  edit_annata: $("#edit_annata"),
  edit_prezzo: $("#edit_prezzo"),
  edit_descrizione: $("#edit_descrizione"),
  edit_immagine_url: $("#edit_immagine_url"),
};

let ALL = [];
let editingId = null;

/* =========================
   UTILS
========================= */
function setHint(msg){ if(el.hint) el.hint.textContent = msg || "—"; }
function setCount(n){ if(el.count) el.count.textContent = String(n ?? 0); }

function n(v){
  if(v === null || v === undefined || v === "") return null;
  const x = Number(String(v).replace(",", "."));
  return Number.isFinite(x) ? x : null;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openModal(){
  el.modal.classList.add("is-open");
}
function closeModal(){
  el.modal.classList.remove("is-open");
  editingId = null;
}

/* =========================
   AUTH
========================= */
async function refreshAuthUI(){
  const { data } = await supabase.auth.getSession();
  const logged = !!data.session;

  el.loginBtn.style.display = logged ? "none" : "inline-flex";
  el.logoutBtn.style.display = logged ? "inline-flex" : "none";

  setHint(logged ? "Autenticato ✓" : "Non autenticato");
}

async function login(){
  setHint("Login…");
  const { error } = await supabase.auth.signInWithPassword({
    email: el.email.value.trim(),
    password: el.password.value
  });

  if(error){
    setHint("Login fallito");
    console.error(error);
    return;
  }
  setHint("Login OK ✓");
  await refreshAuthUI();
  await loadRows();
}

async function logout(){
  await supabase.auth.signOut();
  setHint("Logout");
  await refreshAuthUI();
}

/* =========================
   CRUD
========================= */
async function loadRows(){
  setHint("Caricamento vini…");

  const { data, error } = await supabase
    .from("vini")
    .select("*")
    .order("titolo", { ascending: true });

  if(error){
    setHint("Errore nel caricamento (RLS?)");
    console.error(error);
    ALL = [];
    renderRows();
    return;
  }

  ALL = data || [];
  renderRows();
  setHint("");
}

async function createWine(){
  setHint("Creazione…");

  const payload = {
    titolo: el.new_titolo.value.trim(),
    cantina: el.new_cantina.value.trim(),
    tipologia: el.new_tipologia.value.trim(),
    annata: el.new_annata.value.trim(),
    prezzo: n(el.new_prezzo.value),
    descrizione: el.new_descrizione.value.trim(),
    immagine_url: el.new_immagine_url.value.trim(),
  };

  if(!payload.titolo || !payload.cantina){
    setHint("Titolo e Cantina sono obbligatori");
    return;
  }

  const { error } = await supabase.from("vini").insert(payload);

  if(error){
    setHint("Errore creazione (RLS?)");
    console.error(error);
    return;
  }

  // reset campi
  el.new_titolo.value = "";
  el.new_cantina.value = "";
  el.new_tipologia.value = "";
  el.new_annata.value = "";
  el.new_prezzo.value = "";
  el.new_descrizione.value = "";
  el.new_immagine_url.value = "";

  setHint("Creato ✓");
  await loadRows();
}

function renderRows(){
  const q = (el.q.value || "").trim().toLowerCase();

  const filtered = ALL.filter(v => {
    if(!q) return true;
    return (
      String(v.titolo || "").toLowerCase().includes(q) ||
      String(v.cantina || "").toLowerCase().includes(q)
    );
  });

  setCount(filtered.length);

  if(!filtered.length){
    el.rows.innerHTML = "";
    el.empty.style.display = "block";
    return;
  }
  el.empty.style.display = "none";

  el.rows.innerHTML = filtered.map(v => `
    <tr>
      <td>${escapeHtml(v.id)}</td>
      <td><strong>${escapeHtml(v.titolo)}</strong></td>
      <td>${escapeHtml(v.cantina)}</td>
      <td>${escapeHtml(v.tipologia)}</td>
      <td>${escapeHtml(v.annata)}</td>
      <td>${v.prezzo ?? ""}</td>
      <td>
        <div class="row-actions">
          <button class="btn btn--ghost" data-edit="${escapeHtml(v.id)}" type="button">Modifica</button>
          <button class="bt
