# Node JS Tool to download full courses from Domestika

This script is a simple way to download a full course from Domestika.

> **Warning**
> You need to own the course you want to download. So yoi either have to have bought it or got it for "free" with your premium account.

## Installation

Once you downloaded the Project, open the "index.js" file.

You will find the following variables:

```bash
  const course_url = '';
  const subtitle_lang = 'en';
  const cookies;
  const _credentials_ = "";
```

The course_url is just the full URL of the course you want to download. For example:

https://www.domestika.org/en/courses/3086-creating-animated-stories-with-after-effects/course

IMPORTANT: you have to be on the "content" page. You know you are on the right site when at the end of the URL it says "/course".

To get the _domestika_session and the \_credentials_ you will need to install a chrome extension called Cookie-Editor.

After you installed the extension, log into domestika and open the extension.

In the window popup, look for "\_domestika_session", click to open it and copy the contents of the Value field into the value field under cookies.

then look for the "_credentials_" cookie, copy the value of that into the "_credentials_" variable.

If you want to change the subtitles that will be downloaded, just put the preferred language into the "subtitle_lang" variable. But make sure the language is avaiable first.

Before you can start it, you have to download N_m3u8DL-RE from here: https://github.com/nilaoda/N_m3u8DL-RE/releases. Get the lasted version binary and place it in the folder. Make sure its named corretly ("N_m3u8DL-RE.exe").

After you have done that, just open a terminal and type

```bash
npm i
```

After that to start the script type

```bash
npm run start.
```

All the courses will be downloaded in a folder called "domestika_courses/{coursename}/".

## Special Thanks

Special thanks to [@Cybasaint](https://www.github.com/Cybasaint) for helping with the project and giving me access to his domestika account for testing.
