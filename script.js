
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
   DOM
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
   UTILS
========================= */
function escapeHtml(str) {
  return String(str ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function toNumber(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function normalizeText(v) { return String(v ?? "").trim(); }
function sortAlpha(a, b) { return String(a).localeCompare(String(b), "it", { sensitivity: "base" }); }
function uniqSorted(arr) { return Array.from(new Set(arr.filter(Boolean))).sort(sortAlpha); }

function fmtPrice(n) {
  const num = toNumber(n);
  if (num === null) return "";
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 }).format(num);
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

function setHint(msg) { if (el.hint) el.hint.textContent = msg; }
function setCount(n) { if (el.countPill) el.countPill.textContent = String(n ?? 0); }

/* =========================
   FETCH + INIT (SUPABASE)
========================= */
async function loadWines() {
  setHint("Connessione alla cantina...");

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/vini?select=*&order=titolo.asc`, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
