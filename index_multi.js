const puppeteer = require('puppeteer'); // Import Puppeteer module for browser automation
const cheerio = require('cheerio'); // Import Cheerio module for HTML parsing and manipulation
const util = require('util'); // Import util module for function promisification
const exec = util.promisify(require('child_process').exec); // Promisify exec function for executing system commands asynchronously
const m3u8ToMp4 = require('m3u8-to-mp4'); // Import m3u8-to-mp4 module for converting m3u8 files to mp4 files
const fs = require('fs'); // Import fs module for file operations

const debug = true; // Enable debug mode
const debug_data = []; // Array to store debug data

const subtitle_lang = 'en'; // Desired subtitle language
const subtitle_lang2 = 'fr'; // Desired subtitle 2 language

// Cookies used to retrieve video information
const cookies = [
  {
    name: '_domestika_session',
    value: 'YOUR_domestika_session_Value_with_Cookie_editor',
    domain: 'www.domestika.org',
  },
];

// Credentials required for the access token to obtain the final project
// Note: it changes frequently and needs to be updated regularly.
const _credentials_ = 'YOUR__credentials__Value_with_Cookie_editor';

let fileWriteLog = []; // Array to store file writing information

downloadCourseUrls(); // Call the main function for iterative downloads
//scrapeSite(); // Call the main function for simple download

async function scrapeSite(courseUrl) {
    const course_url = courseUrl;
    console.log('Course URL in the scrapeSite function:', course_url); // Display the course URL in the console
    const browser = await puppeteer.launch({ headless: 'new' }); // Use the new Headless mode
    const page = await browser.newPage(); // Create a new page in the browser
    page.setDefaultNavigationTimeout(90000); // Increase the navigation timeout to 90 seconds (or more if needed)

    await page.setCookie(...cookies); // Set the cookies on the page
    await page.goto(course_url); // Go to the course URL

    const html = await page.content(); // Get the HTML content of the page
    const $ = cheerio.load(html); // Load the HTML into Cheerio for analysis

    let allVideos = []; // Array to store all the videos of the course

    let units = $('h4.h2.unit-item__title a'); // Select all the links of the course units

    let title = $('h1.course-header-new__title')
        .text()
        .trim()
        .replace(/[/\\?%*:|"<>]/g, '-'); // Get the course title and format it to be usable as a folder name

    let totalVideos = 1; // Variable to count the total number of videos

    // Retrieve all the m3u8 file links
    for (let i = 0; i < units.length - 1; i++) {
        let videoData = await getInitialProps($(units[i]).attr('href')); // Call the function to retrieve initial video information
        allVideos.push({
            title: $(units[i])
                .text()
                .trim()
                .replace(/[/\\?%*:|"<>]/g, '-'), // Get the unit title and format it to be usable as a folder name
            videoData: videoData, // Add the video information to the array
        });

        totalVideos += videoData.length; // Add the number of videos in the unit to the total
    }

    let access_token = decodeURI(_credentials_); // Decode the access token from the credentials
    let regex_token = /accessToken\":\"(.*?)\"/gm;
    access_token = regex_token.exec(access_token)[1]; // Extract the access token from the string

    let regex_final = /courses\/(.*?)-/gm;
    let final_project_id = regex_final.exec($(units[units.length - 1]).attr('href'))[1]; // Extract the ID of the final project from the URL
    let final_data = await fetchFromApi(`https://api.domestika.org/api/courses/${final_project_id}/final-project?with_server_timing=true`, 'finalProject.v1', access_token); // Call the API to get information about the final project
    final_project_id = final_data.data.relationships.video.data.id; // Get the ID of the final project video
    final_data = await fetchFromApi(`https://api.domestika.org/api/videos/${final_project_id}?with_server_timing=true`, 'video.v1', access_token); // Call the API to get information about the final project video

      allVideos.push({
          title: 'Final project',
          videoData: [{ playbackURL: final_data.data.attributes.playbackUrl, title: 'Final project' }],
      }); // Add the information about the final project video to the array

      let count = 0; // Variable to count the number of downloaded videos

      // Loop through all the videos and download them
      for (let i = 0; i < allVideos.length; i++) {
          const unit = allVideos[i];
          for (let a = 0; a < unit.videoData.length; a++) {
              const vData = unit.videoData[a];

              // Check if the destination directory exists, if not, create it
              if (!fs.existsSync(`domestika_courses/${title}/${unit.title}/`)) {
                  fs.mkdirSync(`domestika_courses/${title}/${unit.title}/`, { recursive: true });
              }

              // Build the filename to check
              let filenameToCheck = `domestika_courses/${title}/${unit.title}/${a}_${vData.title}.mp4`;

              // Check if the file already exists
              if (!fs.existsSync(filenameToCheck)) {
                  // Execute the command to download the video
                  let log = await exec(`./N_m3u8DL-RE -sv res="1080*":codec=hvc1:for=best "${vData.playbackURL}" --save-dir "domestika_courses/${title}/${unit.title}" --save-name "${a}_${vData.title}"`);
                  let log2 = await exec(`./N_m3u8DL-RE --auto-subtitle-fix --sub-format SRT --select-subtitle lang="${subtitle_lang}":for=all "${vData.playbackURL}" --save-dir "domestika_courses/${title}/${unit.title}" --save-name "${a}_${vData.title}"`);
                  let log3 = await exec(`./N_m3u8DL-RE --auto-subtitle-fix --sub-format SRT --select-subtitle lang="${subtitle_lang2}":for=all "${vData.playbackURL}" --save-dir "domestika_courses/${title}/${unit.title}" --save-name "${a}_${vData.title}"`);

                  if (debug) {
                      debug_data.push({
                          videoURL: vData.playbackURL,
                          output: [log, log2, log3],
                      });
                  }
              } else {
                  console.log(`The file ${filenameToCheck} already exists. Skipping to the next one.`);
              }

           
              // Add the file writing information to the fileWriteLog array
              fileWriteLog.push({
                  videoTitle: vData.title,                             // Video title
                  fileName: `${a}_${vData.title}`,                     // File name
                  filePath: `domestika_courses/${title}/${unit.title}`, // File path
              });

              count++;
              console.log(`Download ${count}/${totalVideos} Downloaded`); // Display the download progress
          }
}

await browser.close(); // Close the Puppeteer browser

if (debug) {
    fs.writeFileSync('log.json', JSON.stringify(debug_data)); // Write the debug data to a JSON file
    console.log('Log File Saved'); // Indicate that the log file has been saved
}

console.log('All Videos Downloaded'); // Indicate that all videos have been downloaded

fs.writeFileSync('file_write_log.json', JSON.stringify(fileWriteLog, null, 2)); // Save the content of the fileWriteLog array to a log file
console.log('File Write Log Saved'); // Display a message indicating that the log file has been saved
}


async function getInitialProps(url) {
    const browser = await puppeteer.launch({ headless: 'new' }); // Use the new Headless mode
    const page = await browser.newPage(); // Create a new page in the browser
    page.setDefaultNavigationTimeout(90000); // Increase the navigation timeout to 90 seconds (or more if needed)

    await page.setCookie(...cookies); // Set the cookies on the page
    await page.goto(url); // Go to the specified URL

    const data = await page.evaluate(() => window.__INITIAL_PROPS__); // Execute JavaScript code in the page context to retrieve the initial data

    let videoData = []; // Array to store video information

    if (data && data != undefined) {
        for (let i = 0; i < data.videos.length; i++) {
            const el = data.videos[i];

            videoData.push({
                playbackURL: el.video.playbackURL, // Get the video playback URL
                title: el.video.title, // Get the video title
            });
        }
    }

    await browser.close(); // Close the browser

    return videoData; // Return the video information
}

async function getInitialProps(url) {
    //const browser = await puppeteer.launch(); // Launches a new browser instance
    const browser = await puppeteer.launch({ headless: 'new'}); // Uses the new Headless mode
    const page = await browser.newPage(); // Creates a new page
    page.setDefaultNavigationTimeout(90000);    // Increases the navigation timeout to 90 seconds (or more if needed)

    await page.setCookie(...cookies); // Sets cookies on the page
    await page.goto(url); // Navigates to the specified URL

    const data = await page.evaluate(() => window.__INITIAL_PROPS__); // Executes JavaScript code in the page context to retrieve initial data

    let videoData = []; // Array to store video information

    if (data && data != undefined) {
        for (let i = 0; i < data.videos.length; i++) {
            const el = data.videos[i];

            videoData.push({
                playbackURL: el.video.playbackURL, // Retrieves the video's playback URL
                title: el.video.title, // Retrieves the video's title
            });
        }
    }

    await browser.close(); // Closes the browser

    return videoData; // Returns the video information
}


async function fetchFromApi(apiURL, accept_version, access_token) {
  try {
    const response = await fetch(apiURL, {
      method: 'get',
      headers: {
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json',
        'x-dmstk-accept-version': accept_version,
        authorization: `Bearer ${access_token}`,
      },
    }); // Calls the API with the specified parameters
    const data = await response.json(); // Retrieves the JSON response

    console.log('Response JSON:', data); // Logs the JSON response to the console

    return data; // Returns the response data
  } catch (error) {
    console.error('Error:', error); // Logs the error to the console
    throw error; // Throws a new error
  }
}


// Function to read the downloaded file and progressively download each URL

async function downloadCourseUrls() {
  const courseListFile = 'course_list.txt'; // Defines the file name containing the course URLs
  let courseUrls = fs.readFileSync(courseListFile, 'utf-8').split('\n'); // Reads the file content and splits the lines into a list of course URLs
  courseUrls = courseUrls.filter(url => url.trim() !== ''); // Removes empty lines from the list of course URLs

  if (courseUrls.length === 0) { // Checks if there are no course URLs
    console.log('No course URLs found in the file.');
    return; // Exits the function if no URLs are present
  }

  let i = 0; // Initializes a counter to iterate through the course URLs
  while (i < courseUrls.length) { // Loops as long as there are remaining course URLs
    const courseUrl = courseUrls[i].trim(); // Retrieves the current course URL and removes whitespace
    console.log('\nCourse URL from downloadCourseUrls loop:'+ courseUrl + '\n'); // Logs the course URL to the console

    try {
      await scrapeSite(courseUrl); // Calls the scrapeSite function to download the course corresponding to the URL

      const downloadedUrlsFile = 'downloaded_urls.txt'; // Defines the file name to save the downloaded URLs
      fs.appendFileSync(downloadedUrlsFile, courseUrl + '\n'); // Appends the downloaded URL to the end of the file with a line break
      console.log('\nURL finished downloading, added to downloaded_urls.txt: ' + courseUrl + '\n'); // Indicates that the URL has been added to the downloaded_urls.txt file

      courseUrls.splice(i, 1); // Removes the downloaded URL from the list of remaining URLs
      fs.writeFileSync(courseListFile, courseUrls.join('\n')); // Writes the remaining URLs to the file
      console.log('\ncourse_list.txt file has been updated\n'); // Indicates that the course_list.txt file has been updated

      i++; // Increments the counter to move to the next URL
    } catch (error) {
      console.error('An error occurred while downloading the course:', error);
      console.log('Restarting the downloadCourseUrls loop for the same URL...');
    }
  }

  console.log('\nAll course URLs have been downloaded.\n'); // Indicates that all course URLs have been downloaded
}

