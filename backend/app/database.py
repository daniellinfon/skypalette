from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# Cambia la contraseña si en tu docker-compose pusiste otra
SQLALCHEMY_DATABASE_URL = "postgresql+pg8000://admin:superpassword@localhost:5433/skypalette"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Función para abrir y cerrar la conexión en cada petición
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()