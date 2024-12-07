# Node JS Tool to download full courses from Domestika

This script is a simple way to download a full course from Domestika.

> **Warning**
> You need to own the course you want to download. So you either have to have bought it or got it for "free" with your premium account.

## Installation

Once you downloaded the Project, open the "index.js" file.

You will find the following variables:

```javascript
  const course_url = "";
  const subtitle_lang = "en";
  const machine_os = "";
  const cookies;
  const _credentials_ = "";
```

The `course_url` is just the full URL of the course you want to download. For example:

https://www.domestika.org/en/courses/3086-creating-animated-stories-with-after-effects/course

IMPORTANT: you have to be on the "content" page. You know you are on the right site when at the end of the URL it says "/course".

To get the _domestika_session and the \_credentials_ you will need to install a chrome extension called Cookie-Editor.

After you installed the extension, log into domestika and open the extension.

In the window popup, look for "\_domestika_session", click to open it and copy the contents of the Value field into the value field under cookies.

Then look for the "_credentials_" cookie, copy the value of that into the "_credentials_" variable.

If you want to change the subtitles that will be downloaded, just put the preferred language into the "subtitle_lang" variable. But make sure the language is avaiable first.

The machine_os is just to specify whether the machine you are on is Windows or MacOS/Linux. If you are on a Windows machine, be sure to set:
```javascript
const machine_os = "win";
```
Otherwise if you are on MacOS or Linux:
```javascript
const machine_os = "mac";
```

Before you can start it, you have to download N_m3u8DL-RE from here: https://github.com/nilaoda/N_m3u8DL-RE/releases. Get the lastest version binary and place it in the root directory of the folder. To do so, simply scroll down to the 'Assets' section and download the appropriate binary based on your machine. Note there are binaries for Windows (on arm64 and x64 architectures), MacOS (on arm64 and x64 architectures) and Linux (on arm64 and x64 architectures). Download the compressed file that corresponds to your machine and architecture, unzip it, then place the binary in this repo's root folder. 

NOTE: For Windows, the file will be called "N_m3u8DL-RE.exe", while on MacOS and Linux, the file will be called "N_m3u8DL-RE". Do not change these names.

Also be sure you have ffmpeg installed.

After you have done that, navigate to the repo, open a terminal and type

```bash
npm i
```

After that, to start the script type

```bash
npm run start
```

NOTE: On MacOS and Linux, depending on your perimssions, you may encounter an error from `N_m3u8DL-RE`:
```bash
N_m3u8DL-RE: Permission denied
```

If this occurs, open a terminal and grant execute permissions for the binary:
```bash
chmod +x N_m3u8DL-RE
```
This should resolve the issue, and you can re-run the start command.

All the courses will be downloaded in a folder called "domestika_courses/{coursename}/".

## Special Thanks

Special thanks to [@Cybasaint](https://www.github.com/Cybasaint) for helping with the project and giving me access to his domestika account for testing.
