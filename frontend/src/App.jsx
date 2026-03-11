import React, { useState, useEffect } from 'react';
import MapView from './components/MapView';
import Sidebar from './components/Sidebar';
import RankingModal from './components/RankingModal';
import CollectionPanel from './components/CollectionPanel';
import './index.css';

function App() {
  const [pickedCoords, setPickedCoords]     = useState(null);
  const [sunsets, setSunsets]               = useState([]);
  const [showRanking, setShowRanking]       = useState(false);
  const [showCollection, setShowCollection] = useState(false);
  const [mobileTab, setMobileTab]           = useState('panel');

  useEffect(() => {
    fetch('http://127.0.0.1:8000/sunsets')
      .then(res => res.json())
      .then(data => setSunsets(data))
      .catch(err => console.error("Error cargando BD:", err));
  }, []);

  const handleSunsetSaved = (newSunset) => {
    setSunsets(prev => [...prev, newSunset]);
    setMobileTab('map');
  };

  const handlePickedCoords = (coords) => {
    setPickedCoords(coords);
    if (coords && window.innerWidth <= 768) setMobileTab('panel');
  };

  // Callbacks para el mapa (que no recibe setSunsets directamente)
  const handleDelete          = (id)           => setSunsets(prev => prev.filter(s => s.id !== id));
  const handleFavoriteToggle  = (id, isFav)    => setSunsets(prev => prev.map(s => s.id === id ? { ...s, is_favorite: isFav } : s));

  return (
    <div className="app">
      <header>
        <div className="logo">Sunset Memories</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

          <button
            onClick={() => setShowCollection(true)}
            style={{
              background: 'linear-gradient(135deg, #ff6b2b, #ff3d6e)', border: 'none',
              borderRadius: '8px', color: '#f0ece6', padding: '7px 14px', fontSize: '0.85rem',
              cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'background 0.2s',
            }}
            
          >
            🖼️ <span className="ranking-label">Colección</span>
          </button>

          <button
            onClick={() => setShowRanking(true)}
            style={{
              background: 'linear-gradient(135deg, #ff6b2b, #ff3d6e)', border: 'none',
              borderRadius: '8px', color: '#fff', padding: '7px 14px', fontSize: '0.85rem',
              fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            🏆 <span className="ranking-label">Ranking</span>
          </button>
        </div>
      </header>

      <div className={`panel-wrapper ${mobileTab === 'panel' ? 'mobile-active' : ''}`}>
        <Sidebar
          pickedCoords={pickedCoords}
          setPickedCoords={setPickedCoords}
          onSunsetSaved={handleSunsetSaved}
        />
      </div>

      <div className={`map-wrapper ${mobileTab === 'map' ? 'mobile-active' : ''}`}>
        <MapView
          pickedCoords={pickedCoords}
          setPickedCoords={handlePickedCoords}
          sunsets={sunsets}
          mobileTab={mobileTab}
          onDelete={handleDelete}
          onFavoriteToggle={handleFavoriteToggle}
        />
      </div>

      <nav className="mobile-tabs">
        <button className={`mobile-tab ${mobileTab === 'panel' ? 'active' : ''}`} onClick={() => setMobileTab('panel')}>
          <span className="tab-icon">📤</span>Subir
        </button>
        <button className={`mobile-tab ${mobileTab === 'map' ? 'active' : ''}`} onClick={() => setMobileTab('map')}>
          <span className="tab-icon">🗺️</span>Mapa
        </button>
        <button className="mobile-tab" onClick={() => setShowCollection(true)}>
          <span className="tab-icon">🖼️</span>Fotos
        </button>
        <button className="mobile-tab" onClick={() => setShowRanking(true)}>
          <span className="tab-icon">🏆</span>Ranking
        </button>
      </nav>

      {showRanking && (
        <RankingModal
          sunsets={sunsets}
          setSunsets={setSunsets}
          onClose={() => setShowRanking(false)}
        />
      )}

      {showCollection && (
        <CollectionPanel
          sunsets={sunsets}
          setSunsets={setSunsets}
          onClose={() => setShowCollection(false)}
        />
      )}
    </div>
  );
}

export default App;
