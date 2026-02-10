const SUPABASE_URL = "https://bxdermzgfunwpvgektnz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4ZGVybXpnZnVud3B2Z2VrdG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MDk1NzksImV4cCI6MjA4NjI4NTU3OX0.yIr_RtG2WDDl09l5MY2MWFd2PnnoE0L3c0uVxBBzQCE";

let VINI = [];

async function prendiVini() {
    const hint = document.getElementById('hint');
    if(hint) hint.innerText = "Sincronizzazione cantina...";

    try {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/vini?select=*&order=titolo.asc`, {
            headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
        });
        VINI = await r.json();
        
        popolaFiltri();
        mostraVini();
        if(hint) hint.innerText = "";
    } catch (e) {
        if(hint) hint.innerText = "Errore nel caricamento dati.";
    }
}

function popolaFiltri() {
    const t = document.getElementById('tipologia');
    const l = document.getElementById('luogo');
    
    const tipi = [...new Set(VINI.map(v => v.tipologia))].sort();
    const luoghi = [...new Set(VINI.map(v => v.luogo))].sort();

    t.innerHTML = '<option value="">Tutte le tipologie</option>' + tipi.map(x => `<option value="${x}">${x}</option>`).join('');
    l.innerHTML = '<option value="">Tutte le regioni</option>' + luoghi.map(x => `<option value="${x}">${x}</option>`).join('');
}

function mostraVini() {
    const grid = document.getElementById('grid');
    const cerca = document.getElementById('q').value.toLowerCase();
    const tipo = document.getElementById('tipologia').value;
    const luogo = document.getElementById('luogo').value;

    const filtrati = VINI.filter(v => {
        return (!tipo || v.tipologia === tipo) &&
               (!luogo || v.luogo === luogo) &&
               (!cerca || v.titolo.toLowerCase().includes(cerca) || v.cantina.toLowerCase().includes(cerca));
    });

    grid.innerHTML = filtrati.map(v => `
        <div class="card" onclick="apriDettaglio('${v.id}')">
            <div class="card__img-container">
                <img src="${v.immagine_url}" class="card__img" loading="lazy">
            </div>
            <div class="card__body">
                <div class="card__top" style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <h3 class="card__title">${v.titolo}</h3>
                    <div class="card__price">€${v.prezzo}</div>
                </div>
                <div class="card__meta">${v.cantina} • ${v.tipologia}</div>
            </div>
        </div>
    `).join('');
}

function apriDettaglio(id) {
    const v = VINI.find(x => x.id == id);
    document.getElementById('listView').style.display = 'none';
    document.getElementById('detailView').style.display = 'block';
    document.getElementById('detailCard').innerHTML = `
        <img src="${v.immagine_url}" style="width:100%; max-height:350px; object-fit:contain; margin-bottom:20px;">
        <h2 style="font-family:serif; font-size:28px; margin-bottom:5px;">${v.titolo}</h2>
        <p style="color:#b79a57; font-style:italic; margin-bottom:15px;">${v.cantina}</p>
        <p style="line-height:1.6; color:#444;">${v.descrizione}</p>
        <div style="font-size:26px; font-weight:800; color:#4a0f1d; text-align:right; border-top:1px solid #eee; padding-top:15px; margin-top:20px;">€${v.prezzo}</div>
    `;
    window.scrollTo(0,0);
}

document.getElementById('backBtn').onclick = () => {
    document.getElementById('listView').style.display = 'block';
    document.getElementById('detailView').style.display = 'none';
};

document.getElementById('q').oninput = mostraVini;
document.getElementById('tipologia').onchange = mostraVini;
document.getElementById('luogo').onchange = mostraVini;

prendiVini();
