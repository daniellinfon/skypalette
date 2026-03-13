"""
exif_extractor.py
-----------------
Extrae metadatos EXIF de imágenes, en especial coordenadas GPS.
Las cámaras y móviles guardan estos datos dentro del propio archivo JPEG/TIFF.
"""

from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
from typing import Optional


def _get_exif_data(image: Image.Image) -> dict:
    """
    Extrae todos los metadatos EXIF de una imagen PIL y los devuelve
    como diccionario con nombres legibles en vez de códigos numéricos.
    Devuelve {} si la imagen no tiene EXIF.
    """
    exif_data = {}
    try:
        raw_exif = image._getexif()
        if raw_exif is None:
            return {}
        for tag_id, value in raw_exif.items():
            tag_name = TAGS.get(tag_id, tag_id)
            exif_data[tag_name] = value
    except Exception:
        pass
    return exif_data


def _parse_gps_coord(coord_raw, ref: str) -> Optional[float]:
    """
    Convierte una coordenada GPS del formato EXIF (grados, minutos, segundos)
    a un float decimal estándar.

    Ejemplo EXIF: ((37, 1), (23, 1), (3055, 100)) ref='N'
    Resultado:    37.38487...

    El signo negativo se aplica si el hemisferio es Sur (S) u Oeste (W).
    """
    try:
        # Cada valor puede venir como tupla (numerador, denominador) o como float
        def to_float(val):
            if isinstance(val, tuple):
                return val[0] / val[1]
            return float(val)

        degrees = to_float(coord_raw[0])
        minutes = to_float(coord_raw[1])
        seconds = to_float(coord_raw[2])

        decimal = degrees + (minutes / 60.0) + (seconds / 3600.0)

        # Sur y Oeste son negativos en el sistema de coordenadas estándar
        if ref in ('S', 'W'):
            decimal = -decimal

        return round(decimal, 7)
    except Exception:
        return None


def extract_gps(image: Image.Image) -> dict:
    """
    Intenta extraer las coordenadas GPS de los metadatos EXIF de una imagen.

    Devuelve un diccionario con:
        - has_gps (bool): True si se encontraron coordenadas válidas
        - latitude (float | None): latitud decimal
        - longitude (float | None): longitud decimal

    Ejemplo de retorno con GPS:
        {"has_gps": True, "latitude": 37.3848, "longitude": -6.0012}

    Ejemplo sin GPS:
        {"has_gps": False, "latitude": None, "longitude": None}
    """
    result = {"has_gps": False, "latitude": None, "longitude": None}

    try:
        exif_data = _get_exif_data(image)
        gps_info_raw = exif_data.get("GPSInfo")

        if not gps_info_raw:
            return result

        # Traducir los códigos numéricos de GPSInfo a nombres legibles
        gps_info = {}
        for key, value in gps_info_raw.items():
            tag_name = GPSTAGS.get(key, key)
            gps_info[tag_name] = value

        # Extraer latitud
        lat = _parse_gps_coord(
            gps_info.get("GPSLatitude"),
            gps_info.get("GPSLatitudeRef", "N")
        )

        # Extraer longitud
        lon = _parse_gps_coord(
            gps_info.get("GPSLongitude"),
            gps_info.get("GPSLongitudeRef", "E")
        )

        if lat is not None and lon is not None:
            result["has_gps"]   = True
            result["latitude"]  = lat
            result["longitude"] = lon

    except Exception:
        # Si falla por cualquier motivo, devolvemos sin GPS (no rompemos el flujo)
        pass

    return result
