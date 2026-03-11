import React, { useEffect } from 'react';

export default function Lightbox({ image, title, score, label, onClose }) {
  // Cerrar con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const imgSrc = image?.startsWith('data:image')
    ? image
    : `data:image/jpeg;base64,${image}`;

  return (
    <div
      onClick={onClose}
      style={{
        position:       'fixed',
        inset:          0,
        background:     'rgba(0,0,0,0.92)',
        zIndex:         9999,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '20px',
        backdropFilter: 'blur(6px)',
        animation:      'fadeIn 0.2s ease',
      }}
    >
      {/* Botón cerrar */}
      <button
        onClick={onClose}
        style={{
          position:   'absolute',
          top:        '20px',
          right:      '20px',
          background: 'rgba(255,255,255,0.1)',
          border:     'none',
          borderRadius: '50%',
          width:      '40px',
          height:     '40px',
          color:      '#fff',
          fontSize:   '1.2rem',
          cursor:     'pointer',
          display:    'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ✕
      </button>

      {/* Foto */}
      <img
        src={imgSrc}
        alt={title}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth:     '90vw',
          maxHeight:    '75vh',
          borderRadius: '16px',
          objectFit:    'contain',
          boxShadow:    '0 24px 80px rgba(0,0,0,0.8)',
        }}
      />

      {/* Info debajo */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ marginTop: '20px', textAlign: 'center', color: '#f0ece6' }}
      >
        {title && (
          <p style={{ margin: '0 0 6px', fontSize: '1rem', color: '#ff6b2b', fontWeight: 600 }}>
            📍 {title}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <span style={{
            fontFamily: 'Playfair Display, serif',
            fontSize:   '2rem',
            background: 'linear-gradient(135deg, #ffb347, #ff6b2b)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {score}
          </span>
          <span style={{ fontSize: '0.85rem', color: 'rgba(240,236,230,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {label}
          </span>
        </div>
      </div>

      <p style={{ marginTop: '16px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)' }}>
        ESC o click fuera para cerrar
      </p>
    </div>
  );
}
