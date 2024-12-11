# Domestika Course Downloader V2

[🇪🇸 Leer en Español](README_ES.md)

This is an enhanced version of the [Original Domestika Course Downloader](https://github.com/ReneR97/domestika-downloader) created by ReneR97.

New version developed by Chugeno, with code implementation by Claude Sonnet (Anthropic).

## Support the Project!

If you find this tool useful, consider supporting its development! Your support helps maintain and improve the project.

### Buy Me a Coffee
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Support-yellow.svg)](http://buymeacoffee.com/chugeno)

### MercadoPago (for Latin American supporters)
[![MercadoPago](https://img.shields.io/badge/MercadoPago-Support-blue.svg)](https://link.mercadopago.com.ar/eugenioazurmendi)

Your support helps keep this project alive and enables new features! ☕️

## Features

- ✨ Download multiple courses simultaneously
- 🔄 Accepts any Domestika URL format:
  - Specific unit URLs (`/units/...`)
  - Course main page URLs
  - Complete URLs (`/course`)
- 🔐 Automatic credential management:
  - Secure storage in `.env` file
  - Interactive cookie request when needed
  - Credential validation
- 📝 Support for subtitles in multiple languages:
  - Spanish
  - English
  - Portuguese
  - French
  - German
  - Italian
  - Subtitles are embedded as tracks in MP4 video
  - Independent SRT file is generated with the same video name
- 🚀 Additional features:
  - Parallel video downloads
  - Detailed download progress
  - Smart error handling
  - Automatic retries with invalid cookies

## Prerequisites

1. **ffmpeg**:
```bash
brew install ffmpeg
```

2. **N_m3u8DL-RE**:
- Download the latest version from [GitHub](https://github.com/nilaoda/N_m3u8DL-RE/releases)
- Place it in the project folder
- Rename it to "N_m3u8DL-RE" (without extension)
- Make sure it has execution permissions:
```bash
chmod +x N_m3u8DL-RE
```

3. **Node.js and npm**

## Installation

1. Clone the repository:
```bash
git clone [REPOSITORY_URL]
cd domestika-downloader
```

2. Install dependencies:
```bash
npm install
```

## Usage

1. Run the program:
```bash
npm start
```

2. The program will guide you interactively:

   a. **URL Input**:
   - You can enter one or multiple URLs separated by spaces
   - URLs can be from any course page
   - Valid examples:
     ```
     https://www.domestika.org/en/courses/1234-course-name
     https://www.domestika.org/en/courses/1234-course-name/units/5678-unit
     https://www.domestika.org/en/courses/1234-course-name/course
     ```

   b. **Subtitle Selection**:
   - Choose if you want to download subtitles and in which language

3. **Credential Management**:
   - On first use or if cookies are invalid, the program will ask you to:
     1. Open Developer Tools (F12)
     2. Go to Storage -> Cookies tab
     3. Copy the cookie values:
        - `_domestika_session`
        - `_credentials`
   - Credentials are automatically saved in `.env`

4. **During Download**:
   - You'll see the progress of each video
   - Detailed status messages will be shown
   - In case of error, you'll be offered to update cookies

## File Structure

Courses are downloaded to the `domestika_courses/` folder with the following structure:
```
domestika_courses/
└── Course Name/
    └── Section/
        ├── Course Name - U1 - 1_Video Name.mp4
        └── Course Name - U1 - 1_Video Name.srt
```

## Notes

- This version is optimized for macOS
- Credentials are stored locally in `.env` (not uploaded to GitHub)
- If you encounter invalid cookie errors, the program will guide you to update them
- Videos are downloaded in the best available quality (1920x1080)

## Credits

- Original project: [ReneR97](https://github.com/ReneR97/domestika-downloader)
- New version: Chugeno
- Code implementation: Claude Sonnet (Anthropic)

## Limitations

- Current version is for macOS only
- Requires a Domestika account with course access
- Cookies need to be updated periodically
