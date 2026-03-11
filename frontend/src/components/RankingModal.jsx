import React, { useState } from 'react';
import Lightbox from './Lightbox';
import { deleteSunset, toggleFavorite } from '../api';

export default function RankingModal({ sunsets, setSunsets, onClose }) {
  const [lightbox, setLightbox] = useState(null);

  // Calcular stats desde el estado global
  const total     = sunsets.length;
  const avgScore  = total > 0 ? (sunsets.reduce((a, s) => a + s.final_score, 0) / total).toFixed(1) : 0;
  const bestScore = total > 0 ? Math.max(...sunsets.map(s => s.final_score)) : 0;
  const ranking   = [...sunsets].sort((a, b) => b.final_score - a.final_score).slice(0, 10);

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este atardecer?')) return;
    try {
      await deleteSunset(id);
      setSunsets(prev => prev.filter(s => s.id !== id));
    } catch {
      alert('Error al eliminar');
    }
  };

  const handleFavorite = async (id) => {
    try {
      const res = await toggleFavorite(id);
      setSunsets(prev => prev.map(s => s.id === id ? { ...s, is_favorite: res.is_favorite } : s));
    } catch {
      alert('Error al actualizar favorito');
    }
  };

  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose(); };

  return (
    <>
      <div onClick={handleBackdrop} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px', backdropFilter: 'blur(4px)',
      }}>
        <div style={{
          background: '#13131a', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '20px', width: '100%', maxWidth: '620px',
          maxHeight: '85vh', overflowY: 'auto',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}>
          {/* Header */}
          <div style={{
            padding: '24px 28px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            position: 'sticky', top: 0, background: '#13131a',
            borderRadius: '20px 20px 0 0', zIndex: 1,
          }}>
            <div>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.6rem', margin: 0, background: 'linear-gradient(135deg, #ffb347, #ff6b2b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                🏆 Ranking Global
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'rgba(240,236,230,0.45)', margin: '4px 0 0' }}>
                Top atardeceres por puntuación
              </p>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '8px', color: '#f0ece6', width: '32px', height: '32px', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ✕
            </button>
          </div>

          <div style={{ padding: '24px 28px' }}>
            {total === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(240,236,230,0.45)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🌅</div>
                <p>Aún no hay atardeceres guardados</p>
              </div>
            ) : (
              <>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
                  <StatCard label="Total fotos" value={total}     icon="📸" />
                  <StatCard label="Media score" value={avgScore}  icon="📊" />
                  <StatCard label="Mejor score" value={bestScore} icon="⭐" />
                </div>

                <h3 style={{ fontSize: '0.75rem', color: 'rgba(240,236,230,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>
                  Top 10 Atardeceres
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {ranking.map((sunset, index) => (
                    <RankingRow
                      key={sunset.id}
                      sunset={sunset}
                      position={index + 1}
                      onDelete={handleDelete}
                      onFavorite={handleFavorite}
                      onPhotoClick={() => setLightbox({ image: sunset.image_base64, title: sunset.location_name, score: sunset.final_score, label: sunset.label })}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

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

function StatCard({ label, value, icon }) {
  return (
    <div style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
      <div style={{ fontSize: '1.4rem', marginBottom: '6px' }}>{icon}</div>
      <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.6rem', background: 'linear-gradient(135deg, #ffb347, #ff6b2b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: '0.72rem', color: 'rgba(240,236,230,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '4px' }}>
        {label}
      </div>
    </div>
  );
}

function RankingRow({ sunset, position, onDelete, onFavorite, onPhotoClick }) {
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const medal  = medals[position] || `#${position}`;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '12px', padding: '10px 14px', transition: 'border-color 0.2s',
    }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255,107,43,0.3)'}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
    >
      <div style={{ fontSize: '1.2rem', minWidth: '28px', textAlign: 'center' }}>{medal}</div>

      <img
        src={sunset.image_base64?.startsWith('data:image') ? sunset.image_base64 : `data:image/jpeg;base64,${sunset.image_base64}`}
        alt=""
        onClick={onPhotoClick}
        style={{ width: '52px', height: '52px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0, cursor: 'zoom-in', transition: 'transform 0.2s' }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        onError={(e) => { e.target.style.display = 'none'; }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.3rem', background: 'linear-gradient(135deg, #ffb347, #ff6b2b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>
          {sunset.final_score}
        </div>
        <div style={{ fontSize: '0.82rem', color: '#f0ece6', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {sunset.location_name || '📍 Sin ubicación'}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'rgba(240,236,230,0.45)', marginTop: '1px', textTransform: 'uppercase' }}>
          {sunset.label}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        <button onClick={() => onFavorite(sunset.id)} title={sunset.is_favorite ? 'Quitar favorito' : 'Añadir favorito'} style={{
          background: sunset.is_favorite ? 'rgba(255,179,71,0.2)' : 'rgba(255,179,71,0.06)',
          border: `1px solid ${sunset.is_favorite ? 'rgba(255,179,71,0.5)' : 'rgba(255,179,71,0.2)'}`,
          borderRadius: '8px', color: '#ffb347',
          width: '32px', height: '32px', cursor: 'pointer',
          fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}>
          {sunset.is_favorite ? '⭐' : '☆'}
        </button>

        <button onClick={() => onDelete(sunset.id)} title="Eliminar" style={{
          background: 'rgba(255,61,110,0.1)', border: '1px solid rgba(255,61,110,0.2)',
          borderRadius: '8px', color: '#ff3d6e',
          width: '32px', height: '32px', cursor: 'pointer',
          fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s',
        }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,61,110,0.25)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,61,110,0.1)'}
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
