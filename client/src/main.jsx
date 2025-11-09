import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/theme.css'
import './index.css'
import App from './App.jsx'
// Register chart.js components globally to avoid registration issues in components
import 'chart.js/auto';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)