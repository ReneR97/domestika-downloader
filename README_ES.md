# Domestika Course Downloader V2

[🇺🇸 Read in English](README.md)

Este proyecto es una versión mejorada del [Domestika Course Downloader original](https://github.com/ReneR97/domestika-downloader) creado por ReneR97.

Nueva versión desarrollada por Chugeno, con el código implementado por Claude Sonnet (Anthropic).

⚠️ **IMPORTANTE:** Esta herramienta solo funciona con cursos que hayas comprado. No puede y no debe utilizarse para descargar cursos que no hayas adquirido. Debes ser el propietario legítimo de los cursos que deseas descargar.

## ¡Apoya el Proyecto!

Si encuentras útil esta herramienta, ¡considera apoyar su desarrollo! Tu apoyo ayuda a mantener y mejorar el proyecto.

### Buy Me a Coffee
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Apoyar-yellow.svg)](http://buymeacoffee.com/chugeno)

### MercadoPago (para supporters latinoamericanos)
[![MercadoPago](https://img.shields.io/badge/MercadoPago-Apoyar-blue.svg)](https://link.mercadopago.com.ar/eugenioazurmendi)

¡Tu apoyo ayuda a mantener vivo este proyecto y permite nuevas funcionalidades! ☕️

## Características

- ✨ Descarga múltiples cursos simultáneamente
- 🔄 Acepta cualquier formato de URL de Domestika:
  - URLs de unidades específicas (`/units/...`)
  - URLs de la página principal del curso
  - URLs completas (`/course`)
- 🔐 Gestión automática de credenciales:
  - Almacenamiento seguro en archivo `.env`
  - Solicitud interactiva de cookies cuando son necesarias
  - Validación de credenciales
- 📝 Soporte para subtítulos en múltiples idiomas:
  - Español
  - Inglés
  - Portugués
  - Francés
  - Alemán
  - Italiano
  - Los subtítulos se incrustan como pista en el video MP4
  - Se genera archivo SRT independiente con el mismo nombre del video
- 🚀 Características adicionales:
  - Descarga paralela de videos
  - Progreso detallado de descargas
  - Manejo de errores inteligente
  - Reintentos automáticos con cookies inválidas

## Requisitos Previos

1. **ffmpeg**:
```bash
brew install ffmpeg
```

2. **N_m3u8DL-RE**:
- Descarga la última versión desde [GitHub](https://github.com/nilaoda/N_m3u8DL-RE/releases)
- Colócalo en la carpeta del proyecto
- Renómbralo a "N_m3u8DL-RE" (sin extensión)
- Asegúrate de que tenga permisos de ejecución:
```bash
chmod +x N_m3u8DL-RE
```

3. **Node.js y npm**

## Instalación

1. Clona el repositorio:
```bash
git clone [URL_DEL_REPOSITORIO]
cd domestika-downloader
```

2. Instala las dependencias:
```bash
npm install
```

## Uso

1. Ejecuta el programa:
```bash
npm start
```

2. El programa te guiará interactivamente:

   a. **Ingreso de URLs**:
   - Puedes ingresar una o múltiples URLs separadas por espacios
   - Las URLs pueden ser de cualquier página del curso
   - Ejemplos válidos:
     ```
     https://www.domestika.org/es/courses/1234-nombre-del-curso
     https://www.domestika.org/es/courses/1234-nombre-del-curso/units/5678-unidad
     https://www.domestika.org/es/courses/1234-nombre-del-curso/course
     ```

   b. **Selección de subtítulos**:
   - Elige si deseas descargar subtítulos y en qué idioma

3. **Gestión de Credenciales**:
   - En el primer uso o si las cookies son inválidas, el programa te pedirá:
     1. Abrir las Herramientas de Desarrollo (F12)
     2. Ir a la pestaña Storage -> Cookies
     3. Copiar el valor de las cookies:
        - `_domestika_session`
        - `_credentials`
   - Las credenciales se guardan automáticamente en `.env`

4. **Durante la Descarga**:
   - Verás el progreso de cada video
   - Se mostrarán mensajes de estado detallados
   - En caso de error, se te ofrecerá actualizar las cookies

## Estructura de Archivos

Los cursos se descargan en la carpeta `domestika_courses/` con la siguiente estructura:
```
domestika_courses/
└── Nombre del Curso/
    └── Sección/
        ├── Nombre del Curso - U1 - 1_Nombre del Video.mp4
        └── Nombre del Curso - U1 - 1_Nombre del Video.srt
```

## Notas

- Esta versión está optimizada para macOS
- Las credenciales se almacenan localmente en `.env` (no se suben a GitHub)
- Si encuentras errores de cookies inválidas, el programa te guiará para actualizarlas
- Los videos se descargan en la mejor calidad disponible (1920x1080)

## Créditos

- Proyecto original: [ReneR97](https://github.com/ReneR97/domestika-downloader)
- Nueva versión: Chugeno
- Implementación del código: Claude Sonnet (Anthropic)

## Limitaciones

- Versión actual solo para macOS
- Requiere tener una cuenta de Domestika con acceso a los cursos
- Las cookies deben actualizarse periódicamente
