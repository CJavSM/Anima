-- Crear extensión para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de usuarios
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    profile_picture VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    spotify_id VARCHAR(255) UNIQUE,
    spotify_email VARCHAR(255),
    spotify_display_name VARCHAR(255),
    spotify_access_token TEXT,
    spotify_refresh_token TEXT,
    spotify_token_expires_at TIMESTAMP WITH TIME ZONE,
    spotify_connected BOOLEAN DEFAULT FALSE,
    spotify_connected_at TIMESTAMP WITH TIME ZONE
);

-- Tabla de análisis de emociones
-- Nota: Por seguridad, NO se almacena la foto del usuario
CREATE TABLE emotion_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dominant_emotion VARCHAR(50) NOT NULL,
    confidence DECIMAL(5,2) NOT NULL,
    emotion_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de recomendaciones musicales
CREATE TABLE music_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID NOT NULL REFERENCES emotion_analyses(id) ON DELETE CASCADE,
    spotify_playlist_id VARCHAR(255),
    playlist_name VARCHAR(255),
    tracks JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_emotion_analyses_user_id ON emotion_analyses(user_id);
CREATE INDEX idx_emotion_analyses_created_at ON emotion_analyses(created_at);
CREATE INDEX idx_music_recommendations_analysis_id ON music_recommendations(analysis_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at en users
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insertar usuario de prueba (contraseña: Test123!)
-- Hash generado con bcrypt rounds=12
INSERT INTO users (email, username, password_hash, first_name, last_name, is_verified)
VALUES (
    'test@anima.com',
    'testuser',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5Fxj.1fWZKUxW',
    'Usuario',
    'Prueba',
    TRUE
);

-- Comentarios para documentación
COMMENT ON TABLE users IS 'Tabla principal de usuarios del sistema';
COMMENT ON TABLE emotion_analyses IS 'Registro de análisis de emociones realizados por los usuarios';
COMMENT ON TABLE music_recommendations IS 'Recomendaciones musicales basadas en análisis de emociones';

ALTER TABLE emotion_analyses 
ADD COLUMN IF NOT EXISTS photo_metadata JSONB;

-- Tabla para guardar playlists favoritas del usuario
CREATE TABLE IF NOT EXISTS saved_playlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    analysis_id UUID REFERENCES emotion_analyses(id) ON DELETE SET NULL,
    playlist_name VARCHAR(255) NOT NULL,
    emotion VARCHAR(50) NOT NULL,
    description TEXT,
    tracks JSONB NOT NULL,
    music_params JSONB,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para saved_playlists
CREATE INDEX IF NOT EXISTS idx_saved_playlists_user_id ON saved_playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_playlists_emotion ON saved_playlists(emotion);
CREATE INDEX IF NOT EXISTS idx_saved_playlists_created_at ON saved_playlists(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_playlists_is_favorite ON saved_playlists(is_favorite);

-- Trigger para actualizar updated_at en saved_playlists
CREATE TRIGGER update_saved_playlists_updated_at BEFORE UPDATE ON saved_playlists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Vista para historial completo del usuario
CREATE OR REPLACE VIEW user_history AS
SELECT 
    ea.id as analysis_id,
    ea.user_id,
    ea.dominant_emotion,
    ea.confidence,
    ea.emotion_details,
    ea.photo_metadata,
    ea.created_at as analyzed_at,
    sp.id as saved_playlist_id,
    sp.playlist_name,
    sp.is_favorite,
    sp.tracks as playlist_tracks,
    sp.music_params,
    mr.spotify_playlist_id,
    CASE 
        WHEN sp.id IS NOT NULL THEN true 
        ELSE false 
    END as has_saved_playlist
FROM emotion_analyses ea
LEFT JOIN saved_playlists sp ON ea.id = sp.analysis_id
LEFT JOIN music_recommendations mr ON ea.id = mr.analysis_id
ORDER BY ea.created_at DESC;

-- Migration: Agregar campos de Spotify al modelo User
-- Fecha: 2025-01-XX
-- Descripción: Permite autenticación con Spotify y guardar playlists en cuentas de Spotify


-- Crear índice para búsquedas por spotify_id
CREATE INDEX IF NOT EXISTS idx_users_spotify_id ON users(spotify_id);

-- Comentarios
COMMENT ON COLUMN users.spotify_id IS 'ID único del usuario en Spotify';
COMMENT ON COLUMN users.spotify_access_token IS 'Token de acceso de Spotify (encriptado)';
COMMENT ON COLUMN users.spotify_refresh_token IS 'Token de refresco de Spotify (encriptado)';
COMMENT ON COLUMN users.spotify_connected IS 'Indica si el usuario tiene conectada su cuenta de Spotify';


-- Comentarios
COMMENT ON TABLE saved_playlists IS 'Playlists guardadas por los usuarios';
COMMENT ON VIEW user_history IS 'Vista consolidada del historial de análisis y playlists del usuario';