import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import Lightbox from './Lightbox';
import { deleteSunset, toggleFavorite } from '../api';

function MapClickHandler({ setPickedCoords }) {
  useMapEvents({
    click: (e) => setPickedCoords({ lat: e.latlng.lat, lng: e.latlng.lng }),
  });
  return null;
}

function MapResizer({ mobileTab }) {
  const map = useMap();
  useEffect(() => {
    if (mobileTab === 'map') setTimeout(() => map.invalidateSize(), 50);
  }, [mobileTab, map]);
  return null;
}

function createPhotoIcon(imageBase64, isFavorite) {
  const imgSrc = imageBase64?.startsWith('data:image')
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;

  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:52px; height:52px;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        border:3px solid ${isFavorite ? '#ffb347' : '#fff'};
        overflow:hidden;
        box-shadow:0 4px 20px rgba(0,0,0,0.6);
        cursor:pointer;
        background:#ff6b2b;
      ">
        <img src="${imgSrc}"
          style="width:100%;height:100%;object-fit:cover;transform:rotate(45deg) scale(1.4);"
          onerror="this.style.display='none'"
        />
      </div>
      ${isFavorite ? '<div style="position:absolute;top:-4px;right:-4px;font-size:14px;transform:rotate(45deg)">⭐</div>' : ''}
    `,
    iconSize:    [52, 52],
    iconAnchor:  [26, 52],
    popupAnchor: [0, -56],
  });
}

function createClusterIcon(cluster) {
  const count = cluster.getChildCount();
  let bg, size;
  if      (count < 5)  { bg = '#ff6b2b'; size = 44; }
  else if (count < 15) { bg = '#ff3d6e'; size = 52; }
  else                 { bg = '#c0392b'; size = 60; }

  return L.divIcon({
    className: '',
    html: `
      <div style="width:${size}px;height:${size}px;background:${bg};border:3px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,0.5);cursor:pointer;">
        <span style="color:#fff;font-weight:700;font-size:${count>99?'0.7rem':'0.9rem'};font-family:sans-serif;">${count}</span>
      </div>
    `,
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function SunsetPopup({ sunset, onLightbox, onDelete, onFavoriteToggle }) {
  const [deleting,    setDeleting]    = useState(false);
  const [deleted,     setDeleted]     = useState(false);
  const [favorite,    setFavorite]    = useState(sunset.is_favorite || false);
  const [toggling,    setToggling]    = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('¿Eliminar este atardecer?')) return;
    setDeleting(true);
    try {
      await deleteSunset(sunset.id);
      setDeleted(true);
      onDelete(sunset.id);
    } catch {
      alert('Error al eliminar');
      setDeleting(false);
    }
  };

  const handleFavorite = async () => {
    setToggling(true);
    try {
      const res = await toggleFavorite(sunset.id);
      setFavorite(res.is_favorite);
      onFavoriteToggle(sunset.id, res.is_favorite);
    } catch {
      alert('Error al actualizar favorito');
    } finally {
      setToggling(false);
    }
  };

  if (deleted) return (
    <div style={{ padding: '16px', textAlign: 'center', color: '#666', fontFamily: 'sans-serif', fontSize: '0.85rem' }}>
      🗑️ Eliminado
    </div>
  );

  return (
    <div style={{ overflow: 'hidden', fontFamily: 'sans-serif' }}>
      <img
        src={sunset.image_base64?.startsWith('data:image') ? sunset.image_base64 : `data:image/jpeg;base64,${sunset.image_base64}`}
        alt="sunset"
        onClick={onLightbox}
        onError={(e) => { e.target.style.display = 'none'; }}
        style={{ width: '100%', height: '130px', objectFit: 'cover', display: 'block', cursor: 'zoom-in', transition: 'opacity 0.2s' }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
      />
      <div style={{ padding: '10px 14px 12px' }}>
        {sunset.location_name && (
          <p style={{ margin: '0 0 4px', fontSize: '0.95rem', color: '#ff6b2b', fontWeight: 600 }}>
            {sunset.location_name}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.8rem', color: '#ffb347' }}>
              {sunset.final_score} / 100
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase' }}>
              {sunset.label}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {/* Favorito */}
            <ActionBtn
              onClick={handleFavorite}
              disabled={toggling}
              active={favorite}
              activeColor="rgba(255,179,71,0.25)"
              activeBorder="rgba(255,179,71,0.5)"
              activeText="#ffb347"
              inactiveColor="rgba(255,179,71,0.08)"
              inactiveBorder="rgba(255,179,71,0.2)"
              inactiveText="#ffb347"
              title={favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
            >
              {favorite ? '⭐' : '☆'}
            </ActionBtn>
            {/* Eliminar */}
            <ActionBtn
              onClick={handleDelete}
              disabled={deleting}
              activeColor="rgba(255,61,110,0.1)"
              activeBorder="rgba(255,61,110,0.3)"
              activeText="#ff3d6e"
              inactiveColor="rgba(255,61,110,0.1)"
              inactiveBorder="rgba(255,61,110,0.3)"
              inactiveText="#ff3d6e"
              title="Eliminar"
            >
              🗑️
            </ActionBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ onClick, disabled, active, activeColor, activeBorder, activeText, inactiveColor, inactiveBorder, inactiveText, title, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        background:     active ? activeColor : inactiveColor,
        border:         `1px solid ${active ? activeBorder : inactiveBorder}`,
        borderRadius:   '8px',
        color:          active ? activeText : inactiveText,
        width:          '34px',
        height:         '34px',
        cursor:         disabled ? 'not-allowed' : 'pointer',
        fontSize:       '0.95rem',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        opacity:        disabled ? 0.5 : 1,
        transition:     'background 0.2s, transform 0.15s',
        flexShrink:     0,
      }}
    >
      {children}
    </button>
  );
}

export default function MapView({ pickedCoords, setPickedCoords, sunsets, mobileTab, onDelete, onFavoriteToggle }) {
  const [lightbox, setLightbox] = useState(null);

  return (
    <>
      <MapContainer
        id="map"
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        maxZoom={18}
        maxBounds={[[-90, -180], [90, 180]]}
        maxBoundsViscosity={1.0}
        zoomControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          
        />
        <MapResizer mobileTab={mobileTab} />
        <MapClickHandler setPickedCoords={setPickedCoords} />

        {pickedCoords && (
          <CircleMarker
            center={[pickedCoords.lat, pickedCoords.lng]}
            pathOptions={{ color: '#ff6b2b', fillColor: '#ff6b2b', fillOpacity: 0.8 }}
            radius={10}
          />
        )}

        <MarkerClusterGroup
          iconCreateFunction={createClusterIcon}
          maxClusterRadius={60}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          zoomToBoundsOnClick={true}
          animate={true}
        >
          {sunsets.map((sunset) => (
            <Marker
              key={sunset.id}
              position={[sunset.latitude, sunset.longitude]}
              icon={createPhotoIcon(sunset.image_base64, sunset.is_favorite)}
            >
              <Popup minWidth={210}>
                <SunsetPopup
                  sunset={sunset}
                  onLightbox={() => setLightbox({ image: sunset.image_base64, title: sunset.location_name, score: sunset.final_score, label: sunset.label })}
                  onDelete={onDelete}
                  onFavoriteToggle={onFavoriteToggle}
                />
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>

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
