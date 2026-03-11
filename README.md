# 🌅 SkyPalette — Sunset Memories

**Analiza, puntúa y mapea fotografías de atardeceres con Inteligencia Artificial.**

Sube una foto → extrae coordenadas GPS del EXIF → puntúa con un modelo entrenado en PyTorch → analiza su paleta de colores → guarda en base de datos geoespacial → visualiza en un mapa interactivo global.

---

## ✨ Funcionalidades

- 📸 **Análisis por IA** — Modelo ResNet18 con Transfer Learning (94.4% accuracy) que clasifica la calidad del atardecer
- 🎨 **Análisis de color inteligente** — Evalúa la zona del horizonte por separado: saturación, calidez, diversidad cromática, intensidad y contraste cálido-frío
- 🗺️ **Mapa global** — Visualización con marcadores fotográficos y clustering
- ⭐ **Favoritos** — Marca tus mejores capturas
- 🏆 **Ranking** — Top 10 con estadísticas globales
- 🖼️ **Colección** — Galería fotográfica con filtro por favoritos
- 📍 **Buscador de ubicación** — Integración con Nominatim (OpenStreetMap)
- 📱 **Diseño responsive** — Interfaz adaptada a móvil con navegación por tabs

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React + Leaflet + react-leaflet-cluster |
| Backend | Python + FastAPI + SQLAlchemy |
| IA | PyTorch + ResNet18 (Transfer Learning) |
| Base de datos | PostgreSQL + PostGIS |
| Infraestructura | Docker |

---

## 📁 Estructura del proyecto

```
sunset_memories/
├── backend/
│   ├── app/
│   │   ├── main.py            # Endpoints FastAPI
│   │   ├── database.py        # Conexión PostgreSQL
│   │   ├── models.py          # Modelos SQLAlchemy
│   │   └── ml/
│   │       ├── model.py            # Carga del modelo PyTorch
│   │       ├── color_analyzer.py   # Análisis de paleta de colores
│   │       └── skypalette_model_best.pth  # Pesos del modelo entrenado
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── api.js
│       ├── index.css
│       └── components/
│           ├── Sidebar.jsx         # Panel de análisis y subida
│           ├── MapView.jsx         # Mapa interactivo
│           ├── CollectionPanel.jsx # Galería de fotos
│           ├── RankingModal.jsx    # Ranking global
│           └── Lightbox.jsx        # Visor de imagen a pantalla completa
├── docker-compose.yml
└── README.md
```

---

## 🚀 Instalación y uso

### Requisitos previos

- [Docker](https://www.docker.com/) y Docker Compose
- [Node.js](https://nodejs.org/) 18+
- Python 3.10+

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/sunset_memories.git
cd sunset_memories
```

### 2. Arrancar la base de datos

```bash
docker-compose up -d
```

Esto levanta un contenedor PostgreSQL + PostGIS en el puerto `5432`.

### 3. Backend

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate      # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt

uvicorn app.main:app --reload
```

El backend estará disponible en `http://127.0.0.1:8000`.

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

La app estará disponible en `http://localhost:5173`.

---

## 🔌 API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/` | Health check |
| `POST` | `/analyze` | Analiza una imagen y devuelve score + GPS |
| `POST` | `/save` | Guarda un atardecer en la base de datos |
| `GET` | `/sunsets` | Lista todos los atardeceres |
| `GET` | `/stats` | Estadísticas globales y top 10 |
| `PATCH` | `/sunsets/{id}/favorite` | Toggle favorito |
| `DELETE` | `/sunsets/{id}` | Elimina un atardecer |

---

## 🧠 Modelo de IA

El modelo está basado en **ResNet18** con Transfer Learning:

- **Dataset**: imágenes de atardeceres clasificadas manualmente
- **Entrenamiento**: 20 épocas en GPU T4
- **Mejor validación**: 94.4% accuracy (época 15)
- **Score final**: `(Score IA × 0.65) + (Score Color × 0.35)`

### Criterios del análisis de color

El analizador evalúa exclusivamente la **franja del horizonte** (25%–70% de altura de la imagen), evitando que el cielo gris o el suelo penalicen el resultado:

| Criterio | Peso | Descripción |
|----------|------|-------------|
| Saturación | 20% | Intensidad del color en píxeles cálidos |
| Calidez | 35% | Cobertura de tonos naranja/rojo/dorado ponderada por brillo |
| Diversidad | 20% | Variedad cromática en el horizonte |
| Horizonte | 25% | Intensidad visual de la franja clave |
| Bonus contraste | +10 | Premio por convivencia de cálidos + fríos (naranja + azul) |

---

## 🐳 Docker Compose

```yaml
services:
  db:
    image: postgis/postgis:15-3.3
    container_name: skypalette_db
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: superpassword
      POSTGRES_DB: skypalette
    ports:
      - "5432:5432"
```

---

## 📱 Capturas de pantalla

> Panel de análisis · Mapa con clusters · Colección · Ranking

---

## 📄 Licencia

MIT License — libre para uso personal y comercial.
