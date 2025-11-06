from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth_routes, emotion_routes, music_routes, history_routes
import os
from dotenv import load_dotenv
from app.config.database import Base, engine
import logging

load_dotenv()

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Crear aplicación FastAPI
app = FastAPI(
    title="Ánima API",
    description="API para detección de emociones y recomendación musical",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# ============================================
# CORS CONFIGURADO CORRECTAMENTE
# ============================================

# Obtener orígenes permitidos
origins_env = os.getenv("CORS_ORIGINS", "")
environment = os.getenv("ENVIRONMENT", "development")

# En desarrollo, ser MUY permisivo
if environment == "development":
    # En desarrollo permitir cualquier origen para evitar problemas de preflight
    origins = ["*"]
    logger.warning("⚠️  CORS en modo DESARROLLO - aceptando cualquier origen (temporal)")
else:
    # En producción, usar los orígenes del .env
    origins = origins_env.split(",") if origins_env else []
    logger.info(f"CORS configurado para: {origins}")

# IMPORTANTE: Configurar CORS ANTES de las rutas
# Si usamos '*' como origen, no podemos permitir credentials por razones de seguridad
allow_credentials_flag = False if origins == ["*"] else True

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_credentials_flag,
    allow_methods=["*"],  # Permite todos los métodos (GET, POST, OPTIONS, etc.)
    allow_headers=["*"],  # Permite todos los headers
    expose_headers=["*"],  # Expone todos los headers en la respuesta
)

logger.info(f"✅ CORS configurado con {len(origins)} orígenes permitidos")

# ============================================
# INCLUIR RUTAS
# ============================================

# Incluir rutas
app.include_router(auth_routes.router)
app.include_router(emotion_routes.router)
app.include_router(music_routes.router)
app.include_router(history_routes.router)

# Ruta raíz
@app.get("/")
def read_root():
    return {
        "message": "Bienvenido a Ánima API",
        "version": "1.0.0",
        "docs": "/api/docs",
        "environment": environment
    }

# Health check
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "anima-api"
    }

# Crear tablas automáticamente al iniciar si no existen
@app.on_event("startup")
def on_startup():
    try:
        logger.info("🚀 Iniciando servidor Ánima API...")
        
        # Loggear URL de conexión (ocultando la contraseña)
        try:
            db_url_masked = engine.url.render_as_string(hide_password=True)
            logger.info(f"📊 DB URL: {db_url_masked}")
        except Exception:
            logger.info("📊 DB URL: <no disponible>")

        # Probar conexión simple
        with engine.connect() as conn:
            conn.exec_driver_sql("SELECT 1")
            # Aplicar migraciones ligeras: agregar columnas de Spotify si no existen
            try:
                conn.exec_driver_sql("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS spotify_id VARCHAR(255) UNIQUE,
                ADD COLUMN IF NOT EXISTS spotify_email VARCHAR(255),
                ADD COLUMN IF NOT EXISTS spotify_display_name VARCHAR(255),
                ADD COLUMN IF NOT EXISTS spotify_access_token TEXT,
                ADD COLUMN IF NOT EXISTS spotify_refresh_token TEXT,
                ADD COLUMN IF NOT EXISTS spotify_token_expires_at TIMESTAMP WITH TIME ZONE,
                ADD COLUMN IF NOT EXISTS spotify_connected BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS spotify_connected_at TIMESTAMP WITH TIME ZONE;
                """)
            except Exception:
                # Algunos drivers/PG versions no permiten múltiples ADD COLUMN en una sola sentencia
                try:
                    conn.exec_driver_sql("ALTER TABLE users ADD COLUMN IF NOT EXISTS spotify_id VARCHAR(255) UNIQUE;")
                except Exception:
                    pass
                try:
                    conn.exec_driver_sql("ALTER TABLE users ADD COLUMN IF NOT EXISTS spotify_email VARCHAR(255);")
                except Exception:
                    pass
                try:
                    conn.exec_driver_sql("ALTER TABLE users ADD COLUMN IF NOT EXISTS spotify_display_name VARCHAR(255);")
                except Exception:
                    pass
                try:
                    conn.exec_driver_sql("ALTER TABLE users ADD COLUMN IF NOT EXISTS spotify_access_token TEXT;")
                except Exception:
                    pass
                try:
                    conn.exec_driver_sql("ALTER TABLE users ADD COLUMN IF NOT EXISTS spotify_refresh_token TEXT;")
                except Exception:
                    pass
                try:
                    conn.exec_driver_sql("ALTER TABLE users ADD COLUMN IF NOT EXISTS spotify_token_expires_at TIMESTAMP WITH TIME ZONE;")
                except Exception:
                    pass
                try:
                    conn.exec_driver_sql("ALTER TABLE users ADD COLUMN IF NOT EXISTS spotify_connected BOOLEAN DEFAULT FALSE;")
                except Exception:
                    pass
                try:
                    conn.exec_driver_sql("ALTER TABLE users ADD COLUMN IF NOT EXISTS spotify_connected_at TIMESTAMP WITH TIME ZONE;")
                except Exception:
                    pass
        
        logger.info("📊 Para verificar la conexión a la base de datos, visita /health/db")

        # Crear tablas
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Base de datos inicializada correctamente")
        
        logger.info(f"✅ Servidor iniciado correctamente en http://0.0.0.0:8000")
        logger.info(f"📚 Documentación disponible en http://0.0.0.0:8000/api/docs")
        
    except Exception as e:
        logger.exception("❌ Error creando tablas en el arranque: %s", e)

# Health DB endpoint
@app.get("/health/db")
def health_db():
    try:
        with engine.connect() as conn:
            result = conn.exec_driver_sql("SELECT 1").scalar()
        return {"status": "ok", "result": result}
    except Exception as e:
        logger.exception("❌ DB health check failed: %s", e)
        return {"status": "error", "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )