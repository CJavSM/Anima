from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv(override=True)

# Construir DATABASE_URL desde componentes individuales
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "15432")
DB_USER = os.getenv("DB_USER", "anima_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "anima_password")
DB_NAME = os.getenv("DB_NAME", "anima_db")

# Construir URL con el driver psycopg (versión 3)
DATABASE_URL = f"postgresql+psycopg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

print(f"📊 Conectando a base de datos en: {DB_HOST}:{DB_PORT}/{DB_NAME}")

# Crear engine con configuración optimizada
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Verifica conexiones antes de usarlas
    pool_size=5,         # Tamaño del pool de conexiones
    max_overflow=10,     # Conexiones extra permitidas
    echo=False           # Cambiar a True para debug SQL
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency para obtener la sesión de BD
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Función para verificar conexión
def check_db_connection():
    """Verifica que la conexión a la base de datos funcione"""
    try:
        with engine.connect() as conn:
            result = conn.execute("SELECT 1")
            print("✅ Conexión a PostgreSQL exitosa")
            return True
    except Exception as e:
        print(f"❌ Error de conexión a PostgreSQL: {str(e)}")
        return False