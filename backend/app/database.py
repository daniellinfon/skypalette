"""
database.py
-----------
Configura la conexión a PostgreSQL mediante SQLAlchemy.
Proporciona el motor (engine), la fábrica de sesiones (SessionLocal)
y la clase base para los modelos (Base).
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# URL de conexión — formato: driver://usuario:password@host:puerto/nombre_bd
# Usa pg8000 como driver (alternativa pura Python a psycopg2, sin dependencias C)
SQLALCHEMY_DATABASE_URL = "postgresql+pg8000://admin:superpassword@localhost:5433/skypalette"

# Engine: gestiona el pool de conexiones a PostgreSQL
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# SessionLocal: fábrica de sesiones de base de datos
# autocommit=False → los cambios se confirman manualmente con db.commit()
# autoflush=False  → no sincroniza automáticamente antes de cada query
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base: clase padre de todos los modelos SQLAlchemy (models.py hereda de aquí)
Base = declarative_base()


def get_db():
    """
    Generador que proporciona una sesión de BD por cada petición HTTP.
    FastAPI lo inyecta automáticamente via Depends(get_db).

    Garantiza que la sesión se cierre siempre al terminar la petición,
    tanto si hubo éxito como si ocurrió un error.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
