import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import emotionService from '../../services/emotionService';
import MusicRecommendations from '../MusicRecommendations/MusicRecommendations';
import './Home.css';

const Home = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [analysisId, setAnalysisId] = useState(null);
  const [error, setError] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const [showMusicModal, setShowMusicModal] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Limpiar el stream cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Por favor selecciona una imagen válida');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('La imagen no debe superar los 5MB');
        return;
      }

      setSelectedImage(file);
      setError('');
      setResult(null);

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) {
      setError('Por favor selecciona una imagen primero');
      return;
    }

    setAnalyzing(true);
    setError('');

    try {
      // Llamar al servicio de análisis de emociones
      const response = await emotionService.analyzeEmotion(selectedImage);
      
      if (response.success) {
        const { dominant_emotion, all_emotions, analysis_id } = response.data;
        
        // Guardar el analysis_id para asociarlo con la playlist
        setAnalysisId(analysis_id);
        
        setResult({
          emotion: dominant_emotion.type,
          emotionSpanish: emotionService.translateEmotion(dominant_emotion.type),
          emoji: emotionService.getEmotionEmoji(dominant_emotion.type),
          color: emotionService.getEmotionColor(dominant_emotion.type),
          confidence: dominant_emotion.confidence,
          emotions: all_emotions
        });
      } else {
        setError(response.error);
      }

    } catch (err) {
      setError('Error al analizar la imagen. Por favor intenta de nuevo.');
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setResult(null);
    setError('');
    setShowCamera(false);
    setAnalysisId(null);
    stopCamera();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      setStream(mediaStream);
      setShowCamera(true);
      setError('');
      
      // Esperar un momento para que el video ref esté disponible
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (err) {
      console.error('Error al acceder a la cámara:', err);
      setError('No se pudo acceder a la cámara. Verifica los permisos.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
        setSelectedImage(file);
        
        const imageUrl = canvas.toDataURL('image/jpeg');
        setImagePreview(imageUrl);
        
        stopCamera();
      }, 'image/jpeg', 0.95);
    }
  };

  const handleGetRecommendations = () => {
    if (result && result.emotion) {
      setShowMusicModal(true);
    }
  };

  const handleCloseMusicModal = () => {
    setShowMusicModal(false);
  };

  return (
    <div className="home">
      <nav className="navbar">
        <div className="navbar-container">
            <div className="navbar-content">
            <h1 className="navbar-brand" onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}>
                Ánima
            </h1>
            <div className="navbar-menu">
                <button onClick={() => navigate('/home')} className="nav-link active">
                Analizar
                </button>
                <button onClick={() => navigate('/history')} className="nav-link">
                Historial
                </button>
                <button onClick={() => navigate('/playlists')} className="nav-link">
                Playlists
                </button>
                <button onClick={() => navigate('/dashboard')} className="nav-link">
                Dashboard
                </button>
            </div>
            <div className="navbar-user">
                <span className="navbar-username">
                <span>{user?.username || user?.first_name}</span>
                </span>
                <button onClick={handleLogout} className="btn-logout">
                Cerrar Sesión
                </button>
            </div>
            </div>
        </div>
        </nav>

      <div className="home-content">
        <div className="home-header">
          <h2 className="home-title">¿Cómo te sentís hoy? 📸</h2>
          <p className="home-subtitle">
            Capturá tu momento y dejá que la música refleje tu emoción
          </p>
        </div>

        <div className="analysis-container">
          {!imagePreview && !showCamera && (
            <div className="upload-section">
              <div className="upload-card">
                <div className="upload-icon">📷</div>
                <h3 className="upload-title">Capturá tu emoción</h3>
                <p className="upload-description">
                  Elegí cómo querés capturar tu momento
                </p>
                
                <div className="upload-options">
                  <button onClick={startCamera} className="btn btn-primary btn-camera">
                    📸 Abrir Cámara
                  </button>
                  
                  <div className="divider">
                    <span>o</span>
                  </div>
                  
                  <div className="file-upload-wrapper">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="file-input"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="btn btn-secondary btn-upload">
                      🖼️ Subir Imagen
                    </label>
                  </div>
                </div>
                
                <p className="upload-hint">
                  Formatos: JPG, PNG, WEBP • Máx. 5MB
                </p>
              </div>
            </div>
          )}

          {showCamera && (
            <div className="camera-section">
              <div className="camera-card">
                <div className="camera-header">
                  <h3 className="camera-title">Capturá tu foto</h3>
                  <button onClick={stopCamera} className="btn-close-camera">
                    ✕
                  </button>
                </div>
                
                <div className="camera-container">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline
                    className="camera-video"
                  ></video>
                  <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                </div>
                
                {error && (
                  <div className="alert alert-error">
                    {error}
                  </div>
                )}
                
                <div className="camera-actions">
                  <button onClick={capturePhoto} className="btn btn-primary btn-capture">
                    📸 Tomar Foto
                  </button>
                  <button onClick={stopCamera} className="btn btn-secondary">
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {imagePreview && (
            <div className="preview-section">
              <div className="preview-card">
                <div className="image-container">
                  <img src={imagePreview} alt="Preview" className="preview-image" />
                  {!result && !analyzing && (
                    <button onClick={handleReset} className="btn-close">
                      ✕
                    </button>
                  )}
                </div>

                {error && (
                  <div className="alert alert-error">
                    {error}
                  </div>
                )}

                {!result && !analyzing && (
                  <div className="action-buttons">
                    <button onClick={handleAnalyze} className="btn btn-primary btn-analyze">
                      🔍 Analizar Emoción
                    </button>
                    <button onClick={handleReset} className="btn btn-secondary">
                      Cambiar Foto
                    </button>
                  </div>
                )}

                {analyzing && (
                  <div className="analyzing-state">
                    <div className="spinner"></div>
                    <p className="analyzing-text">Analizando tu emoción...</p>
                  </div>
                )}

                {result && (
                  <div className="result-section">
                    <div className="result-card">
                      <div className="result-header">
                        <h3 className="result-title">Resultado del Análisis</h3>
                        <span className="emotion-badge" style={{ backgroundColor: result.color }}>
                          {result.emoji} {result.emotionSpanish}
                        </span>
                      </div>

                      <div className="confidence-bar">
                        <div className="confidence-label">
                          <span>Confianza</span>
                          <span className="confidence-value">{result.confidence}%</span>
                        </div>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ 
                              width: `${result.confidence}%`,
                              backgroundColor: result.color
                            }}
                          ></div>
                        </div>
                      </div>

                      <div className="emotions-breakdown">
                        <h4 className="breakdown-title">Emociones Detectadas</h4>
                        {Object.entries(result.emotions)
                          .sort((a, b) => b[1] - a[1])
                          .map(([emotion, value]) => (
                            <div key={emotion} className="emotion-item">
                              <span className="emotion-name">
                                {emotionService.getEmotionEmoji(emotion)} {emotionService.translateEmotion(emotion)}
                              </span>
                              <div className="emotion-bar">
                                <div 
                                  className="emotion-fill"
                                  style={{ 
                                    width: `${value}%`,
                                    backgroundColor: emotionService.getEmotionColor(emotion)
                                  }}
                                ></div>
                              </div>
                              <span className="emotion-value">{value.toFixed(1)}%</span>
                            </div>
                          ))}
                      </div>

                      <div className="result-actions">
                        <button 
                          onClick={handleGetRecommendations} 
                          className="btn btn-primary btn-recommendations"
                        >
                          🎵 Obtener Recomendaciones
                        </button>
                        <button onClick={handleReset} className="btn btn-secondary">
                          Nuevo Análisis
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de recomendaciones musicales */}
      {showMusicModal && result && (
        <MusicRecommendations
          emotion={result.emotion}
          emotionColor={result.color}
          analysisId={analysisId}
          onClose={handleCloseMusicModal}
        />
      )}

    </div>
  );
};

export default Home;