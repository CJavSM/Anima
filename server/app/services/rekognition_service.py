import boto3
from botocore.exceptions import ClientError
import os
from dotenv import load_dotenv
from typing import Dict, List, Optional
import logging

load_dotenv()

# Configurar logging
logger = logging.getLogger(__name__)

class RekognitionService:
    """Servicio para análisis de emociones usando AWS Rekognition"""
    
    def __init__(self):
        """Inicializa el cliente de AWS Rekognition"""
        self.client = boto3.client(
            'rekognition',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('AWS_REGION', 'us-east-1')
        )
    
    def detect_faces_and_emotions(self, image_bytes: bytes) -> Dict:
        """
        Detecta rostros y emociones en una imagen
        
        Args:
            image_bytes: Imagen en bytes
            
        Returns:
            Dict con información de emociones detectadas
        """
        try:
            response = self.client.detect_faces(
                Image={'Bytes': image_bytes},
                Attributes=['ALL']
            )
            
            if not response.get('FaceDetails'):
                return {
                    'success': False,
                    'error': 'No se detectó ningún rostro en la imagen',
                    'faces_detected': 0
                }
            
            # Procesar el primer rostro detectado
            face = response['FaceDetails'][0]
            emotions = face.get('Emotions', [])
            
            # Ordenar emociones por confianza
            emotions_sorted = sorted(emotions, key=lambda x: x['Confidence'], reverse=True)
            
            # Obtener emoción dominante
            dominant_emotion = emotions_sorted[0] if emotions_sorted else None
            
            # Crear diccionario de todas las emociones
            emotions_dict = {
                emotion['Type']: round(emotion['Confidence'], 2)
                for emotion in emotions
            }
            
            return {
                'success': True,
                'faces_detected': len(response['FaceDetails']),
                'dominant_emotion': {
                    'type': dominant_emotion['Type'],
                    'confidence': round(dominant_emotion['Confidence'], 2)
                } if dominant_emotion else None,
                'all_emotions': emotions_dict,
                'face_details': {
                    'age_range': face.get('AgeRange'),
                    'gender': face.get('Gender'),
                    'smile': face.get('Smile'),
                    'eyeglasses': face.get('Eyeglasses'),
                    'sunglasses': face.get('Sunglasses'),
                    'beard': face.get('Beard'),
                    'mustache': face.get('Mustache'),
                    'eyes_open': face.get('EyesOpen'),
                    'mouth_open': face.get('MouthOpen')
                }
            }
            
        except ClientError as e:
            logger.error(f"Error de AWS Rekognition: {str(e)}")
            error_code = e.response['Error']['Code']
            
            if error_code == 'InvalidImageFormatException':
                error_msg = 'Formato de imagen inválido. Por favor usa JPG, PNG o WEBP.'
            elif error_code == 'ImageTooLargeException':
                error_msg = 'La imagen es demasiado grande. Máximo 5MB.'
            elif error_code == 'InvalidS3ObjectException':
                error_msg = 'Error al procesar la imagen.'
            else:
                error_msg = f'Error al analizar la imagen: {error_code}'
            
            return {
                'success': False,
                'error': error_msg,
                'error_code': error_code
            }
            
        except Exception as e:
            logger.error(f"Error inesperado: {str(e)}")
            return {
                'success': False,
                'error': 'Error inesperado al procesar la imagen',
                'details': str(e)
            }
    
    def validate_image(self, image_bytes: bytes, max_size_mb: int = 5) -> Dict:
        """
        Valida que la imagen cumpla con los requisitos
        
        Args:
            image_bytes: Imagen en bytes
            max_size_mb: Tamaño máximo en MB
            
        Returns:
            Dict con resultado de validación
        """
        size_mb = len(image_bytes) / (1024 * 1024)
        
        if size_mb > max_size_mb:
            return {
                'valid': False,
                'error': f'La imagen excede el tamaño máximo de {max_size_mb}MB'
            }
        
        # Verificar que sea una imagen válida usando magic bytes
        image_signatures = {
            b'\xff\xd8\xff': 'JPEG',
            b'\x89PNG\r\n\x1a\n': 'PNG',
            b'RIFF': 'WEBP'
        }
        
        is_valid = False
        for signature in image_signatures.keys():
            if image_bytes.startswith(signature):
                is_valid = True
                break
        
        if not is_valid:
            return {
                'valid': False,
                'error': 'Formato de imagen no válido. Usa JPG, PNG o WEBP.'
            }
        
        return {'valid': True}

# Instancia global del servicio
rekognition_service = RekognitionService()