from pydantic import BaseModel
from typing import Optional

class AtardecerCreate(BaseModel):
    latitude: float
    longitude: float
    location_name: Optional[str] = None
    final_score: float
    label: str
    image_base64: str
    # Omitimos color_detail y ai_score por ahora para no complicar la tabla, 
    # pero puedes añadirlos si quieres.