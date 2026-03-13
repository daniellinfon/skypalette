/**
 * Sidebar.jsx
 * -----------
 * Panel lateral izquierdo. Es el componente central de interacción del usuario.
 * Gestiona todo el flujo: subida de imagen → análisis IA → ubicación → guardado.
 *
 * Props:
 *   pickedCoords    — coordenadas seleccionadas en el mapa { lat, lng }
 *   setPickedCoords — actualiza las coordenadas en App (sincroniza mapa y panel)
 *   onSunsetSaved   — callback que se llama tras guardar con éxito
 */

import React, { useState, useRef, useEffect } from 'react';

const styles = `
  @keyframes borderGlow {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .panel-input {
    width: 100%;
    padding: 10px 12px;
    background: rgba(255,255,255,0.04);
    color: #f0ece6;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    font-size: 0.88rem;
    outline: none;
    transition: border-color 0.2s, background 0.2s;
    font-family: inherit;
    box-sizing: border-box;
  }
  .panel-input:focus {
    border-color: rgba(255, 107, 43, 0.5);
    background: rgba(255,255,255,0.07);
  }
  .panel-input::placeholder { color: rgba(240,236,230,0.25); }
  .suggestion-item { transition: background 0.15s; }
  .suggestion-item:hover { background: rgba(255,107,43,0.1) !important; }
  .save-btn {
    width: 100%;
    padding: 13px;
    background: linear-gradient(135deg, #ff6b2b, #ff3d6e);
    border: none;
    border-radius: 12px;
    color: #fff;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    letter-spacing: 0.02em;
    transition: opacity 0.2s, transform 0.15s;
    margin-top: 4px;
  }
  .save-btn:hover { opacity: 0.9; transform: translateY(-1px); }
  .save-btn:active { transform: translateY(0); }
  .save-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
`;

export default function Sidebar({ pickedCoords, setPickedCoords, onSunsetSaved }) {
  // Estado de la imagen seleccionada
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState(null);

  // Estado del análisis
  const [loading, setLoading] = useState(false);
  const [data, setData]       = useState(null);
  const [error, setError]     = useState(null);

  // Estado del formulario de ubicación
  const [locationTitle, setLocationTitle]   = useState('');
  const [latInput, setLatInput]             = useState('');
  const [lngInput, setLngInput]             = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [searching, setSearching]           = useState(false);
  const [suggestions, setSuggestions]       = useState([]);

  // Estado del drag & drop
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef  = useRef(null);
  const searchTimeout = useRef(null);

  /**
   * Sincroniza los inputs de coordenadas cuando el usuario hace click en el mapa.
   * Se dispara cada vez que pickedCoords cambia desde MapView.
   */
  useEffect(() => {
    if (pickedCoords) {
      setLatInput(pickedCoords.lat.toFixed(6));
      setLngInput(pickedCoords.lng.toFixed(6));
    } else {
      setLatInput('');
      setLngInput('');
    }
  }, [pickedCoords]);

  /**
   * Procesa un archivo de imagen seleccionado (por click o drag&drop).
   * Crea una URL temporal para la preview y resetea el estado previo.
   */
  const handleFile = (selectedFile) => {
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setData(null);
    setError(null);
    setLocationTitle('');
    setLocationSearch('');
    setSuggestions([]);
  };

  /** Gestiona el evento de soltar un archivo arrastrado sobre la zona de drop. */
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  /**
   * Envía la imagen al backend para análisis.
   * El backend devuelve: final_score, ai_score, color_score, color_detail,
   * label, image_base64, has_gps, latitude, longitude.
   *
   * Si la imagen tiene GPS en el EXIF, auto-rellena las coordenadas
   * del formulario y actualiza el marcador del mapa directamente.
   */
  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res    = await fetch('http://127.0.0.1:8000/analyze', { method: 'POST', body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.detail || 'Error del servidor');
      setData(result);

      // ── Auto-rellenar GPS si la imagen lo tiene en el EXIF ──────────────
      // El backend devuelve has_gps=true cuando encontró coordenadas válidas
      if (result.has_gps && result.latitude != null && result.longitude != null) {
        setLatInput(result.latitude.toFixed(6));
        setLngInput(result.longitude.toFixed(6));
        setPickedCoords({ lat: result.latitude, lng: result.longitude });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Actualiza las coordenadas cuando el usuario escribe manualmente
   * en los inputs de latitud/longitud.
   * Solo llama a setPickedCoords si ambos valores son válidos
   * para que el marcador del mapa se actualice en tiempo real.
   */
  const handleManualCoordChange = (type, value) => {
    if (type === 'lat') setLatInput(value);
    if (type === 'lng') setLngInput(value);
    const lat = parseFloat(type === 'lat' ? value : latInput);
    const lng = parseFloat(type === 'lng' ? value : lngInput);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      setPickedCoords({ lat, lng });
    } else {
      setPickedCoords(null);
    }
  };

  /**
   * Busca lugares usando la API de Nominatim (OpenStreetMap).
   * Usa debounce de 500ms para no spamear la API con cada tecla.
   * Muestra un máximo de 4 sugerencias.
   */
  const searchLocation = (query) => {
    setLocationSearch(query);
    setSuggestions([]);
    if (query.length < 3) return;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res     = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=4`,
          { headers: { 'Accept-Language': 'es' } }
        );
        const results = await res.json();
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 500);
  };

  /**
   * Selecciona una sugerencia de Nominatim.
   * Actualiza coordenadas, título de ubicación y cierra el dropdown.
   */
  const pickSuggestion = (place) => {
    const lat  = parseFloat(place.lat);
    const lng  = parseFloat(place.lon);
    setPickedCoords({ lat, lng });
    const name = place.display_name.split(',').slice(0, 2).join(',').trim();
    setLocationSearch(name);
    setLocationTitle(name);
    setSuggestions([]);
  };

  /**
   * Guarda el atardecer analizado en la base de datos via POST /save.
   * Construye el payload con todos los datos y llama a onSunsetSaved
   * para que App actualice el estado global y aparezca en el mapa.
   * Resetea el formulario tras el guardado exitoso.
   */
  const saveSunset = async () => {
    if (!data || !pickedCoords) return;
    setLoading(true);
    try {
      const payload = {
        filename:      data.filename || 'unknown',
        final_score:   data.final_score,
        ai_score:      data.ai_score,
        color_score:   data.color_score,
        color_detail:  data.color_detail,
        label:         data.label,
        image_base64:  data.image_base64,
        latitude:      pickedCoords.lat,
        longitude:     pickedCoords.lng,
        location_name: locationTitle.trim() || `Sunset @ ${pickedCoords.lat.toFixed(2)}, ${pickedCoords.lng.toFixed(2)}`,
      };
      const res = await fetch('http://127.0.0.1:8000/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Falló el guardado');
      const savedData = await res.json();

      // Notifica a App con el objeto completo para que aparezca en el mapa
      onSunsetSaved({ id: savedData.id, ...payload });

      // Reset completo del formulario
      setData(null); setPreview(null); setFile(null);
      setLocationTitle(''); setLocationSearch('');
      setLatInput(''); setLngInput('');
      setPickedCoords(null);
    } catch (err) {
      setError('Error al guardar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Score ring (arco SVG animado) ─────────────────────────────────────────
  const score      = data?.final_score ?? 0;
  const radius     = 44;
  const circ       = 2 * Math.PI * radius;
  const dashOffset = circ - (score / 100) * circ;
  const scoreColor = score >= 80 ? '#ff6b2b' : score >= 50 ? '#ffb347' : '#888';

  return (
    <>
      <style>{styles}</style>
      <div className="panel" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── DROP ZONE — visible solo si no hay imagen seleccionada ── */}
        {!preview && (
          <div
            style={{
              margin: '16px',
              borderRadius: '16px',
              border: `2px dashed ${dragOver ? '#ff6b2b' : 'rgba(255,107,43,0.3)'}`,
              background: dragOver ? 'rgba(255,107,43,0.06)' : 'rgba(255,255,255,0.02)',
              padding: '36px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current.click()}
          >
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*"
              onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
            <div style={{ fontSize: '2.6rem', marginBottom: '12px', filter: 'drop-shadow(0 0 16px rgba(255,107,43,0.5))' }}>🌅</div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.1rem', color: '#f0ece6', marginBottom: '6px' }}>
              Sube tu atardecer
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(240,236,230,0.35)', letterSpacing: '0.04em' }}>
              JPG, PNG · arrastra o haz click
            </div>
          </div>
        )}

        {/* ── PREVIEW — miniatura con gradiente y botón "cambiar" ── */}
        {preview && (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img src={preview} alt="preview"
              style={{ width: '100%', height: '190px', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0a0a0f 0%, transparent 55%)', pointerEvents: 'none' }} />
            <button
              onClick={() => { setPreview(null); setFile(null); setData(null); setError(null); }}
              style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#f0ece6', padding: '5px 10px', fontSize: '0.72rem', cursor: 'pointer', backdropFilter: 'blur(4px)' }}
            >
              ✕ cambiar
            </button>
          </div>
        )}

        {/* ── ÁREA DE SCROLL — resultados, formulario, botón guardar ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 20px' }}>

          {/* Mensaje de error */}
          {error && (
            <div style={{ background: 'rgba(255,61,110,0.08)', border: '1px solid rgba(255,61,110,0.2)', borderRadius: '10px', padding: '10px 14px', fontSize: '0.82rem', color: '#ff6b8a', marginTop: '12px' }}>
              ❌ {error}
            </div>
          )}

          {/* Botón analizar — solo cuando hay imagen sin analizar */}
          {preview && !data && !loading && (
            <button className="save-btn" style={{ marginTop: '14px' }} onClick={analyze}>
              Analizar atardecer →
            </button>
          )}

          {/* Spinner mientras la IA procesa */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 0', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', border: '2px solid rgba(255,107,43,0.15)', borderTopColor: '#ff6b2b', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: '0.8rem', color: 'rgba(240,236,230,0.4)', letterSpacing: '0.04em' }}>La IA está pensando...</span>
            </div>
          )}

          {/* ── Resultados del análisis ── */}
          {data && (
            <div style={{ animation: 'fadeSlideUp 0.4s ease' }}>

              {/* Score ring SVG + barras IA/Color */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 0 10px' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7" />
                    <circle cx="50" cy="50" r={radius} fill="none"
                      stroke={scoreColor} strokeWidth="7" strokeLinecap="round"
                      strokeDasharray={circ} strokeDashoffset={dashOffset}
                      style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 8px ${scoreColor}99)` }}
                    />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.55rem', background: `linear-gradient(135deg, #ffb347, ${scoreColor})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>
                      {data.final_score}
                    </span>
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '0.95rem', color: '#f0ece6', marginBottom: '10px' }}>{data.label}</div>
                  <MiniBar label="IA"    value={data.ai_score}    color="#ff6b2b" />
                  <MiniBar label="Color" value={data.color_score} color="#ffb347" />
                </div>
              </div>

              {/* Color chips — desglose de los 4 criterios del color analyzer */}
              {data.color_detail && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '7px', marginBottom: '16px' }}>
                  <ColorChip label="Saturación" value={data.color_detail.sat_score} />
                  <ColorChip label="Calidez"    value={data.color_detail.warm_score} />
                  <ColorChip label="Diversidad" value={data.color_detail.diversity_score} />
                  <ColorChip label="Horizonte"  value={data.color_detail.horizon_score} />
                </div>
              )}

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 0 14px' }} />

              {/* ── Formulario de ubicación ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                <div style={{ fontSize: '0.68rem', color: 'rgba(240,236,230,0.35)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  📍 Ubicación
                  {/* Badge verde si el GPS se detectó automáticamente del EXIF */}
                  {data.has_gps && (
                    <span style={{ marginLeft: '8px', color: '#4caf50', fontSize: '0.65rem', fontWeight: 600 }}>
                      ✓ GPS detectado
                    </span>
                  )}
                </div>

                {/* Título libre */}
                <input className="panel-input" type="text"
                  placeholder="Título"
                  value={locationTitle} onChange={(e) => setLocationTitle(e.target.value)} />

                {/* Buscador Nominatim con autocomplete y debounce */}
                <div style={{ position: 'relative', zIndex: 999 }}>
                  <input className="panel-input" type="text" placeholder="Buscar lugar..."
                    value={locationSearch} onChange={(e) => searchLocation(e.target.value)} />
                  {searching && (
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: 'rgba(240,236,230,0.3)' }}>•••</span>
                  )}
                  {suggestions.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1a26', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', marginTop: '4px', zIndex: 1000, overflow: 'hidden', boxShadow: '0 16px 40px rgba(0,0,0,0.7)' }}>
                      {suggestions.map((place) => (
                        <div key={place.place_id} className="suggestion-item" onClick={() => pickSuggestion(place)}
                          style={{ padding: '9px 13px', fontSize: '0.8rem', color: 'rgba(240,236,230,0.75)', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          📍 {place.display_name.split(',').slice(0, 3).join(',')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Inputs de coordenadas — se rellenan desde el mapa, el GPS o manualmente */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input className="panel-input" type="text" placeholder="Latitud"
                    value={latInput} onChange={(e) => handleManualCoordChange('lat', e.target.value)} />
                  <input className="panel-input" type="text" placeholder="Longitud"
                    value={lngInput} onChange={(e) => handleManualCoordChange('lng', e.target.value)} />
                </div>

                {!pickedCoords ? (
                  <p style={{ fontSize: '0.76rem', color: 'rgba(255,107,43,0.6)', textAlign: 'center', margin: '2px 0' }}>
                    👆 Busca, haz clic en el mapa o escribe coordenadas
                  </p>
                ) : (
                  <button className="save-btn" onClick={saveSunset} disabled={loading}>
                    {loading ? 'Guardando...' : '💾 Guardar Atardecer'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * MiniBar — barra de progreso horizontal para scores de IA y Color.
 * Anima el relleno de izquierda a derecha al montarse.
 */
function MiniBar({ label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
      <span style={{ fontSize: '0.65rem', color: 'rgba(240,236,230,0.35)', width: '40px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <div style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: '2px', transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)', boxShadow: `0 0 6px ${color}66` }} />
      </div>
      <span style={{ fontSize: '0.7rem', color: 'rgba(240,236,230,0.45)', width: '26px', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

/**
 * ColorChip — tarjeta que muestra un criterio del análisis de color.
 * El fondo se hace más intenso cuanto mayor es el valor (feedback visual).
 */
function ColorChip({ label, value }) {
  const v     = value ?? 0;
  const alpha = 0.1 + (v / 100) * 0.45;
  return (
    <div style={{
      background:   `rgba(255, ${90 + Math.round((v / 100) * 90)}, 43, ${alpha})`,
      border:       '1px solid rgba(255,107,43,0.12)',
      borderRadius: '10px',
      padding:      '9px 11px',
    }}>
      <div style={{ fontSize: '0.62rem', color: 'rgba(240,236,230,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '3px' }}>{label}</div>
      <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.15rem', color: '#ffb347', lineHeight: 1 }}>{v}</div>
    </div>
  );
}
