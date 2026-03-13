/**
 * Lightbox.jsx
 * ------------
 * Visor de imagen a pantalla completa con información del atardecer.
 * Se monta sobre cualquier componente gracias a position:fixed + zIndex:9999.
 *
 * Props:
 *   image   — base64 de la imagen (con o sin prefijo data:image)
 *   title   — nombre de la ubicación
 *   score   — puntuación final del atardecer
 *   label   — etiqueta del análisis (ESPECTACULAR, MUY BUENO, etc.)
 *   onClose — callback para cerrar el visor
 *
 * Cierre:
 *   - Tecla Escape
 *   - Click en el fondo oscuro (fuera de la imagen)
 *   - Botón ✕ de la esquina superior derecha
 */

import React, { useEffect } from 'react';

export default function Lightbox({ image, title, score, label, onClose }) {

  /** Registra el listener de teclado al montar y lo limpia al desmontar. */
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Normaliza el src de la imagen aceptando base64 con y sin prefijo
  const imgSrc = image?.startsWith('data:image')
    ? image
    : `data:image/jpeg;base64,${image}`;

  return (
    // Fondo oscuro — click aquí cierra el lightbox
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
      {/* Botón cerrar — esquina superior derecha */}
      <button
        onClick={onClose}
        style={{
          position:       'absolute',
          top:            '20px',
          right:          '20px',
          background:     'rgba(255,255,255,0.1)',
          border:         'none',
          borderRadius:   '50%',
          width:          '40px',
          height:         '40px',
          color:          '#fff',
          fontSize:       '1.2rem',
          cursor:         'pointer',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
        }}
      >
        ✕
      </button>

      {/* Imagen a máximo tamaño disponible — stopPropagation evita cerrar al hacer click en la foto */}
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

      {/* Info debajo de la imagen — stopPropagation igual que la foto */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ marginTop: '20px', textAlign: 'center', color: '#f0ece6' }}
      >
        {title && (
          <p style={{ margin: '0 0 6px', fontSize: '1rem', color: '#ff6b2b', fontWeight: 600 }}>
            📍 {title}
          </p>
        )}
        {/* Score con degradado y label */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <span style={{
            fontFamily:           'Playfair Display, serif',
            fontSize:             '2rem',
            background:           'linear-gradient(135deg, #ffb347, #ff6b2b)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor:  'transparent',
          }}>
            {score}
          </span>
          <span style={{ fontSize: '0.85rem', color: 'rgba(240,236,230,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {label}
          </span>
        </div>
      </div>

      {/* Hint de cierre */}
      <p style={{ marginTop: '16px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)' }}>
        ESC o click fuera para cerrar
      </p>
    </div>
  );
}
