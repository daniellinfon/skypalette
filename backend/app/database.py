"""
database.py
-----------
Configura la conexión a PostgreSQL mediante SQLAlchemy de forma SEGURA.
Proporciona el motor (engine), la fábrica de sesiones (SessionLocal)
y la clase base para los modelos (Base).
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# 1. Cargar las variables de entorno desde el archivo .env
load_dotenv()

# 2. Leer las credenciales de forma segura (el segundo valor es por si no encuentra el .env)
DB_USER = os.getenv("DB_USER", "admin")
DB_PASSWORD = os.getenv("DB_PASSWORD", "superpassword")
DB_NAME = os.getenv("DB_NAME", "skypalette")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5433")

# 3. Construir la URL de conexión dinámicamente
SQLALCHEMY_DATABASE_URL = f"postgresql+pg8000://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Engine: gestiona el pool de conexiones a PostgreSQL
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# SessionLocal: fábrica de sesiones de base de datos
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base: clase padre de todos los modelos SQLAlchemy
Base = declarative_base()


def get_db():
    """
    Generador que proporciona una sesión de BD por cada petición HTTP.
    FastAPI lo inyecta automáticamente via Depends(get_db).
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()