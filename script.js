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
  BY_ID = new Map(VINI._

