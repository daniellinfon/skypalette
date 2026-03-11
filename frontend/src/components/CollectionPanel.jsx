import React, { useState } from 'react';
import Lightbox from './Lightbox';

const styles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .photo-card {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    cursor: pointer;
    border-radius: 4px;
    background: #1a1a24;
  }
  .photo-card img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.35s ease;
  }
  .photo-card:hover img {
    transform: scale(1.06);
  }
  .photo-card .overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%);
    opacity: 0;
    transition: opacity 0.25s;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 10px;
  }
  .photo-card:hover .overlay {
    opacity: 1;
  }
  .delete-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    background: rgba(255,61,110,0.85);
    border: none;
    border-radius: 6px;
    color: #fff;
    width: 28px;
    height: 28px;
    cursor: pointer;
    font-size: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s;
  }
  .photo-card:hover .delete-btn {
    opacity: 1;
  }
  @media (max-width: 768px) {
    .collection-grid {
      grid-template-columns: repeat(3, 1fr) !important;
    }
    .collection-header {
      padding: 16px 16px 12px !important;
    }
  }
`;

export default function CollectionPanel({ sunsets, onClose, onDelete }) {
  const [lightbox, setLightbox] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [filter, setFilter]     = useState('all'); // 'all' | 'top' | 'recent'

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('¿Eliminar este atardecer?')) return;
    setDeleting(id);
    try {
      const res = await fetch(`http://127.0.0.1:8000/sunsets/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      onDelete(id);
    } catch {
      alert('Error al eliminar');
    } finally {
      setDeleting(null);
    }
  };

  const filtered = [...sunsets]
    .filter(s => filter === 'top' ? s.final_score >= 80 : true)
    .sort((a, b) => {
      if (filter === 'top') return b.final_score - a.final_score;
      return 0; // recent → orden natural (ya vienen del backend desc)
    })
    .reverse();

  return (
    <>
      <style>{styles}</style>

      {/* Pantalla completa */}
      <div style={{
        position:   'fixed',
        inset:      0,
        background: '#0a0a0f',
        zIndex:     3000,
        display:    'flex',
        flexDirection: 'column',
        animation:  'fadeIn 0.25s ease',
      }}>

        {/* Header */}
        <div className="collection-header" style={{
          padding:        '20px 28px 16px',
          borderBottom:   '1px solid rgba(255,255,255,0.07)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          flexShrink:     0,
          background:     '#0a0a0f',
          position:       'sticky',
          top:            0,
          zIndex:         1,
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
                {sunsets.length} atardeceres
              </p>
            </div>
          </div>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { key: 'all',    label: 'Todos' },
              { key: 'top',    label: '⭐ Top' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setFilter(key)} style={{
                background:   filter === key ? 'linear-gradient(135deg, #ff6b2b, #ff3d6e)' : 'rgba(255,255,255,0.05)',
                border:       filter === key ? 'none' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px', color: '#f0ece6',
                padding:      '6px 14px', fontSize: '0.8rem',
                cursor:       'pointer', fontFamily: 'inherit',
                transition:   'all 0.2s',
              }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: 'rgba(240,236,230,0.3)', animation: 'fadeSlideUp 0.3s ease' }}>
              <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🌅</div>
              <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.1rem' }}>
                {filter === 'top' ? 'No hay atardeceres con score ≥ 80' : 'Aún no hay atardeceres guardados'}
              </p>
            </div>
          ) : (
            <div
              className="collection-grid"
              style={{
                display:             'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap:                 '4px',
                animation:           'fadeSlideUp 0.3s ease',
              }}
            >
              {filtered.map((sunset) => {
                const imgSrc = sunset.image_base64?.startsWith('data:image')
                  ? sunset.image_base64
                  : `data:image/jpeg;base64,${sunset.image_base64}`;

                const scoreColor = sunset.final_score >= 80 ? '#ff6b2b' : sunset.final_score >= 50 ? '#ffb347' : '#aaa';

                return (
                  <div
                    key={sunset.id}
                    className="photo-card"
                    onClick={() => setLightbox({
                      image: sunset.image_base64,
                      title: sunset.location_name,
                      score: sunset.final_score,
                      label: sunset.label,
                    })}
                  >
                    <img src={imgSrc} alt="" onError={(e) => { e.target.style.display = 'none'; }} />

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

                    <button
                      className="delete-btn"
                      onClick={(e) => handleDelete(sunset.id, e)}
                      disabled={deleting === sunset.id}
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {lightbox && (
        <Lightbox
          image={lightbox.image}
          title={lightbox.title}
          score={lightbox.score}
          label={lightbox.label}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}
