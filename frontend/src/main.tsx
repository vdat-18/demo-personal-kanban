import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "@fontsource/inter";
import "@fontsource/inter/500.css";
import "@fontsource/inter/700.css";
import "@fontsource-variable/plus-jakarta-sans";
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
