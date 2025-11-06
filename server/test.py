import os
from dotenv import load_dotenv
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials

load_dotenv()

client_id = os.getenv('SPOTIFY_CLIENT_ID')
client_secret = os.getenv('SPOTIFY_CLIENT_SECRET')

print(f"Client ID: {client_id[:10]}...")
print(f"Client Secret: {client_secret[:10]}...")

auth = SpotifyClientCredentials(client_id=client_id, client_secret=client_secret)
sp = spotipy.Spotify(auth_manager=auth)

# Test 1: Search (debería funcionar)
print("\n🔍 Test 1: Search")
try:
    result = sp.search(q='happy', type='track', limit=1)
    print("✅ Search funciona")
except Exception as e:
    print(f"❌ Search falló: {e}")

# Test 2: Audio Features (el problema)
print("\n🎵 Test 2: Audio Features")
try:
    # ID de prueba: "Blinding Lights" de The Weeknd
    result = sp.audio_features(['0VjIjW4GlUZAMYd2vXMi3b'])
    if result and result[0]:
        print(f"✅ Audio Features funciona")
        print(f"   Valence: {result[0]['valence']}")
        print(f"   Energy: {result[0]['energy']}")
    else:
        print("⚠️ Audio Features devuelve None")
except Exception as e:
    print(f"❌ Audio Features falló: {e}")

# Test 3: Token info
print("\n🔑 Test 3: Token")
try:
    token = auth.get_access_token(as_dict=False)
    print(f"✅ Token obtenido: {token[:20]}...")
except Exception as e:
    print(f"❌ Token falló: {e}")