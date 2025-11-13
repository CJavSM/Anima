"""
Router para el sistema de contacto
Archivo: server/app/routes/contact_routes.py
"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/contact",
    tags=["Contacto"]
)

# Leer configuración de email desde variables de entorno
EMAIL_SENDER = os.getenv("EMAIL_SENDER", "equipo.soporte.anima@gmail.com")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")  # DEBE estar configurada en el entorno
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))

class ContactMessage(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    subject: str = Field(..., min_length=3, max_length=200)
    message: str = Field(..., min_length=10, max_length=2000)

@router.post(
    "/send",
    status_code=status.HTTP_200_OK,
    summary="Enviar mensaje de contacto",
    description="Envía un email desde el formulario de contacto"
)
async def send_contact_email(contact: ContactMessage):
    """
    Envía un email de contacto desde el formulario.
    
    - **name**: Nombre completo del remitente
    - **email**: Email del remitente
    - **subject**: Asunto del mensaje
    - **message**: Contenido del mensaje
    """
    try:
        logger.info(f"📧 Enviando email de: {contact.name} <{contact.email}>")
        
        # Crear mensaje
        msg = MIMEMultipart('alternative')
        msg['From'] = EMAIL_SENDER
        msg['To'] = EMAIL_SENDER
        msg['Subject'] = f"[Contacto Ánima] {contact.subject}"
        msg['Reply-To'] = contact.email
        
        # Cuerpo del email en texto plano
        text_body = f"""
Nueva consulta desde el formulario de contacto de Ánima

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INFORMACIÓN DEL REMITENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Nombre:  {contact.name}
Email:   {contact.email}
Asunto:  {contact.subject}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MENSAJE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{contact.message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Este mensaje fue enviado desde el formulario de contacto de Ánima.
Para responder, haz clic en "Responder" o envía un email a: {contact.email}
        """
        
        # Cuerpo del email en HTML
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: linear-gradient(135deg, #4424d4, #764ba2);
                    color: white;
                    padding: 30px;
                    border-radius: 12px 12px 0 0;
                    text-align: center;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 24px;
                }}
                .content {{
                    background: #f9fafb;
                    padding: 30px;
                    border: 1px solid #e5e7eb;
                }}
                .info-box {{
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }}
                .info-row {{
                    display: flex;
                    margin-bottom: 12px;
                }}
                .info-label {{
                    font-weight: 600;
                    color: #4424d4;
                    min-width: 80px;
                }}
                .message-box {{
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    border-left: 4px solid #4424d4;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                }}
                .footer {{
                    background: #374151;
                    color: #9ca3af;
                    padding: 20px;
                    border-radius: 0 0 12px 12px;
                    text-align: center;
                    font-size: 12px;
                }}
                .btn-reply {{
                    display: inline-block;
                    background: #4424d4;
                    color: white;
                    forecolor: white;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 8px;
                    margin-top: 15px;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📧 Nuevo Mensaje de Contacto</h1>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">Ánima - Música que refleja cómo te sentís</p>
            </div>
            
            <div class="content">
                <div class="info-box">
                    <h2 style="margin-top: 0; color: #1f2937;">Información del Remitente</h2>
                    <div class="info-row">
                        <span class="info-label">👤 Nombre:</span>
                        <span>{contact.name}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">📧 Email:</span>
                        <span>{contact.email}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">📝 Asunto:</span>
                        <span>{contact.subject}</span>
                    </div>
                                        <!-- Email button: table-based for better compatibility across clients -->
                                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-top:15px;">
                                            <tr>
                                                <td align="center" bgcolor="#4424d4" style="border-radius:8px;">
                                                    <a href="mailto:{contact.email}" target="_blank" style="display:inline-block; padding:12px 24px; color:#ffffff !important; text-decoration:none; font-weight:600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                                        Responder
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                        <p style="margin-top:8px; font-size:13px; color:#6b7280;">O responde manualmente a: <a href="mailto:{contact.email}" style="color:#4424d4; text-decoration:underline;">{contact.email}</a></p>
                </div>
                
                <h3 style="color: #1f2937; margin-bottom: 10px;">💬 Mensaje:</h3>
                <div class="message-box">
                    {contact.message}
                </div>
            </div>
            
            <div class="footer">
                <p>Este mensaje fue enviado desde el formulario de contacto de <strong>Ánima</strong></p>
                <p style="margin: 5px 0 0 0;">🎵 Música basada en emociones • Powered by AWS Rekognition & Spotify</p>
            </div>
        </body>
        </html>
        """
        
        # Adjuntar ambas versiones
        part1 = MIMEText(text_body, 'plain', 'utf-8')
        part2 = MIMEText(html_body, 'html', 'utf-8')
        msg.attach(part1)
        msg.attach(part2)
        
        # Verificar que las credenciales están configuradas
        if not EMAIL_PASSWORD:
            logger.error("❌ Credenciales de email no configuradas en las variables de entorno")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Credenciales de email no configuradas en el servidor. Contacta al administrador."
            )

        # Enviar email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(EMAIL_SENDER, EMAIL_PASSWORD)
            server.send_message(msg)
        
        logger.info(f"✅ Email enviado correctamente a {EMAIL_SENDER}")
        
        return {
            "success": True,
            "message": "Mensaje enviado correctamente. Te responderemos pronto."
        }
        
    except smtplib.SMTPAuthenticationError:
        logger.error("❌ Error de autenticación SMTP")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error de autenticación con el servidor de email. Por favor contacta al administrador."
        )
    except smtplib.SMTPException as e:
        logger.error(f"❌ Error SMTP: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al enviar el email. Por favor intenta de nuevo más tarde."
        )
    except Exception as e:
        logger.error(f"❌ Error inesperado: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error inesperado al enviar el mensaje. Por favor intenta de nuevo."
        )

@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
    summary="Verificar servicio de contacto",
    description="Endpoint de health check para el servicio de contacto"
)
async def health_check():
    """
    Verifica que el servicio de contacto esté funcionando correctamente.
    """
    return {
        "status": "ok",
        "service": "contact",
        "email_configured": bool(EMAIL_SENDER and EMAIL_PASSWORD),
        "smtp_server": SMTP_SERVER,
        "smtp_port": SMTP_PORT
    }