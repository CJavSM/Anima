import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

class EmailService:
    """Servicio para envío de emails"""
    
    def __init__(self):
        self.smtp_server = "smtp.gmail.com"
        self.smtp_port = 587
        self.sender_email = "equipo.soporte.anima@gmail.com"
        self.sender_password = "lbnrxxmrqxsglxze"
    
    def send_email(self, 
                  recipient_email: str, 
                  subject: str, 
                  html_body: str, 
                  text_body: Optional[str] = None,
                  reply_to: Optional[str] = None) -> bool:
        """
        Envía un email HTML con fallback a texto plano
        
        Args:
            recipient_email: Email del destinatario
            subject: Asunto del email
            html_body: Contenido HTML del email
            text_body: Contenido en texto plano (opcional, se extrae del HTML si no se provee)
            reply_to: Email de respuesta (opcional)
            
        Returns:
            bool: True si se envió exitosamente, False en caso contrario
            
        Raises:
            HTTPException: En caso de error crítico
        """
        try:
            # Crear mensaje
            msg = MIMEMultipart('alternative')
            msg['From'] = self.sender_email
            msg['To'] = recipient_email
            msg['Subject'] = subject
            
            if reply_to:
                msg['Reply-To'] = reply_to
            
            # Si no se provee texto plano, intentar extraerlo del HTML
            if not text_body:
                text_body = self._html_to_text(html_body)
            
            # Adjuntar partes
            if text_body:
                part1 = MIMEText(text_body, 'plain', 'utf-8')
                msg.attach(part1)
            
            part2 = MIMEText(html_body, 'html', 'utf-8')
            msg.attach(part2)
            
            # Enviar email
            with smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=10) as server:
                server.starttls()
                server.login(self.sender_email, self.sender_password)
                server.send_message(msg)
            
            logger.info(f"✅ Email enviado a {recipient_email}: {subject}")
            return True
            
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"❌ Error de autenticación SMTP: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error de configuración del servicio de email"
            )
        except smtplib.SMTPException as e:
            logger.error(f"❌ Error SMTP enviando a {recipient_email}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error al enviar email. Intenta más tarde"
            )
        except Exception as e:
            logger.error(f"❌ Error inesperado enviando email: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error inesperado al enviar email"
            )
    
    def send_password_reset_code(self, email: str, name: str, code: str) -> bool:
        """
        Envía un email con código de recuperación de contraseña
        
        Args:
            email: Email del destinatario
            name: Nombre del usuario
            code: Código de recuperación de 6 dígitos
            
        Returns:
            bool: True si se envió exitosamente
        """
        subject = "🔐 Código de recuperación - Ánima"
        
        # Texto plano
        text_body = f"""
Hola {name},

Recibimos una solicitud para recuperar tu contraseña en Ánima.

Tu código de recuperación es: {code}

Este código es válido por 30 minutos.

Si no solicitaste este código, puedes ignorar este email.

Saludos,
Equipo Ánima
🎵 Música que refleja cómo te sentís
        """
        
        # HTML
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
                    padding: 0;
                    background-color: #f9fafb;
                }}
                .container {{
                    background: white;
                    margin: 20px;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                }}
                .header {{
                    background: linear-gradient(135deg, #3a1de1, #8356ef);
                    color: white;
                    padding: 40px 30px;
                    text-align: center;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 28px;
                    font-weight: 700;
                }}
                .header p {{
                    margin: 10px 0 0 0;
                    opacity: 0.9;
                    font-size: 16px;
                }}
                .content {{
                    padding: 40px 30px;
                }}
                .greeting {{
                    font-size: 18px;
                    margin-bottom: 20px;
                    color: #1f2937;
                }}
                .code-section {{
                    text-align: center;
                    margin: 30px 0;
                    padding: 25px;
                    background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
                    border-radius: 12px;
                    border-left: 4px solid #3a1de1;
                }}
                .code-label {{
                    font-size: 14px;
                    color: #6b7280;
                    margin-bottom: 10px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    font-weight: 600;
                }}
                .code {{
                    font-size: 36px;
                    font-weight: 800;
                    color: #3a1de1;
                    letter-spacing: 8px;
                    font-family: 'Monaco', 'Menlo', monospace;
                    margin: 10px 0;
                }}
                .expiry {{
                    color: #ef4444;
                    font-size: 14px;
                    font-weight: 600;
                    margin-top: 15px;
                }}
                .instructions {{
                    background: #eff6ff;
                    padding: 20px;
                    border-radius: 8px;
                    border-left: 4px solid #3b82f6;
                    margin: 25px 0;
                }}
                .instructions h3 {{
                    margin: 0 0 10px 0;
                    color: #1e40af;
                    font-size: 16px;
                }}
                .warning {{
                    background: #fef3c7;
                    padding: 15px;
                    border-radius: 8px;
                    border-left: 4px solid #f59e0b;
                    margin: 20px 0;
                    font-size: 14px;
                    color: #92400e;
                }}
                .footer {{
                    background: #374151;
                    color: #9ca3af;
                    padding: 30px;
                    text-align: center;
                }}
                .footer h3 {{
                    color: white;
                    margin: 0 0 10px 0;
                    font-size: 20px;
                }}
                .footer p {{
                    margin: 5px 0;
                    font-size: 14px;
                }}
                .emoji {{
                    font-size: 20px;
                    margin-right: 8px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 Recuperar Contraseña</h1>
                    <p>Ánima - Música que refleja cómo te sentís</p>
                </div>
                
                <div class="content">
                    <div class="greeting">
                        Hola <strong>{name}</strong>,
                    </div>
                    
                    <p>Recibimos una solicitud para recuperar tu contraseña en Ánima.</p>
                    
                    <div class="code-section">
                        <div class="code-label">Tu código de recuperación</div>
                        <div class="code">{code}</div>
                        <div class="expiry">⏰ Válido por 30 minutos</div>
                    </div>
                    
                    <div class="instructions">
                        <h3>📋 ¿Qué hacer ahora?</h3>
                        <p>1. Ve a la página de cambio de contraseña en Ánima</p>
                        <p>2. Ingresa tu email y este código</p>
                        <p>3. Crea una nueva contraseña segura</p>
                    </div>
                    
                    <div class="warning">
                        <strong>🛡️ Importante:</strong> Si no solicitaste este código, puedes ignorar este email. 
                        Tu cuenta está segura.
                    </div>
                </div>
                
                <div class="footer">
                    <h3>Ánima</h3>
                    <p><span class="emoji">🎵</span>Música basada en emociones</p>
                    <p><span class="emoji">🤖</span>Powered by AWS Rekognition & Spotify</p>
                    <p style="margin-top: 15px; font-size: 12px;">
                        equipo.soporte.anima@gmail.com
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(
            recipient_email=email,
            subject=subject,
            html_body=html_body,
            text_body=text_body
        )
    
    def _html_to_text(self, html: str) -> str:
        """Convierte HTML básico a texto plano"""
        import re
        
        # Remover tags HTML básicos
        text = re.sub(r'<[^>]+>', '', html)
        
        # Limpiar espacios múltiples
        text = re.sub(r'\s+', ' ', text)
        
        return text.strip()


# Instancia global del servicio
email_service = EmailService()