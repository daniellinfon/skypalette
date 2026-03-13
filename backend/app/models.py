"""
models.py
---------
Define el modelo de datos SQLAlchemy que representa la tabla 'atardeceres'
en PostgreSQL. Cada instancia de Atardecer es una fila en la base de datos.
"""

from sqlalchemy import Column, Integer, String, Float, Boolean
from app.database import Base


class Atardecer(Base):
    """
    Tabla principal de la aplicación. Almacena cada atardecer analizado.

    Campos:
        id            — Clave primaria autoincremental
        latitude      — Latitud decimal (extraída del EXIF o introducida manualmente)
        longitude     — Longitud decimal (ídem)
        location_name — Nombre del lugar (obtenido via Nominatim en el frontend)
        final_score   — Puntuación final combinada (IA + color)
        label         — Etiqueta descriptiva ("Espectacular", "Muy bueno", etc.)
        image_base64  — Imagen codificada en base64 (se guarda sin ficheros en disco)
        is_favorite   — Marcado como favorito por el usuario (por defecto False)
    """
    __tablename__ = "atardeceres"

    id            = Column(Integer, primary_key=True, index=True)
    latitude      = Column(Float, nullable=False)
    longitude     = Column(Float, nullable=False)
    location_name = Column(String, nullable=True)

    final_score   = Column(Float)
    label         = Column(String)

    image_base64  = Column(String)
    is_favorite   = Column(Boolean, default=False)
