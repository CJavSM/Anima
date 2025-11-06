#!/usr/bin/env python3
"""
Script para verificar que las credenciales de Spotify se carguen correctamente
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Buscar el archivo .env
env_path = Path(__file__).parent / '.env'
print(f"🔍 Buscando archivo .env en: {env_path}")
print(f"   Archivo existe: {env_path.exists()}")

if env_path.exists():
    print(f"   Tamaño del archivo: {env_path.stat().st_size} bytes")
    
# Cargar variables
load_dotenv(override=True)

# Verificar credenciales
client_id = os.getenv('SPOTIFY_CLIENT_ID')
client_secret = os.getenv('SPOTIFY_CLIENT_SECRET')
redirect_uri = os.getenv('SPOTIFY_REDIRECT_URI')

print("\n📊 RESULTADOS:")
print("=" * 60)

if not client_id or client_id.strip() == '':
    print("❌ SPOTIFY_CLIENT_ID está VACÍO o NO DEFINIDO")
else:
    print(f"✅ SPOTIFY_CLIENT_ID: {client_id[:10]}...{client_id[-4:]} ({len(client_id)} caracteres)")

if not client_secret or client_secret.strip() == '':
    print("❌ SPOTIFY_CLIENT_SECRET está VACÍO o NO DEFINIDO")
else:
    print(f"✅ SPOTIFY_CLIENT_SECRET: {client_secret[:10]}...{client_secret[-4:]} ({len(client_secret)} caracteres)")

if not redirect_uri:
    print("⚠️  SPOTIFY_REDIRECT_URI no definido (usando valor por defecto)")
else:
    print(f"✅ SPOTIFY_REDIRECT_URI: {redirect_uri}")

print("=" * 60)

# Verificar el contenido del .env
if env_path.exists():
    print("\n📄 Contenido del archivo .env (primeras líneas relevantes):")
    print("-" * 60)
    with open(env_path, 'r') as f:
        for i, line in enumerate(f, 1):
            if 'SPOTIFY' in line and not line.strip().startswith('#'):
                # Ocultar valores sensibles
                if '=' in line and not line.strip().endswith('='):
                    key, val = line.split('=', 1)
                    masked = f"{key}={'*' * min(len(val.strip()), 20)}"
                    print(f"   {i}: {masked}")
                else:
                    print(f"   {i}: {line.rstrip()} ⚠️ VACÍO")

print("\n💡 SOLUCIÓN:")
print("Si ves '❌', edita tu archivo .env y agrega las credenciales reales:")
print("   SPOTIFY_CLIENT_ID=tu_client_id_aqui")
print("   SPOTIFY_CLIENT_SECRET=tu_client_secret_aqui")
print("\nObtén las credenciales en: https://developer.spotify.com/dashboard")