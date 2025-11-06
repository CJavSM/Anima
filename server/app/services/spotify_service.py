import os
import random
import logging
import time
from typing import Dict, List, Optional, Any, Set
from collections import defaultdict

import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
from spotipy.exceptions import SpotifyException
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("spotify_service")

class SpotifyService:
    """
    Servicio mejorado para obtener recomendaciones musicales diversificadas por emoción.
    """

    EMOTION_DESCRIPTORS = {
        'HAPPY': {
            'moods': ['happy', 'upbeat', 'cheerful', 'joyful', 'energetic', 'fun', 'party', 'celebration', 'summer', 'feel good'],
            'genres': ['pop', 'dance', 'disco', 'funk', 'indie pop', 'electropop', 'reggaeton', 'latin', 'house', 'tropical'],
            'artists': ['Dua Lipa', 'The Weeknd', 'Bruno Mars', 'Daft Punk', 'Lizzo', 'Mark Ronson']
        },
        'SAD': {
            'moods': ['sad', 'melancholic', 'emotional', 'heartbreak', 'lonely', 'nostalgic', 'somber', 'blue', 'rainy'],
            'genres': ['indie', 'acoustic', 'singer-songwriter', 'alternative', 'folk', 'soul', 'blues'],
            'artists': ['Billie Eilish', 'Lana Del Rey', 'Bon Iver', 'Adele', 'Sam Smith']
        },
        'ANGRY': {
            'moods': ['angry', 'aggressive', 'intense', 'powerful', 'fierce', 'raw', 'rebellious'],
            'genres': ['rock', 'metal', 'punk', 'hard rock', 'rap', 'electronic', 'nu metal'],
            'artists': ['Rage Against The Machine', 'Linkin Park', 'Metallica', 'Eminem']
        },
        'CALM': {
            'moods': ['calm', 'peaceful', 'relaxing', 'chill', 'tranquil', 'ambient', 'lofi', 'meditation'],
            'genres': ['ambient', 'acoustic', 'chillout', 'lo-fi', 'instrumental', 'jazz', 'classical'],
            'artists': ['Nils Frahm', 'Ólafur Arnalds', 'Bonobo', 'Tycho']
        },
        'SURPRISED': {
            'moods': ['surprising', 'exciting', 'dynamic', 'electric', 'vibrant', 'unexpected'],
            'genres': ['electronic', 'edm', 'pop', 'dance', 'synthpop', 'electro'],
            'artists': ['Daft Punk', 'Justice', 'Calvin Harris', 'Disclosure']
        },
        'FEAR': {
            'moods': ['dark', 'mysterious', 'haunting', 'eerie', 'dramatic', 'suspense'],
            'genres': ['alternative', 'indie', 'electronic', 'ambient', 'experimental', 'darkwave'],
            'artists': ['Radiohead', 'Nine Inch Nails', 'Massive Attack']
        },
        'DISGUSTED': {
            'moods': ['gritty', 'raw', 'intense', 'harsh', 'aggressive', 'edgy'],
            'genres': ['grunge', 'alternative', 'punk', 'industrial', 'noise rock'],
            'artists': ['Nirvana', 'Nine Inch Nails', 'Soundgarden']
        },
        'CONFUSED': {
            'moods': ['experimental', 'unusual', 'eclectic', 'psychedelic', 'abstract', 'weird'],
            'genres': ['alternative', 'indie', 'experimental', 'psychedelic', 'art rock', 'progressive'],
            'artists': ['Radiohead', 'Tame Impala', 'Pink Floyd', 'Björk']
        }
    }

    # Filtros MÁS RELAJADOS
    EMOTION_FEATURE_FILTERS = {
        'HAPPY': {'min_valence': 0.45, 'min_energy': 0.40, 'tempo_range': (80, 160)},
        'SAD':   {'max_valence': 0.60, 'max_energy': 0.65, 'tempo_range': (40, 110)},
        'ANGRY': {'min_energy': 0.60, 'tempo_range': (90, 190)},
        'CALM':  {'max_energy': 0.55, 'max_tempo': 120},
        'SURPRISED': {'min_valence': 0.45, 'min_energy': 0.50, 'tempo_range': (90, 170)},
        'FEAR': {'min_energy': 0.35, 'max_valence': 0.55, 'tempo_range': (50, 130)},
        'DISGUSTED': {'min_energy': 0.50, 'tempo_range': (70, 150)},
        'CONFUSED': {'tempo_range': (60, 150)}
    }

    DEFAULT_MARKETS = ['US', 'GB', 'ES', 'MX', 'AR', 'CO', 'BR', 'FR', 'DE']

    def __init__(self, markets: Optional[List[str]] = None):
        client_id = os.getenv('SPOTIFY_CLIENT_ID')
        client_secret = os.getenv('SPOTIFY_CLIENT_SECRET')
        if not client_id or not client_secret:
            raise ValueError("SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET no definidos")

        # Client Credentials (sin audio_features pero más simple)
        self.auth_manager = SpotifyClientCredentials(
            client_id=client_id, 
            client_secret=client_secret
        )
        
        self.sp = spotipy.Spotify(
            auth_manager=self.auth_manager, 
            requests_timeout=15, 
            retries=3
        )
        self.markets = markets or self.DEFAULT_MARKETS
        self._audio_features_available = False  # Marcado como False para Client Credentials
        
        # Test de conexión
        try:
            self.sp.search(q='test', type='track', limit=1)
            logger.info("✓ SpotifyService conectado correctamente")
            logger.info("ℹ️  Usando Client Credentials (sin audio features)")
            logger.info("💡 Diversificación basada en artistas, álbumes y géneros")
        except Exception as e:
            logger.error(f"✗ Error de conexión con Spotify: {e}")
            raise

    def _test_audio_features(self):
        """Verifica si audio_features está disponible con las credenciales actuales."""
        try:
            # Intentar con un track ID de prueba conocido (Blinding Lights - The Weeknd)
            test_result = self.sp.audio_features(['0VjIjW4GlUZAMYd2vXMi3b'])
            if test_result and test_result[0]:
                self._audio_features_available = True
                logger.info("✓ Audio features disponible")
            else:
                self._audio_features_available = False
                logger.warning("⚠ Audio features no devuelve datos")
        except SpotifyException as e:
            if e.http_status == 403:
                self._audio_features_available = False
                logger.warning("⚠ Audio features no disponible (403 - permisos insuficientes)")
                logger.info("💡 Las recomendaciones funcionarán sin filtrado por características musicales")
            else:
                self._audio_features_available = False
                logger.warning(f"⚠ Audio features no disponible (error {e.http_status})")
        except Exception as e:
            self._audio_features_available = False
            logger.warning(f"⚠ Audio features no disponible: {e}")

    def get_recommendations(
        self,
        emotion: str,
        limit: int = 20,
        preferred_genres: Optional[List[str]] = None,
        markets: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Obtiene recomendaciones diversificadas para una emoción.
        """
        start = time.time()
        emotion = emotion.upper()
        
        if emotion not in self.EMOTION_DESCRIPTORS:
            raise ValueError(f"Emoción desconocida: {emotion}")

        descriptors = self.EMOTION_DESCRIPTORS[emotion]
        filters = self.EMOTION_FEATURE_FILTERS.get(emotion, {})
        markets_to_use = markets or self.markets
        genres_to_use = preferred_genres or descriptors.get('genres', [])

        logger.info(f"🎵 Buscando {limit} canciones para '{emotion}'")
        logger.info(f"Géneros: {genres_to_use[:5]}...")

        # 1) RECOLECCIÓN MASIVA Y DIVERSIFICADA
        candidates = self._collect_diverse_candidates(
            emotion=emotion,
            genres=genres_to_use,
            descriptors=descriptors,
            markets=markets_to_use,
            target_count=limit * 15  # Recolectar 15x más para diversificar
        )

        logger.info(f"📊 Recolectados {len(candidates)} candidatos únicos")

        # 2) FILTRADO SUAVE (solo si audio_features está disponible)
        if self._audio_features_available and len(candidates) > limit * 3:
            filtered = self._filter_tracks_by_features(candidates, filters)
            logger.info(f"✓ {len(filtered)} pasaron filtros de audio")
        elif not self._audio_features_available:
            filtered = candidates
            logger.info(f"⏭️  Omitiendo filtros (audio features no disponible)")
        else:
            filtered = candidates
            logger.info(f"⏭️  Omitiendo filtros (pocos candidatos)")

        # 3) DIVERSIFICACIÓN INTELIGENTE
        final_tracks = self._diversify_tracks(
            filtered if filtered else candidates,
            limit=limit
        )

        logger.info(f"🎯 Seleccionadas {len(final_tracks)} canciones diversificadas")

        # 4) PROCESAR Y ENRIQUECER
        processed = []
        for track in final_tracks:
            proc = self._process_track(track)
            if proc:
                processed.append(proc)

        # 5) ANÁLISIS DE CARACTERÍSTICAS
        avg_features = self._analyze_track_features([t['id'] for t in processed])

        elapsed = time.time() - start
        logger.info(f"✓ Completado en {elapsed:.2f}s")

        return {
            'success': True,
            'emotion': emotion,
            'tracks': processed,
            'total': len(processed),
            'genres_used': genres_to_use[:5],
            'music_params': {
                'valence': f"{avg_features.get('valence', 0.5):.2f}",
                'energy': f"{avg_features.get('energy', 0.5):.2f}",
                'tempo': f"{int(avg_features.get('tempo', 100))} BPM",
                'mode': avg_features.get('mode_text', 'Mixto')
            }
        }

    def _collect_diverse_candidates(
        self,
        emotion: str,
        genres: List[str],
        descriptors: Dict,
        markets: List[str],
        target_count: int = 300
    ) -> List[Dict]:
        """
        Recolecta candidatos de múltiples fuentes con diversificación.
        """
        candidates = []
        seen_ids = set()
        
        moods = descriptors.get('moods', [])
        artists = descriptors.get('artists', [])
        
        # ESTRATEGIA 1: Búsqueda por género + mood
        for genre in random.sample(genres, min(len(genres), 6)):
            for mood in random.sample(moods, min(len(moods), 4)):
                if len(candidates) >= target_count:
                    break
                    
                market = random.choice(markets)
                query = f"{genre} {mood}"
                
                # Búsqueda de tracks
                tracks = self._safe_search_tracks(query, limit=50, market=market)
                for track in tracks:
                    if track.get('id') and track['id'] not in seen_ids:
                        candidates.append(track)
                        seen_ids.add(track['id'])
                
                time.sleep(0.05)

        # ESTRATEGIA 2: Playlists curadas
        playlist_queries = [f"{emotion.lower()} vibes"]
        playlist_queries.extend([f"best {genre}" for genre in genres[:3]])
        
        for query in playlist_queries[:5]:
            if len(candidates) >= target_count:
                break
                
            market = random.choice(markets)
            pl_tracks = self._get_playlist_tracks(query, market=market, limit=30)
            
            for track in pl_tracks:
                if track.get('id') and track['id'] not in seen_ids:
                    candidates.append(track)
                    seen_ids.add(track['id'])
            
            time.sleep(0.05)

        # ESTRATEGIA 3: Por artistas semilla
        for artist_name in artists[:4]:
            if len(candidates) >= target_count:
                break
                
            artist_tracks = self._get_artist_top_tracks(artist_name)
            for track in artist_tracks:
                if track.get('id') and track['id'] not in seen_ids:
                    candidates.append(track)
                    seen_ids.add(track['id'])

        return candidates

    def _safe_search_tracks(self, query: str, limit: int = 50, market: str = 'US') -> List[Dict]:
        """Búsqueda de tracks con manejo robusto de errores."""
        try:
            result = self.sp.search(q=query, type='track', limit=limit, market=market)
            return result.get('tracks', {}).get('items', [])
        except SpotifyException as e:
            logger.warning(f"Search error [{e.http_status}]: {query}")
            return []
        except Exception as e:
            logger.error(f"Unexpected search error: {e}")
            return []

    def _get_playlist_tracks(self, query: str, market: str = 'US', limit: int = 30) -> List[Dict]:
        """Obtiene tracks de playlists con la query."""
        tracks = []
        try:
            # Buscar playlists
            result = self.sp.search(q=query, type='playlist', limit=3, market=market)
            playlists = result.get('playlists', {}).get('items', [])
            
            for playlist in playlists:
                try:
                    items = self.sp.playlist_items(
                        playlist['id'], 
                        limit=limit, 
                        market=market
                    )
                    for item in items.get('items', []):
                        track = item.get('track')
                        if track and track.get('id'):
                            tracks.append(track)
                except Exception as e:
                    logger.debug(f"Error obteniendo playlist items: {e}")
                    
        except Exception as e:
            logger.warning(f"Error buscando playlists: {e}")
            
        return tracks

    def _get_artist_top_tracks(self, artist_name: str, market: str = 'US') -> List[Dict]:
        """Obtiene top tracks de un artista."""
        try:
            # Buscar artista
            result = self.sp.search(q=f"artist:{artist_name}", type='artist', limit=1)
            artists = result.get('artists', {}).get('items', [])
            
            if not artists:
                return []
            
            artist_id = artists[0]['id']
            
            # Obtener top tracks
            tops = self.sp.artist_top_tracks(artist_id, country=market)
            return tops.get('tracks', [])
            
        except Exception as e:
            logger.debug(f"Error obteniendo tracks de artista {artist_name}: {e}")
            return []

    def _filter_tracks_by_features(self, tracks: List[Dict], filters: Dict) -> List[Dict]:
        """Filtra tracks por audio features con criterios más permisivos."""
        if not tracks or not filters:
            return tracks
        
        # Si ya sabemos que audio_features no está disponible, retornar sin filtrar
        if self._audio_features_available is False:
            return tracks

        track_ids = [t['id'] for t in tracks if t.get('id')]
        id_to_track = {t['id']: t for t in tracks if t.get('id')}
        
        filtered = []
        
        # Procesar en batches PEQUEÑOS (50 en lugar de 100) con delays
        batch_size = 50
        for i in range(0, len(track_ids), batch_size):
            batch = track_ids[i:i+batch_size]
            
            try:
                features_list = self.sp.audio_features(batch)
                
                for features in features_list:
                    if not features or not features.get('id'):
                        continue
                    
                    track_id = features['id']
                    track = id_to_track.get(track_id)
                    
                    if not track:
                        continue
                    
                    # Aplicar filtros
                    if self._passes_filters(features, filters):
                        track_copy = track.copy()
                        track_copy['_features'] = features
                        filtered.append(track_copy)
                
                # Delay entre batches para evitar rate limits
                if i + batch_size < len(track_ids):
                    time.sleep(0.2)
                        
            except SpotifyException as e:
                if e.http_status == 403:
                    # Marcar como no disponible y retornar tracks sin filtrar
                    self._audio_features_available = False
                    logger.warning(f"⚠ Audio features 403 - deshabilitando filtros")
                    return tracks
                else:
                    logger.warning(f"Audio features error [{e.http_status}]")
                    return tracks
            except Exception as e:
                logger.error(f"Unexpected audio features error: {e}")
                return tracks
        
        # Si se filtraron demasiadas, relajar criterios
        if len(filtered) < len(tracks) * 0.3:
            logger.warning(f"Filtros muy estrictos ({len(filtered)}/{len(tracks)}), usando todos")
            return tracks
            
        return filtered

    def _passes_filters(self, features: Dict, filters: Dict) -> bool:
        """Verifica si un track pasa los filtros."""
        val = features.get('valence', 0.5)
        eng = features.get('energy', 0.5)
        dnc = features.get('danceability', 0.5)
        ac = features.get('acousticness', 0.5)
        tempo = features.get('tempo', 120)
        
        # Aplicar cada filtro con un margen de tolerancia
        TOLERANCE = 0.05
        
        if 'min_valence' in filters:
            if val < filters['min_valence'] - TOLERANCE:
                return False
                
        if 'max_valence' in filters:
            if val > filters['max_valence'] + TOLERANCE:
                return False
                
        if 'min_energy' in filters:
            if eng < filters['min_energy'] - TOLERANCE:
                return False
                
        if 'max_energy' in filters:
            if eng > filters['max_energy'] + TOLERANCE:
                return False
                
        if 'min_danceability' in filters:
            if dnc < filters['min_danceability'] - TOLERANCE:
                return False
                
        if 'max_acousticness' in filters:
            if ac > filters['max_acousticness'] + TOLERANCE:
                return False
                
        if 'min_acousticness' in filters:
            if ac < filters['min_acousticness'] - TOLERANCE:
                return False
                
        if 'tempo_range' in filters:
            lo, hi = filters['tempo_range']
            if not (lo - 10 <= tempo <= hi + 10):
                return False
                
        if 'max_tempo' in filters:
            if tempo > filters['max_tempo'] + 10:
                return False
        
        return True

    def _diversify_tracks(self, tracks: List[Dict], limit: int) -> List[Dict]:
        """
        Diversifica tracks INTELIGENTEMENTE sin audio_features.
        Criterios: artistas, álbumes, popularidad, año de lanzamiento.
        """
        if len(tracks) <= limit:
            return tracks

        # Análisis de metadata
        artist_count = defaultdict(int)
        album_count = defaultdict(int)
        genre_presence = defaultdict(list)
        
        # Extraer año de lanzamiento si está disponible
        for track in tracks:
            release_date = track.get('album', {}).get('release_date', '')
            if release_date:
                year = release_date.split('-')[0] if '-' in release_date else release_date
                track['_year'] = int(year) if year.isdigit() else 2020
            else:
                track['_year'] = 2020
        
        selected = []
        remaining = tracks.copy()
        random.shuffle(remaining)
        
        # FASE 1: Diversidad estricta (máximo 1 por artista)
        for track in remaining:
            if len(selected) >= limit // 2:  # Primera mitad
                break
                
            artist_name = track.get('artists', [{}])[0].get('name', 'Unknown')
            album_name = track.get('album', {}).get('name', 'Unknown')
            
            if artist_count[artist_name] == 0:
                selected.append(track)
                artist_count[artist_name] += 1
                album_count[album_name] += 1
        
        # FASE 2: Completar con diversidad relajada (máximo 2 por artista)
        for track in remaining:
            if len(selected) >= limit:
                break
            
            if track in selected:
                continue
                
            artist_name = track.get('artists', [{}])[0].get('name', 'Unknown')
            album_name = track.get('album', {}).get('name', 'Unknown')
            
            if artist_count[artist_name] < 2 and album_count[album_name] < 2:
                selected.append(track)
                artist_count[artist_name] += 1
                album_count[album_name] += 1
        
        # FASE 3: Si aún faltan, agregar lo que sea
        for track in remaining:
            if len(selected) >= limit:
                break
            if track not in selected:
                selected.append(track)
        
        # Ordenar por: 50% popularidad + 30% año + 20% aleatorio
        def score_track(t):
            popularity = t.get('popularity', 50)
            year = t.get('_year', 2020)
            year_score = (year - 1950) / 75 * 100  # Normalizar años 1950-2025 a 0-100
            random_factor = random.randint(0, 100)
            
            return (popularity * 0.5) + (year_score * 0.3) + (random_factor * 0.2)
        
        selected.sort(key=score_track, reverse=True)
        
        # Mezclar un poco para no ser demasiado predecible
        # Intercambiar posiciones aleatorias
        for _ in range(len(selected) // 3):
            i, j = random.sample(range(len(selected)), 2)
            selected[i], selected[j] = selected[j], selected[i]
        
        return selected[:limit]

    def _process_track(self, track: Dict) -> Optional[Dict]:
        """Transforma track al formato del schema."""
        if not track or not track.get('id'):
            return None
        
        try:
            artists = [a.get('name', 'Unknown') for a in track.get('artists', [])]
            album_obj = track.get('album', {})
            album_images = album_obj.get('images', [])
            
            return {
                'id': track['id'],
                'name': track.get('name', 'Unknown'),
                'artists': artists,
                'album': album_obj.get('name', 'Unknown Album'),
                'album_image': album_images[0]['url'] if album_images else None,
                'preview_url': track.get('preview_url'),
                'external_url': track.get('external_urls', {}).get('spotify', ''),
                'duration_ms': track.get('duration_ms', 0),
                'popularity': track.get('popularity', 0)
            }
        except Exception as e:
            logger.error(f"Error procesando track: {e}")
            return None

    def _analyze_track_features(self, track_ids: List[str]) -> Dict[str, Any]:
        """Analiza características promedio de las pistas."""
        default_features = {
            'valence': 0.5,
            'energy': 0.5,
            'tempo': 120.0,
            'mode_text': 'N/A'
        }
        
        if not track_ids or self._audio_features_available is False:
            return default_features

        all_features = []
        
        # Batches pequeños de 50 con delays
        batch_size = 50
        for i in range(0, len(track_ids), batch_size):
            batch = track_ids[i:i+batch_size]
            try:
                features = self.sp.audio_features(batch)
                if features:
                    all_features.extend([f for f in features if f])
                
                # Delay entre batches
                if i + batch_size < len(track_ids):
                    time.sleep(0.2)
                    
            except SpotifyException as e:
                if e.http_status == 403:
                    self._audio_features_available = False
                    return default_features
                logger.debug(f"Error en audio features analysis: {e}")
            except Exception as e:
                logger.debug(f"Error en audio features analysis: {e}")

        if not all_features:
            return default_features

        avg_valence = sum(f.get('valence', 0.5) for f in all_features) / len(all_features)
        avg_energy = sum(f.get('energy', 0.5) for f in all_features) / len(all_features)
        avg_tempo = sum(f.get('tempo', 120) for f in all_features) / len(all_features)
        mode_avg = sum(f.get('mode', 0) for f in all_features) / len(all_features)

        if mode_avg > 0.6:
            mode_text = "Mayor (alegre)"
        elif mode_avg < 0.4:
            mode_text = "Menor (triste)"
        else:
            mode_text = "Mixto"

        return {
            'valence': avg_valence,
            'energy': avg_energy,
            'tempo': avg_tempo,
            'mode_text': mode_text
        }


def create_playlist_description(emotion: str) -> str:
    """Genera descripción de playlist por emoción."""
    descriptions = {
        'HAPPY': '¡Música alegre y energética para celebrar tu felicidad! 🎉',
        'SAD': 'Canciones emotivas que acompañan tus momentos de reflexión 💙',
        'ANGRY': 'Música poderosa para canalizar tu energía 🔥',
        'CALM': 'Melodías relajantes para tu paz interior 🧘',
        'SURPRISED': 'Canciones que capturan ese momento de asombro ✨',
        'FEAR': 'Música que te acompaña en momentos de incertidumbre 🌙',
        'DISGUSTED': 'Canciones alternativas que expresan tu disgusto 🎸',
        'CONFUSED': 'Música experimental para tu estado de confusión 🌀'
    }
    return descriptions.get(emotion, 'Música personalizada según tu emoción 🎵')


# Instancia global
spotify_service = SpotifyService()
spotify_service.create_playlist_description = create_playlist_description