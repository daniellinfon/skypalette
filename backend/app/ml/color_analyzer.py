"""
color_analyzer.py
-----------------
Analiza la paleta de colores de una imagen de atardecer y devuelve
una puntuación basada en criterios específicos para este tipo de fotografía.

La clave del análisis es evaluar solo la FRANJA DEL HORIZONTE (25%-70% de altura),
evitando que el cielo gris superior o el suelo inferior penalicen injustamente.
"""

import cv2
import numpy as np
from PIL import Image


def analyze_colors(image: Image.Image) -> dict:
    """
    Analiza la paleta de colores de la franja del horizonte de la imagen.

    Criterios evaluados:
        1. sat_score      — Saturación media de los píxeles cálidos, ponderada por brillo
        2. warm_score     — Cobertura de colores cálidos (naranja/rojo/dorado) × brillo
        3. diversity_score— Variedad de rangos cromáticos presentes
        4. horizon_score  — Intensidad visual (píxeles saturados Y brillantes)
        5. contrast_bonus — +10 pts si conviven tonos cálidos Y fríos (azul + naranja)

    El brightness_factor penaliza atardeceres oscuros (nubes tapando el sol):
        - Atardecer brillante (V~200): factor ~0.73
        - Atardecer oscuro (V~140):    factor ~0.43
    """
    img_rgb = np.array(image.convert("RGB"))
    h, w = img_rgb.shape[:2]

    if h < 10 or w < 10:
        return {"sat_score": 0.0, "warm_score": 0.0, "diversity_score": 0.0, "horizon_score": 0.0, "contrast_bonus": 0.0}

    # Convertir a espacio de color HSV — mucho más útil que RGB para detectar colores
    # H: tono 0-179 (rojo=0, verde=60, azul=120)
    # S: saturación 0-255 (0=gris, 255=color puro)
    # V: brillo 0-255 (0=negro, 255=máximo brillo)
    img_hsv = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2HSV)
    H = img_hsv[:, :, 0]
    S = img_hsv[:, :, 1]
    V = img_hsv[:, :, 2]

    # ── Zona del horizonte (25%-70% de altura) ───────────────────────────────
    # Ignoramos el cielo gris superior y el suelo inferior que bajarían el score
    hz1 = int(h * 0.25)
    hz2 = int(h * 0.70)
    H_hz = H[hz1:hz2, :]
    S_hz = S[hz1:hz2, :]
    V_hz = V[hz1:hz2, :]
    total_hz = H_hz.size

    # ── Máscara de colores cálidos en el horizonte ───────────────────────────
    # Naranja/rojo (H 0-25), amarillo/dorado (H 25-40),
    # rosa/magenta (H 125-155), rojo oscuro (H 155-179)
    # Requiere S>50 (no grises) y V>50 (no negros)
    wm_hz = (
        ((H_hz >= 0)   & (H_hz <= 25))  |
        ((H_hz >= 155) & (H_hz <= 179)) |
        ((H_hz >= 25)  & (H_hz <= 40))  |
        ((H_hz >= 125) & (H_hz <= 155))
    ) & (S_hz > 50) & (V_hz > 50)

    warm_vals     = V_hz[wm_hz]
    warm_ratio_hz = np.sum(wm_hz) / total_hz

    # Factor de brillo elevado al exponente 1.5 para ampliar la diferencia
    # entre atardeceres brillantes y oscuros
    mean_V_warm       = float(np.mean(warm_vals)) if len(warm_vals) > 0 else 0
    brightness_factor = (mean_V_warm / 255) ** 1.5

    # ── Criterio 1 — Saturación ponderada por brillo ─────────────────────────
    warm_pixels_sat = S_hz[wm_hz]
    sat_raw   = float(np.mean(warm_pixels_sat) / 255 * 100) if len(warm_pixels_sat) > 0 else 0.0
    sat_score = round(sat_raw * brightness_factor, 1)

    # ── Criterio 2 — Cobertura cálida × brillo ───────────────────────────────
    # Un parche naranja oscuro (detrás de nubes) no puntúa alto
    # porque brightness_factor lo penaliza
    warm_score = round(min(warm_ratio_hz * 100 * 4.0 * brightness_factor, 100.0), 1)

    # ── Criterio 3 — Diversidad cromática en el horizonte ────────────────────
    # Cuenta cuántos de los 6 rangos de color están presentes con >0.8% de píxeles
    color_ranges = [
        ((H_hz >= 0)   & (H_hz <= 15))  & (S_hz > 50),   # rojo
        ((H_hz >= 15)  & (H_hz <= 30))  & (S_hz > 50),   # naranja
        ((H_hz >= 30)  & (H_hz <= 45))  & (S_hz > 50),   # amarillo
        ((H_hz >= 100) & (H_hz <= 130)) & (S_hz > 35),   # azul
        ((H_hz >= 125) & (H_hz <= 155)) & (S_hz > 50),   # rosa/magenta
        ((H_hz >= 155) & (H_hz <= 179)) & (S_hz > 50),   # rojo oscuro
    ]
    ranges_present  = sum(1 for r in color_ranges if np.sum(r) / total_hz > 0.008)
    diversity_score = round((ranges_present / len(color_ranges)) * 100, 1)

    # ── Criterio 4 — Intensidad visual del horizonte ─────────────────────────
    # Solo cuenta píxeles con S>80 Y V>120: saturados Y brillantes a la vez
    vivid_hz      = (S_hz > 80) & (V_hz > 120)
    horizon_score = round(min(float(np.sum(vivid_hz) / total_hz) * 100 * 3.5, 100.0), 1)

    # ── Bonus contraste cálido-frío ───────────────────────────────────────────
    # Naranja + azul conviviendo = atardecer fotogénico
    # Solo aplica si el atardecer es suficientemente brillante
    cold_mask_hz   = ((H_hz >= 85) & (H_hz <= 130)) & (S_hz > 35)
    has_warm       = warm_ratio_hz > 0.05
    has_cold       = np.sum(cold_mask_hz) / total_hz > 0.05
    contrast_bonus = 10.0 if (has_warm and has_cold and brightness_factor > 0.55) else 0.0

    return {
        "sat_score":       sat_score,
        "warm_score":      warm_score,
        "diversity_score": diversity_score,
        "horizon_score":   horizon_score,
        "contrast_bonus":  contrast_bonus,
    }


def compute_color_score(colors: dict) -> float:
    """
    Combina los criterios en un score final de color (0-100).
    Pesos ajustados por el usuario para priorizar la cobertura cálida.
    """
    raw = (
        colors["sat_score"]            * 0.1  +   # 10% saturación
        colors["warm_score"]           * 0.4  +   # 40% cobertura cálida (criterio principal)
        colors["diversity_score"]      * 0.25 +   # 25% variedad cromática
        colors["horizon_score"]        * 0.25 +   # 25% intensidad visual
        colors.get("contrast_bonus", 0)            # +10 bonus fijo si hay contraste
    )
    return round(min(raw, 100.0), 1)


def get_label(score: float) -> str:
    """Convierte una puntuación numérica en etiqueta descriptiva con emoji."""
    if   score >= 85: return "🌅 Espectacular"
    elif score >= 70: return "😍 Muy bueno"
    elif score >= 50: return "🙂 Aceptable"
    elif score >= 30: return "😐 Mediocre"
    else:             return "😶 Aburrido"
