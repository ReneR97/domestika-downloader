# Node JS Tool to download full courses from Domestika

This script is a simple way to download a full course from Domestika with advanced features including parallel downloads, optional H.265 transcoding, and robust error handling.

> **Warning**
> You need to own the course you want to download. So you either have to have bought it or got it for "free" with your premium account.

## Installation

Once you downloaded the Project, open the "index.js" file.

You will find the following configuration variables:

```javascript
const course_urls = ['YOUR_COURSE_URLs_HERE', 'YOUR_COURSE_URLs_HERE'];
const subtitle_lang = 'en';
const transcode_to_hevc = false;
const use_nvenc = false;
const max_concurrent_processes = 3;
const machine_os = '';
const cookies = [/* ... */];
const _credentials_ = 'YOUR_CREDENTIALS_HERE';
```

### Configuration Parameters

- **`course_urls`**: Array of course URLs to download. Each URL should point to the course content page (ending with "/course"). Example:
  ```
  https://www.domestika.org/en/courses/3086-creating-animated-stories-with-after-effects/course
  ```
  IMPORTANT: You must be on the "content" page. You know you are on the right site when the URL ends with "/course".

- **`subtitle_lang`**: Language code for subtitles (e.g., "en", "es"). Ensure the language is available for the course before setting.

- **`transcode_to_hevc`**: Set to `true` to enable automatic transcoding to H.265/HEVC after download if needed. This reduces file size while maintaining quality. Set to `false` to keep original format.

- **`use_nvenc`**: Only relevant if `transcode_to_hevc` is `true`.
  - `true`: Use NVIDIA GPU hardware acceleration (requires NVIDIA GPU with NVENC support)
  - `false`: Use CPU-based encoding (libx265)

- **`max_concurrent_processes`**: Number of downloads/transcodes to run in parallel (recommended: 2-4). Higher values speed up the process but consume more resources.

- **`machine_os`**: Operating system identifier:
  ```javascript
  const machine_os = "win";  // For Windows
  const machine_os = "mac";  // For MacOS/Linux
  ```

### Authentication Setup

To get the `_domestika_session` cookie and `_credentials_`:

1. Install the [Cookie-Editor](https://chrome.google.com/webstore/detail/cookie-editor) Chrome extension
2. Log into Domestika
3. Open the Cookie-Editor extension
4. Find "\_domestika_session", click to open it, and copy the Value field into the `value` field under `cookies` in the script
5. Find "\_credentials_", copy its value into the `_credentials_` variable

### Dependencies

This script requires the following tools to be installed:

1. **N_m3u8DL-RE**: Download from [GitHub releases](https://github.com/nilaoda/N_m3u8DL-RE/releases)
   - Get the latest version binary
   - Scroll to the 'Assets' section
   - Download the appropriate binary for your machine:
     - Windows: `N_m3u8DL-RE.exe` (arm64 or x64)
     - MacOS: `N_m3u8DL-RE` (arm64 or x64)
     - Linux: `N_m3u8DL-RE` (arm64 or x64)
   - Extract and place the binary in the project root directory
   - **DO NOT rename the binary**

2. **ffmpeg**: Required for video processing (codec detection and optional transcoding)
   - Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html) or use package managers like Winget/Chocolatey
   - MacOS: `brew install ffmpeg`
   - Linux: `sudo apt install ffmpeg` (Debian/Ubuntu) or equivalent for your distribution
   - Ensure `ffmpeg` and `ffprobe` are in your system PATH

### Installation and Usage

1. Install Node.js dependencies:
   ```bash
   npm i
   ```

2. Start the download:
   ```bash
   npm run start
   ```

### Platform-Specific Notes

**MacOS/Linux**: You may encounter a permission error:
```bash
N_m3u8DL-RE: Permission denied
```

Grant execute permissions:
```bash
chmod +x N_m3u8DL-RE
```

### Output

All courses will be downloaded to:
```
domestika_courses/{coursename}/{section}/{unit}/{video_files}
```

## Features

- **Parallel Processing**: Downloads and transcodes multiple videos simultaneously for faster completion
- **Intelligent Transcoding**: Automatically detects video codec and only transcodes when necessary
- **H.265 Support**: Optional transcoding to H.265/HEVC with GPU or CPU encoding
- **Robust Error Handling**: Continues processing remaining videos even if individual downloads fail
- **Final Project Support**: Automatically downloads the course's final project if available
- **Subtitle Download**: Automatically downloads subtitles in your preferred language

## Performance Optimization

- Adjust `max_concurrent_processes` based on your system:
  - 2-4: Balanced for most systems
  - Higher values: Faster on powerful machines with good internet
  - Lower values: More stable on limited resources
- Enable `use_nvenc` if you have an NVIDIA GPU for significantly faster transcoding

## Special Thanks

Special thanks to [@Cybasaint](https://www.github.com/Cybasaint) for helping with the project and giving me access to his domestika account for testing.