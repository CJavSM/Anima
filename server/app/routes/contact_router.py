"""
Servicio para envío de emails de contacto
Requiere: pip install python-multipart aiosmtplib email-validator
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

router = APIRouter(prefix="/api/contact", tags=["contact"])

# Configuración de email
EMAIL_SENDER = "equipo.soporte.anima@gmail.com"
EMAIL_PASSWORD = "lbnrxxmrqxsglxze"
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

class ContactMessage(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str

@router.post("/send")
async def send_contact_email(contact: ContactMessage):
    """
    Envía un email de contacto desde el formulario
    """
    try:
        # Crear mensaje
        msg = MIMEMultipart()
        msg['From'] = EMAIL_SENDER
        msg['To'] = EMAIL_SENDER  # El email va al mismo remitente (tu inbox)
        msg['Subject'] = f"[Contacto Ánima] {contact.subject}"
        
        # Cuerpo del email
        body = f"""
        Nueva consulta desde el formulario de contacto de Ánima
        
        Nombre: {contact.name}
        Email: {contact.email}
        Asunto: {contact.subject}
        
        Mensaje:
        {contact.message}
        
        ---
        Este mensaje fue enviado desde el formulario de contacto de Ánima.
        Para responder, utiliza el email: {contact.email}
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Enviar email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_SENDER, EMAIL_PASSWORD)
            server.send_message(msg)
        
        return {
            "success": True,
            "message": "Mensaje enviado correctamente"
        }
        
    except smtplib.SMTPAuthenticationError:
        raise HTTPException(
            status_code=500,
            detail="Error de autenticación con el servidor de email"
        )
    except smtplib.SMTPException as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al enviar el email: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error inesperado: {str(e)}"
        )

@router.get("/health")
async def health_check():
    """
    Verifica que el servicio de contacto esté funcionando
    """
    return {"status": "ok", "service": "contact"}