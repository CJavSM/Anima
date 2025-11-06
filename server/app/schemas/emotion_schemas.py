from pydantic import BaseModel
from typing import Dict, Optional

class EmotionResponse(BaseModel):
    """Respuesta del análisis de emociones"""
    type: str
    confidence: float

class FaceDetailsResponse(BaseModel):
    """Detalles adicionales del rostro detectado"""
    age_range: Optional[Dict] = None
    gender: Optional[Dict] = None
    smile: Optional[Dict] = None
    eyeglasses: Optional[Dict] = None
    sunglasses: Optional[Dict] = None
    beard: Optional[Dict] = None
    mustache: Optional[Dict] = None
    eyes_open: Optional[Dict] = None
    mouth_open: Optional[Dict] = None

class EmotionAnalysisResponse(BaseModel):
    """Respuesta completa del análisis"""
    success: bool
    faces_detected: int
    dominant_emotion: Optional[EmotionResponse] = None
    all_emotions: Dict[str, float]
    face_details: Optional[FaceDetailsResponse] = None
    error: Optional[str] = None

class EmotionAnalysisError(BaseModel):
    """Respuesta de error"""
    success: bool = False
    error: str
    error_code: Optional[str] = None