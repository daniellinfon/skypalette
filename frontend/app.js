const API = 'http://127.0.0.1:8000';
let selectedFile = null;
let analysisData = null;
let pickedLat = null;
let pickedLon = null;
let isPicking = false;
let tempMarker = null;

// ── MAP ──────────────────────────────────────────────────────────────────
const map = L.map('map').setView([20, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

map.on('click', function (e) {
    if (!isPicking) return;
    pickedLat = parseFloat(e.latlng.lat.toFixed(6));
    pickedLon = parseFloat(e.latlng.lng.toFixed(6));

    if (tempMarker) map.removeLayer(tempMarker);
    tempMarker = L.circleMarker([pickedLat, pickedLon], {
        radius: 10, color: '#ff6b2b', fillColor: '#ff6b2b', fillOpacity: 0.8
    }).addTo(map);

    document.getElementById('coordsDisplay').style.display = 'block';
    document.getElementById('coordsDisplay').textContent = `📍 ${pickedLat}, ${pickedLon}`;
    document.getElementById('pickHint').style.display = 'none';
    document.getElementById('saveBtn').style.display = 'block';
    isPicking = false;
    map.getContainer().style.cursor = '';
});

// ── FILE ─────────────────────────────────────────────────────────────────
const dropZone = document.getElementById('dropZone');
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragging'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragging'));
dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('dragging');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});
document.getElementById('fileInput').addEventListener('change', e => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
});

function handleFile(file) {
    selectedFile = file; analysisData = null;
    pickedLat = null; pickedLon = null;
    if (tempMarker) { map.removeLayer(tempMarker); tempMarker = null; }
    const reader = new FileReader();
    reader.onload = ev => {
        document.getElementById('previewImg').src = ev.target.result;
        document.getElementById('previewWrap').style.display = 'block';
        document.getElementById('analyzeBtn').style.display = 'block';
        document.getElementById('scoresWrap').style.display = 'none';
        document.getElementById('errorMsg').style.display = 'none';
        document.getElementById('saveBtn').style.display = 'none';
    };
    reader.readAsDataURL(file);
}

// ── ANALYZE ──────────────────────────────────────────────────────────────
async function analyze() {
    if (!selectedFile) return;
    const btn = document.getElementById('analyzeBtn');
    btn.disabled = true;
    document.getElementById('loading').style.display = 'block';
    document.getElementById('scoresWrap').style.display = 'none';
    document.getElementById('errorMsg').style.display = 'none';

    try {
        const form = new FormData();
        form.append('file', selectedFile);
        const res = await fetch(`${API}/analyze`, { method: 'POST', body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Error del servidor');
        analysisData = data;
        renderScores(data);
    } catch (err) {
        document.getElementById('errorMsg').textContent = '❌ ' + err.message;
        document.getElementById('errorMsg').style.display = 'block';
    } finally {
        btn.disabled = false;
        document.getElementById('loading').style.display = 'none';
    }
}

function renderScores(data) {
    document.getElementById('scoreBig').textContent = data.final_score;
    document.getElementById('scoreLabel').textContent = data.label;
    document.getElementById('aiScore').textContent = data.ai_score;
    document.getElementById('colorScore').textContent = data.color_score;
    setTimeout(() => {
        document.getElementById('aiBar').style.width = data.ai_score + '%';
        document.getElementById('colorBar').style.width = data.color_score + '%';
    }, 100);

    if (data.has_gps) {
        pickedLat = data.gps.lat;
        pickedLon = data.gps.lon;
        document.getElementById('gpsFound').style.display = 'flex';
        document.getElementById('gpsCoords').textContent = `${pickedLat}, ${pickedLon}`;
        document.getElementById('gpsManual').style.display = 'none';
        document.getElementById('saveBtn').style.display = 'block';
        map.setView([pickedLat, pickedLon], 8);
        if (tempMarker) map.removeLayer(tempMarker);
        tempMarker = L.circleMarker([pickedLat, pickedLon], {
            radius: 10, color: '#ff6b2b', fillColor: '#ff6b2b', fillOpacity: 0.8
        }).addTo(map);
    } else {
        document.getElementById('gpsFound').style.display = 'none';
        document.getElementById('gpsManual').style.display = 'block';
        document.getElementById('saveBtn').style.display = 'none';
    }

    document.getElementById('scoresWrap').style.display = 'block';
}

// ── PICK ─────────────────────────────────────────────────────────────────
function startPicking() {
    isPicking = true;
    map.getContainer().style.cursor = 'crosshair';
    document.getElementById('pickHint').style.display = 'block';
    document.getElementById('coordsDisplay').style.display = 'none';
}

// ── SAVE ─────────────────────────────────────────────────────────────────
async function save() {
    if (!analysisData || pickedLat === null) return;
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';

    try {
        const payload = {
            ...analysisData,
            latitude: pickedLat,
            longitude: pickedLon,
            location_name: document.getElementById('locationName')?.value || null,
        };
        const res = await fetch(`${API}/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Error al guardar');

        saveBtn.textContent = '✅ Guardado';
        if (tempMarker) map.removeLayer(tempMarker);
        addMarker({
            latitude: pickedLat,
            longitude: pickedLon,
            final_score: analysisData.final_score,
            label: analysisData.label,
            image_base64: analysisData.image_base64,
            location_name: payload.location_name,
        });
    } catch (err) {
        document.getElementById('errorMsg').textContent = '❌ ' + err.message;
        document.getElementById('errorMsg').style.display = 'block';
        saveBtn.disabled = false;
        saveBtn.textContent = 'Guardar en el mapa 💾';
    }
}

// ── MARKERS ──────────────────────────────────────────────────────────────
function addMarker(s) {
    const icon = L.divIcon({
        className: '',
        html: `<div class="sunset-marker"><img src="${s.image_base64}" /></div>`,
        iconSize: [52, 52],
        iconAnchor: [26, 52],
        popupAnchor: [0, -56],
    });
    L.marker([s.latitude, s.longitude], { icon }).addTo(map)
        .bindPopup(`
        <div class="popup-inner">
          <img class="popup-img" src="${s.image_base64}" />
          <div class="popup-body">
            <div class="popup-score">${s.final_score} / 100</div>
            <div class="popup-label">${s.label}</div>
            ${s.location_name ? `<div class="popup-loc">📍 ${s.location_name}</div>` : ''}
          </div>
        </div>
      `);
}

// ── LOAD EXISTING ────────────────────────────────────────────────────────
async function loadSunsets() {
    try {
        const res = await fetch(`${API}/sunsets`);
        const list = await res.json();
        list.forEach(addMarker);
    } catch (e) { console.warn('Sin atardeceres guardados aún'); }
}

loadSunsets();