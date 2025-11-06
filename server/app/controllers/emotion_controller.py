from fastapi import HTTPException, status, UploadFile
from sqlalchemy.orm import Session
from app.services.rekognition_service import rekognition_service
from app.services.history_service import HistoryService
from app.schemas.emotion_schemas import EmotionAnalysisResponse
from app.schemas.history_schemas import EmotionAnalysisCreate
import logging

logger = logging.getLogger(__name__)

class EmotionController:
    
    @staticmethod
    async def analyze_emotion(file: UploadFile, user_id: str, db: Session) -> EmotionAnalysisResponse:
        """
        Analiza las emociones de una imagen cargada y guarda el resultado
        
        Args:
            file: Archivo de imagen cargado
            user_id: ID del usuario que realiza el análisis
            db: Sesión de base de datos
            
        Returns:
            EmotionAnalysisResponse con los resultados del análisis
        """
        try:
            # Leer el archivo
            image_bytes = await file.read()
            
            # Validar la imagen
            validation = rekognition_service.validate_image(image_bytes)
            if not validation['valid']:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=validation['error']
                )
            
            # Analizar emociones
            result = rekognition_service.detect_faces_and_emotions(image_bytes)
            
            if not result['success']:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=result.get('error', 'Error al procesar la imagen')
                )
            
            # Preparar metadata de la foto (NO guardamos la foto, solo info)
            photo_metadata = {
                'filename': file.filename,
                'content_type': file.content_type,
                'size': len(image_bytes),
                'faces_detected': result['faces_detected']
            }
            
            # Guardar el análisis en la base de datos
            try:
                analysis_data = EmotionAnalysisCreate(
                    dominant_emotion=result['dominant_emotion']['type'],
                    confidence=result['dominant_emotion']['confidence'],
                    emotion_details=result['all_emotions'],
                    photo_metadata=photo_metadata
                )
                
                saved_analysis = HistoryService.create_emotion_analysis(
                    user_id=user_id,
                    analysis_data=analysis_data,
                    db=db
                )
                
                # Agregar el ID del análisis a la respuesta
                result['analysis_id'] = str(saved_analysis.id)
                
                logger.info(f"Análisis guardado con ID: {saved_analysis.id}")
                
            except Exception as db_error:
                # Si falla el guardado, logueamos pero no bloqueamos la respuesta
                logger.error(f"Error al guardar análisis en BD: {str(db_error)}")
                result['analysis_id'] = None
                result['warning'] = 'Análisis completado pero no se pudo guardar en el historial'
            
            return EmotionAnalysisResponse(**result)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error en analyze_emotion: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al procesar la imagen: {str(e)}"
            )