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

Before you can start it, you have to download yt-dlp from here: https://github.com/yt-dlp/yt-dlp/releases. Get the lasted version binary and place it in the folder. Make sure its named corretly ("yt-dlp.exe").

After you have done that, just open a terminal and start the script with "npm run start".

All the courses will be downloaded in a folder called "domestika_courses/{coursename}/".
