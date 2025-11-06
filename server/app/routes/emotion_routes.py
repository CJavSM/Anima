from fastapi import APIRouter, Depends, UploadFile, File, status
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.controllers.emotion_controller import EmotionController
from app.schemas.emotion_schemas import EmotionAnalysisResponse
from app.middlewares.auth_middleware import get_current_active_user
from app.models.user import User

router = APIRouter(
    prefix="/api/emotions",
    tags=["Análisis de Emociones"]
)

@router.post(
    "/analyze",
    response_model=EmotionAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Analizar emociones en imagen",
    description="Analiza las emociones faciales en una imagen usando AWS Rekognition y guarda el resultado"
)
async def analyze_emotion(
    file: UploadFile = File(..., description="Imagen a analizar (JPG, PNG, WEBP - Máx. 5MB)"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Analiza las emociones en una imagen y guarda el resultado en el historial:
    
    - **file**: Archivo de imagen (JPG, PNG, WEBP)
    - Tamaño máximo: 5MB
    - Debe contener al menos un rostro visible
    
    El análisis se guarda automáticamente en el historial del usuario.
    
    Retorna:
    - **analysis_id**: ID del análisis guardado
    - **dominant_emotion**: Emoción dominante y nivel de confianza
    - **all_emotions**: Todas las emociones detectadas con sus porcentajes
    - **face_details**: Detalles adicionales del rostro (edad estimada, género, etc.)
    """
    return await EmotionController.analyze_emotion(
        file=file,
        user_id=str(current_user.id),
        db=db
    )