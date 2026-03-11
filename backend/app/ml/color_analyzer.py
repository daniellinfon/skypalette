import cv2
import numpy as np
from PIL import Image


def analyze_colors(image: Image.Image) -> dict:
    img_rgb = np.array(image.convert("RGB"))
    h, w = img_rgb.shape[:2]

    if h < 10 or w < 10:
        return {"sat_score": 0.0, "warm_score": 0.0, "diversity_score": 0.0, "horizon_score": 0.0, "contrast_bonus": 0.0}

    img_hsv = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2HSV)
    H = img_hsv[:, :, 0]
    S = img_hsv[:, :, 1]
    V = img_hsv[:, :, 2]

    # ── Zona del horizonte (25%-70%) ─────────────────────────────────────────
    # El cielo gris superior y el suelo inferior no penalizan
    hz1 = int(h * 0.25)
    hz2 = int(h * 0.70)
    H_hz = H[hz1:hz2, :]
    S_hz = S[hz1:hz2, :]
    V_hz = V[hz1:hz2, :]
    total_hz = H_hz.size

    # ── Máscara de colores cálidos ───────────────────────────────────────────
    wm_hz = (
        ((H_hz >= 0)   & (H_hz <= 25))  |
        ((H_hz >= 155) & (H_hz <= 179)) |
        ((H_hz >= 25)  & (H_hz <= 40))  |
        ((H_hz >= 125) & (H_hz <= 155))
    ) & (S_hz > 50) & (V_hz > 50)

    warm_vals     = V_hz[wm_hz]
    warm_ratio_hz = np.sum(wm_hz) / total_hz

    # Factor de brillo: píxeles cálidos oscuros (detrás de nubes) penalizan
    # Un atardecer brillante (V~200) puntúa ~1.0; uno oscuro (V~140) ~0.45
    mean_V_warm      = float(np.mean(warm_vals)) if len(warm_vals) > 0 else 0
    brightness_factor = (mean_V_warm / 255) ** 1.5

    # ── Criterio 1 — Saturación media en zona cálida ────────────────────────
    warm_pixels_sat = S_hz[wm_hz]
    sat_raw   = float(np.mean(warm_pixels_sat) / 255 * 100) if len(warm_pixels_sat) > 0 else 0.0
    sat_score = round(sat_raw * brightness_factor, 1)

    # ── Criterio 2 — Cobertura cálida ponderada por brillo ──────────────────
    # Requiere cobertura amplia Y píxeles brillantes; un parche oscuro no engaña
    warm_score = round(min(warm_ratio_hz * 100 * 4.0 * brightness_factor, 100.0), 1)

    # ── Criterio 3 — Diversidad de colores en horizonte ─────────────────────
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
    # Solo píxeles saturados Y brillantes (no nubes oscuras con naranja apagado)
    vivid_hz      = (S_hz > 80) & (V_hz > 120)
    horizon_score = round(min(float(np.sum(vivid_hz) / total_hz) * 100 * 3.5, 100.0), 1)

    # ── Bonus contraste cálido-frío ──────────────────────────────────────────
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
    raw = (
        colors["sat_score"]            * 0.1 +
        colors["warm_score"]           * 0.4 +
        colors["diversity_score"]      * 0.25 +
        colors["horizon_score"]        * 0.25 +
        colors.get("contrast_bonus", 0)
    )
    return round(min(raw, 100.0), 1)


def get_label(score: float) -> str:
    if   score >= 85: return "🌅 Espectacular"
    elif score >= 70: return "😍 Muy bueno"
    elif score >= 50: return "🙂 Aceptable"
    elif score >= 30: return "😐 Mediocre"
    else:             return "😶 Aburrido"