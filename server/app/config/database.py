from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
import logging

load_dotenv()

logger = logging.getLogger(__name__)

# Configuración de la base de datos
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "15432")
DB_USER = os.getenv("DB_USER", "anima_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "anima_password")
DB_NAME = os.getenv("DB_NAME", "anima_db")

# URL de conexión
# Use psycopg (v3) driver if available (psycopg[binary] in requirements). This avoids
# requiring compilation of psycopg2 on Windows. SQLAlchemy dialect for psycopg v3 is
# 'postgresql+psycopg'. If you prefer psycopg2, change back to 'postgresql://' and
# install the required build tools.
DATABASE_URL = f"postgresql+psycopg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Crear engine con configuración optimizada
engine = create_engine(
    DATABASE_URL,
    echo=False,  # Cambiar a True para debug SQL
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=300
)

# Crear SessionLocal
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para los modelos
Base = declarative_base()

# Dependencia para obtener la sesión de base de datos
def get_db():
    """
    Dependency para obtener la sesión de base de datos
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Función para verificar la conexión
def check_database_connection():
    """
    Verifica si la conexión a la base de datos está funcionando
    """
    try:
        with engine.connect() as connection:
            connection.exec_driver_sql("SELECT 1")
        logger.info("✅ Conexión a la base de datos exitosa")
        return True
    except Exception as e:
        logger.error(f"❌ Error conectando a la base de datos: {e}")
        return False

# Función para crear todas las tablas
def create_tables():
    """
    Crea todas las tablas en la base de datos
    """
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Tablas creadas exitosamente")
    except Exception as e:
        logger.error(f"❌ Error creando tablas: {e}")
        raise e