from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from PIL import Image
import io
import base64

# Tus módulos de ML
from app.ml.model import predict_ai_score
from app.ml.color_analyzer import analyze_colors, compute_color_score, get_label

# Módulos de Base de Datos (CORREGIDO)
from app.database import engine, Base, get_db
from app import models
from app import schemas

# Crea las tablas en PostgreSQL si no existen
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="SkyPalette API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "🌅 SkyPalette API funcionando"}

@app.post("/analyze")
async def analyze_sunset(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")

    contents = await file.read()
    image = Image.open(io.BytesIO(contents))

    ai_score = predict_ai_score(image)
    colors = analyze_colors(image)
    color_score = compute_color_score(colors)
    final_score = round((ai_score * 0.65) + (color_score * 0.35), 1)
    label = get_label(final_score)

    buffer = io.BytesIO()
    image.convert("RGB").save(buffer, format="JPEG")
    img_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return {
        "final_score": final_score,
        "label": label,
        "ai_score": ai_score,
        "color_score": color_score,
        "color_detail": colors,
        "image_base64": f"data:image/jpeg;base64,{img_base64}",
        # Le decimos al frontend que no hay GPS para forzar el modo manual por ahora
        "has_gps": False 
    }

# ==========================================
# 💾 NUEVOS ENDPOINTS DE BASE DE DATOS
# ==========================================

@app.post("/save")
def save_sunset(sunset: schemas.AtardecerCreate, db: Session = Depends(get_db)):
    # 1. Creamos el objeto para la base de datos
    db_sunset = models.Atardecer(
        latitude=sunset.latitude,
        longitude=sunset.longitude,
        location_name=sunset.location_name,
        final_score=sunset.final_score,
        label=sunset.label,
        image_base64=sunset.image_base64
    )
    # 2. Lo guardamos
    db.add(db_sunset)
    db.commit()
    db.refresh(db_sunset)
    
    return {"message": "Atardecer guardado con éxito", "id": db_sunset.id}

@app.get("/sunsets")
def get_all_sunsets(db: Session = Depends(get_db)):
    # Pedimos todos los atardeceres a la base de datos
    sunsets = db.query(models.Atardecer).all()
    return sunsets