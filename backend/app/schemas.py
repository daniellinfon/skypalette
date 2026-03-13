"""
schemas.py
----------
Define los esquemas Pydantic usados para validar los datos
que llegan en las peticiones HTTP al backend.

Pydantic valida automáticamente los tipos y lanza errores 422
si el frontend manda datos incorrectos o incompletos.
"""

from pydantic import BaseModel
from typing import Optional


class AtardecerCreate(BaseModel):
    """
    Esquema para el endpoint POST /save.
    Contiene los datos mínimos necesarios para guardar un atardecer en la BD.

    El frontend manda este objeto tras analizar la imagen y confirmar la ubicación.
    Los campos de análisis detallado (color_detail, ai_score) no se persisten
    en la BD para mantener la tabla simple — solo se usan en la respuesta de /analyze.
    """
    latitude:      float            # Coordenada GPS latitud
    longitude:     float            # Coordenada GPS longitud
    location_name: Optional[str] = None  # Nombre del lugar (puede no tenerlo)
    final_score:   float            # Score combinado IA + color
    label:         str              # Etiqueta textual del score
    image_base64:  str              # Imagen completa codificada en base64
