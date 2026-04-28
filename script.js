async function loadWines() {
  el.grid.innerHTML = '<div class="loading">🍷 Caricamento in corso...</div>';
  
  try {
    const resp = await fetch(API_URL);
    if (!resp.ok) throw new Error("Server non raggiungibile");
    
    const data = await resp.json();
    
    ALL = data.map((w, i) => ({
      id: w.idcantina || `v-${i}`,
      titolo: w.idcantina || "Vino senza nome",
      tipologia: w.tipologia || "Altro",
      luogo: w.luogo || "",
      annata: w.annata || "",
      uvaggio: w.uvaggio || "",
      prezzo: toNumber(w.prezzo),
      descrizione: w.descrizione || "",
      immagine: w.immagine || ""
    }));

    BY_ID.clear();
    ALL.forEach(w => BY_ID.set(w.id, w));
    
    populateFilters(ALL);
    applyFilters();
  } catch (err) {
    el.grid.innerHTML = `<div class="error">Errore: Dati non trovati.<br>Controlla la connessione.</div>`;
  }
}
