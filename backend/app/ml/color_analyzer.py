import cv2
import numpy as np
from PIL import Image


def analyze_colors(image: Image.Image) -> dict:
    img_rgb = np.array(image.convert("RGB"))
    h, w = img_rgb.shape[:2]   # ← h se define AQUÍ antes de usarse

    if h < 10 or w < 10:
        return {"sat_score": 0.0, "warm_score": 0.0, "diversity_score": 0.0, "horizon_score": 0.0}

    
    img_hsv  = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2HSV)

    H = img_hsv[:, :, 0]   # Hue        0-179 en OpenCV
    S = img_hsv[:, :, 1]   # Saturation 0-255
    V = img_hsv[:, :, 2]   # Value      0-255
    total_pixels = H.size

    # Criterio 1 — Saturación (solo en píxeles cálidos)
    warm_mask = (
        ((H >= 0)   & (H <= 25))  |   # rojo/naranja
        ((H >= 155) & (H <= 179)) |   # rojo oscuro
        ((H >= 25)  & (H <= 40))  |   # amarillo/dorado
        ((H >= 125) & (H <= 155))      # rosa/magenta
    )
    warm_and_vivid  = warm_mask & (S > 60) & (V > 60)
    warm_pixels_sat = S[warm_and_vivid]
    sat_score = float(np.mean(warm_pixels_sat) / 255 * 100) if len(warm_pixels_sat) > 0 else 0.0

    # Criterio 2 — Ratio de colores cálidos
    warm_score = min((np.sum(warm_and_vivid) / total_pixels) * 100 * 2.5, 100.0)

    # Criterio 3 — Diversidad de colores
    color_ranges = [
        ((H >= 0)   & (H <= 15))  & (S > 50),   # rojo
        ((H >= 15)  & (H <= 30))  & (S > 50),   # naranja
        ((H >= 30)  & (H <= 45))  & (S > 50),   # amarillo
        ((H >= 100) & (H <= 130)) & (S > 40),   # azul
        ((H >= 125) & (H <= 155)) & (S > 50),   # rosa
        ((H >= 155) & (H <= 179)) & (S > 50),   # rojo oscuro
    ]
    ranges_present  = sum(1 for r in color_ranges if np.sum(r) / total_pixels > 0.01)
    diversity_score = (ranges_present / len(color_ranges)) * 100


    return {
        "sat_score":       round(sat_score, 1),
        "warm_score":      round(warm_score, 1),
        "diversity_score": round(diversity_score, 1)
    }


def compute_color_score(colors: dict) -> float:
    return round(
        colors["sat_score"]       * 0.1 +
        colors["warm_score"]      * 0.65 +
        colors["diversity_score"] * 0.25
    )


def get_label(score: float) -> str:
    if   score >= 85: return "🌅 Espectacular"
    elif score >= 70: return "😍 Muy bueno"
    elif score >= 50: return "🙂 Aceptable"
    elif score >= 30: return "😐 Mediocre"
    else:             return "😶 Aburrido"
