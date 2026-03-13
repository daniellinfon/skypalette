"""
main.py
-------
Punto de entrada de la API REST de SkyPalette.
Define todos los endpoints FastAPI y orquesta los módulos de IA,
análisis de color, extracción EXIF y base de datos.
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from PIL import Image
import io
import base64

# Módulos de Machine Learning
from app.ml.model import predict_ai_score
from app.ml.color_analyzer import analyze_colors, compute_color_score, get_label
from app.ml.exif_extractor import extract_gps

# Módulos de Base de Datos
from app.database import engine, Base, get_db
from app.models import Atardecer
from app import models
from app import schemas

# Crea las tablas en PostgreSQL si no existen todavía
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="SkyPalette API", version="1.0")

# Permite peticiones desde el frontend React (cualquier origen en desarrollo)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    """Health check — confirma que la API está activa."""
    return {"message": "🌅 SkyPalette API funcionando"}


@app.post("/analyze")
async def analyze_sunset(file: UploadFile = File(...)):
    """
    Endpoint principal de análisis. Recibe una imagen y devuelve:
      - Puntuación final combinada (IA + color)
      - Label descriptivo ("Espectacular", "Muy bueno", etc.)
      - Score individual de IA y de color
      - Desglose de criterios de color
      - Imagen en base64 para mostrar en el frontend
      - Coordenadas GPS si la imagen las lleva en el EXIF

    Flujo:
      1. Valida que el archivo sea una imagen
      2. Extrae GPS del EXIF (si existe)
      3. Pasa la imagen al modelo ResNet18 → ai_score
      4. Analiza la paleta de colores del horizonte → color_score
      5. Combina: final_score = (ai * 0.55) + (color * 0.45)
      6. Codifica la imagen en base64 para devolverla al frontend
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")

    contents = await file.read()
    image = Image.open(io.BytesIO(contents))

    # Extraer GPS del EXIF antes de cualquier transformación de la imagen
    gps_data = extract_gps(image)

    # Puntuación del modelo de IA (ResNet18 con Transfer Learning)
    ai_score = predict_ai_score(image)

    # Análisis de la paleta de colores en la franja del horizonte
    colors = analyze_colors(image)
    color_score = compute_color_score(colors)

    # Score final ponderado (los pesos los ajustó el usuario)
    final_score = round((ai_score * 0.55) + (color_score * 0.45), 1)
    label = get_label(final_score)

    # Convertir imagen a base64 para enviarla al frontend sin guardar en disco
    buffer = io.BytesIO()
    image.convert("RGB").save(buffer, format="JPEG")
    img_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return {
        "final_score":  final_score,
        "label":        label,
        "ai_score":     ai_score,
        "color_score":  color_score,
        "color_detail": colors,
        "image_base64": f"data:image/jpeg;base64,{img_base64}",
        # GPS: has_gps True + coordenadas si venían en el EXIF, False + None si no
        "has_gps":      gps_data["has_gps"],
        "latitude":     gps_data["latitude"],
        "longitude":    gps_data["longitude"],
    }


@app.post("/save")
def save_sunset(sunset: schemas.AtardecerCreate, db: Session = Depends(get_db)):
    """
    Guarda un atardecer analizado en la base de datos PostgreSQL.
    Recibe el objeto validado por Pydantic (schemas.AtardecerCreate)
    con las coordenadas, score, label e imagen en base64.
    """
    db_sunset = models.Atardecer(
        latitude=sunset.latitude,
        longitude=sunset.longitude,
        location_name=sunset.location_name,
        final_score=sunset.final_score,
        label=sunset.label,
        image_base64=sunset.image_base64
    )
    db.add(db_sunset)
    db.commit()
    db.refresh(db_sunset)

    return {"message": "Atardecer guardado con éxito", "id": db_sunset.id}


@app.get("/sunsets")
def get_sunsets(db: Session = Depends(get_db)):
    """
    Devuelve todos los atardeceres guardados ordenados del más reciente al más antiguo.
    Solo incluye los que tienen coordenadas válidas (necesarias para el mapa).
    """
    sunsets = db.query(Atardecer).order_by(Atardecer.id.desc()).all()
    return [
        {
            "id":            s.id,
            "filename":      s.filename if hasattr(s, 'filename') else '',
            "final_score":   s.final_score,
            "label":         s.label,
            "latitude":      s.latitude,
            "longitude":     s.longitude,
            "location_name": s.location_name,
            "image_base64":  s.image_base64,
            "is_favorite":   s.is_favorite or False,
        }
        for s in sunsets if s.latitude and s.longitude
    ]


@app.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    """
    Devuelve estadísticas globales de la colección:
      - total: número de atardeceres guardados
      - avg_score: media de puntuaciones
      - best / worst: mejor y peor score
      - ranking: top 10 ordenado por score descendente
    """
    atardeceres = db.query(Atardecer).order_by(Atardecer.final_score.desc()).all()

    if not atardeceres:
        return {"total": 0, "avg_score": 0, "best": None, "worst": None, "ranking": []}

    scores = [a.final_score for a in atardeceres]

    ranking = [
        {
            "id":            a.id,
            "final_score":   a.final_score,
            "label":         a.label,
            "location_name": a.location_name,
            "image_base64":  a.image_base64,
            "is_favorite":   a.is_favorite or False,  # necesario para el botón del ranking
        }
        for a in atardeceres[:10]
    ]

    return {
        "total":     len(atardeceres),
        "avg_score": round(sum(scores) / len(scores), 1),
        "best":      max(scores),
        "worst":     min(scores),
        "ranking":   ranking,
    }


@app.delete("/sunsets/{sunset_id}")
def delete_sunset(sunset_id: int, db: Session = Depends(get_db)):
    """
    Elimina un atardecer por su ID.
    Devuelve 404 si no existe.
    """
    atardecer = db.query(Atardecer).filter(Atardecer.id == sunset_id).first()
    if not atardecer:
        raise HTTPException(status_code=404, detail="No encontrado")
    db.delete(atardecer)
    db.commit()
    return {"message": "✅ Eliminado"}


@app.patch("/sunsets/{sunset_id}/favorite")
def toggle_favorite(sunset_id: int, db: Session = Depends(get_db)):
    """
    Alterna el estado de favorito de un atardecer (True → False → True...).
    Devuelve el nuevo estado para que el frontend lo refleje sin recargar.
    """
    atardecer = db.query(Atardecer).filter(Atardecer.id == sunset_id).first()
    if not atardecer:
        raise HTTPException(status_code=404, detail="No encontrado")
    atardecer.is_favorite = not atardecer.is_favorite
    db.commit()
    return {"id": atardecer.id, "is_favorite": atardecer.is_favorite}
