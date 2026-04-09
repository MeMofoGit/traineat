import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
//
// HTTPS + host: true permite abrir la app desde móvil en la misma LAN
// (imprescindible para que la cámara/getUserMedia funcione en móvil:
// los navegadores móviles bloquean getUserMedia en contextos HTTP
// no-localhost).
//
// basicSsl genera un certificado autofirmado al arrancar. La primera
// vez que te conectes desde el móvil tendrás que aceptar el aviso de
// "conexión no privada" (es seguro — es tu propio PC).
export default defineConfig({
  plugins: [
    react(),
    basicSsl(),
  ],
  server: {
    host: true, // expone en 0.0.0.0, imprime la URL de LAN al arrancar
    https: true,
  },
})
