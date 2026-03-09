from sqlalchemy import Column, Integer, String, Float
from app.database import Base 

class Atardecer(Base):
    __tablename__ = "atardeceres"

    id = Column(Integer, primary_key=True, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location_name = Column(String, nullable=True)
    
    final_score = Column(Float)
    label = Column(String)
    
    # Guardamos el base64 larguísimo para que el mapa pueda pintar la miniatura
    image_base64 = Column(String)