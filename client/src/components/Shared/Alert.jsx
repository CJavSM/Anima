import React, { useEffect } from 'react';
import './Alert.css';

const Alert = ({ type = 'info', message = '', onClose }) => {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => {
      if (typeof onClose === 'function') onClose();
    }, 5000);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className={`anima-alert anima-alert-${type}`} role="alert">
      <div className="anima-alert-content">{message}</div>
      <button
        className="anima-alert-close"
        aria-label="Cerrar alerta"
        onClick={() => typeof onClose === 'function' && onClose()}
      >
        ×
      </button>
    </div>
  );
};

export default Alert;
