from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
import base64

from app.ml.model          import predict_ai_score
from app.ml.color_analyzer import analyze_colors, compute_color_score, get_label

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
    image    = Image.open(io.BytesIO(contents))

    # Scores
    ai_score    = predict_ai_score(image)
    colors      = analyze_colors(image)
    color_score = compute_color_score(colors)
    final_score = round((ai_score * 0.65) + (color_score * 0.35), 1)
    label       = get_label(final_score)

    # Convertir imagen a base64 para mostrarla
    buffer = io.BytesIO()
    image.convert("RGB").save(buffer, format="JPEG")
    img_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return {
        "final_score":  final_score,
        "label":        label,
        "ai_score":     ai_score,
        "color_score":  color_score,
        "color_detail": colors,
        "image_base64": f"data:image/jpeg;base64,{img_base64}",  # ← nueva
    }