from sqlalchemy import Column, Integer, String, Float, Boolean
from app.database import Base 

class Atardecer(Base):
    __tablename__ = "atardeceres"

    id = Column(Integer, primary_key=True, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location_name = Column(String, nullable=True)
    
    final_score = Column(Float)
    label = Column(String)
    
    image_base64 = Column(String)
    is_favorite   = Column(Boolean, default=False)