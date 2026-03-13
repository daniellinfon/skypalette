/**
 * CollectionPanel.jsx
 * -------------------
 * Galería de todos los atardeceres a pantalla completa.
 * Permite filtrar por favoritos, eliminar fotos y abrir el Lightbox.
 *
 * Props:
 *   sunsets    — lista de atardeceres del estado global de App
 *   setSunsets — setter directo para sincronizar borrados y favoritos
 *   onClose    — callback para cerrar el panel
 */

import React, { useState } from 'react';
import Lightbox from './Lightbox';
import { deleteSunset, toggleFavorite } from '../api';

const styles = `
  @keyframes fadeIn {
    from { opacity: 0; } to { opacity: 1; }
  }
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Tarjeta de foto cuadrada */
  .photo-card {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    cursor: pointer;
    border-radius: 4px;
    background: #1a1a24;
  }
  .photo-card img {
    width: 100%; height: 100%;
    object-fit: cover; display: block;
    transition: transform 0.35s ease;
  }
  /* Zoom suave al hacer hover */
  .photo-card:hover img { transform: scale(1.06); }

  /* Overlay con degradado y score — aparece al hacer hover */
  .photo-card .overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 55%);
    opacity: 0; transition: opacity 0.25s;
    display: flex; flex-direction: column;
    justify-content: flex-end; padding: 8px;
    z-index: 1;
  }
  .photo-card:hover .overlay { opacity: 1; }

  /* Botones de acción (⭐ y 🗑️) — encima del overlay (z-index 2) */
  .card-actions {
    position: absolute; top: 6px; right: 6px;
    display: flex; gap: 4px;
    opacity: 0; transition: opacity 0.2s;
    z-index: 2;
  }
  .photo-card:hover .card-actions { opacity: 1; }

  .card-btn {
    width: 30px; height: 30px;
    border: none; border-radius: 6px;
    cursor: pointer; font-size: 0.8rem;
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.15s;
  }
  .card-btn:hover { transform: scale(1.12); }

  /* Estrella de favorito siempre visible en la esquina superior izquierda */
  .fav-star {
    position: absolute; top: 6px; left: 6px;
    font-size: 1rem; z-index: 2;
    filter: drop-shadow(0 1px 3px rgba(0,0,0,0.8));
    pointer-events: none;
  }

  /* En móvil: 3 columnas y botones siempre visibles */
  @media (max-width: 768px) {
    .collection-grid { grid-template-columns: repeat(3, 1fr) !important; }
    .collection-header { padding: 14px 16px 12px !important; }
    .card-actions { opacity: 1 !important; }
  }
`;

export default function CollectionPanel({ sunsets, setSunsets, onClose }) {
  const [lightbox, setLightbox] = useState(null);
  const [filter,   setFilter]   = useState('all'); // 'all' | 'favorites'

  /**
   * Elimina un atardecer llamando a la API y actualizando el estado global.
   * stopPropagation evita que el click llegue a la tarjeta y abra el Lightbox.
   */
  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('¿Eliminar este atardecer?')) return;
    try {
      await deleteSunset(id);
      setSunsets(prev => prev.filter(s => s.id !== id));
    } catch {
      alert('Error al eliminar');
    }
  };

  /**
   * Alterna el favorito de un atardecer y actualiza el estado global.
   * stopPropagation evita que el click llegue a la tarjeta y abra el Lightbox.
   */
  const handleFavorite = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await toggleFavorite(id);
      setSunsets(prev => prev.map(s => s.id === id ? { ...s, is_favorite: res.is_favorite } : s));
    } catch {
      alert('Error al actualizar favorito');
    }
  };

  // Filtra y ordena (más recientes primero via .reverse())
  const filtered = [...sunsets]
    .filter(s => filter === 'favorites' ? s.is_favorite : true)
    .reverse();

  const favCount = sunsets.filter(s => s.is_favorite).length;

  return (
    <>
      <style>{styles}</style>

      <div style={{
        position: 'fixed', inset: 0,
        background: '#0a0a0f', zIndex: 3000,
        display: 'flex', flexDirection: 'column',
        animation: 'fadeIn 0.25s ease',
      }}>

        {/* ── Header fijo con título, contador y filtros ── */}
        <div className="collection-header" style={{
          padding: '20px 28px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, background: '#0a0a0f',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Botón volver */}
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px', color: '#f0ece6', padding: '7px 12px',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              ← Volver
            </button>
            <div>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', margin: 0, background: 'linear-gradient(135deg, #ffb347, #ff6b2b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                🌅 Mi Colección
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'rgba(240,236,230,0.35)', margin: '2px 0 0' }}>
                {sunsets.length} atardeceres · {favCount} favoritos
              </p>
            </div>
          </div>

          {/* Filtros Todos / Favoritos */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {[{ key: 'all', label: 'Todos' }, { key: 'favorites', label: '⭐ Favoritos' }].map(({ key, label }) => (
              <button key={key} onClick={() => setFilter(key)} style={{
                background:   filter === key ? 'linear-gradient(135deg, #ff6b2b, #ff3d6e)' : 'rgba(255,255,255,0.05)',
                border:       filter === key ? 'none' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px', color: '#f0ece6',
                padding: '6px 14px', fontSize: '0.8rem',
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
              }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Grid de fotos ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {filtered.length === 0 ? (
            // Estado vacío — mensaje diferente según el filtro activo
            <div style={{ textAlign: 'center', padding: '80px 20px', color: 'rgba(240,236,230,0.3)', animation: 'fadeSlideUp 0.3s ease' }}>
              <div style={{ fontSize: '4rem', marginBottom: '16px' }}>{filter === 'favorites' ? '⭐' : '🌅'}</div>
              <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.1rem' }}>
                {filter === 'favorites' ? 'No tienes favoritos aún' : 'Aún no hay atardeceres guardados'}
              </p>
            </div>
          ) : (
            // 4 columnas en desktop, 3 en móvil (ver CSS arriba)
            <div className="collection-grid" style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '4px', animation: 'fadeSlideUp 0.3s ease',
            }}>
              {filtered.map((sunset) => {
                const imgSrc = sunset.image_base64?.startsWith('data:image')
                  ? sunset.image_base64
                  : `data:image/jpeg;base64,${sunset.image_base64}`;
                // Color del score según rango
                const scoreColor = sunset.final_score >= 80 ? '#ff6b2b' : sunset.final_score >= 50 ? '#ffb347' : '#aaa';

                return (
                  <div
                    key={sunset.id}
                    className="photo-card"
                    onClick={() => setLightbox({ image: sunset.image_base64, title: sunset.location_name, score: sunset.final_score, label: sunset.label })}
                  >
                    <img src={imgSrc} alt="" onError={(e) => { e.target.style.display = 'none'; }} />

                    {/* Estrella de favorito — siempre visible si es favorito */}
                    {sunset.is_favorite && <div className="fav-star">⭐</div>}

                    {/* Botones de acción — z-index 2, encima del overlay */}
                    <div className="card-actions">
                      <button
                        className="card-btn"
                        onClick={(e) => handleFavorite(sunset.id, e)}
                        title={sunset.is_favorite ? 'Quitar favorito' : 'Añadir favorito'}
                        style={{ background: sunset.is_favorite ? 'rgba(255,179,71,0.9)' : 'rgba(0,0,0,0.65)', color: '#fff' }}
                      >
                        {sunset.is_favorite ? '⭐' : '☆'}
                      </button>
                      <button
                        className="card-btn"
                        onClick={(e) => handleDelete(sunset.id, e)}
                        title="Eliminar"
                        style={{ background: 'rgba(255,61,110,0.85)', color: '#fff' }}
                      >
                        🗑️
                      </button>
                    </div>

                    {/* Overlay con score y ubicación — aparece al hacer hover */}
                    <div className="overlay">
                      <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.1rem', color: scoreColor, fontWeight: 700, textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                        {sunset.final_score}
                      </span>
                      {sunset.location_name && (
                        <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.65)', margin: '3px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          📍 {sunset.location_name}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox — visor a pantalla completa */}
      {lightbox && (
        <Lightbox
          image={lightbox.image} title={lightbox.title}
          score={lightbox.score} label={lightbox.label}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}
