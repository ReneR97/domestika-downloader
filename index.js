const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs');

// --- CONFIGURATION ---
const debug = false;
const debug_data = [];

const course_url = 'YOUR_COURSE_URL_HERE';
const subtitle_lang = 'en';
//Specifiy your OS either as 'win' for Windows machines or 'mac' for MacOS/Linux machines
const machine_os = 'YOUR_OS_HERE';

//Cookie used to retreive video information
const cookies = [
    {
        name: '_domestika_session',
        value: 'YOUR_COOKIE_HERE',
        domain: 'www.domestika.org',
    },
];

//Credentials needed for the access token to get the final project
const _credentials_ = 'YOUR_CREDENTIALS_HERE';
// --- END CONFIGURATION ---

//Check if the N_m3u8DL-RE binary exists, throw error if not
const executable_name = machine_os === 'win' ? 'N_m3u8DL-RE.exe' : 'N_m3u8DL-RE';
if (fs.existsSync(executable_name)) {
    scrapeSite();
} else {
    throw Error('N_m3u8DL-RE binary not found! Download the Binary here: https://github.com/nilaoda/N_m3u8DL-RE/releases');
}

//Get access token from the credentials
const regex_token = /accessToken\":\"(.*?)\"/gm;
const access_token = regex_token.exec(decodeURI(_credentials_))[1];

async function scrapeSite() {
    //Scrape site for links to videos
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(0);
    await page.setCookie(...cookies);

    await page.setRequestInterception(true);

    page.on('request', (req) => {
        if (req.resourceType() == 'stylesheet' || req.resourceType() == 'font' || req.resourceType() == 'image') {
            req.abort();
        } else {
            req.continue();
        }
    });

    await page.goto(course_url);
    const html = await page.content();
    const $ = cheerio.load(html);

    console.log('Scraping Site');

    let allVideos = [];
    let units = $('h4.h2.unit-item__title a');
    let title = $('h1.course-header-new__title')
        .text()
        .trim()
        .replace(/[/\\?%*:|"<>]/g, '-');

    let totalVideos = 1;
    let regex_final = /courses\/(.*?)-*\/final_project/gm;

    // Apply regext to all units to get the final project
    let final_project_id = units
        .map((i, element) => {
            let href = $(element).attr('href');
            let match = regex_final.exec(href);
            if (match) {
                return match[1].split('-')[0];
            } else {
                return null;
            }
        })
        .get();

    //Remove final project from the units
    units = units.filter((i, element) => {
        let href = $(element).attr('href');
        let match = regex_final.exec(href);
        if (match) {
            return false;
        } else {
            return true;
        }
    });

    console.log(units.length + ' Units Detected');

    //Get all the links to the m3u8 files
    for (let i = 0; i < units.length; i++) {
        let videoData = await getInitialProps($(units[i]).attr('href'), page);

        allVideos.push({
            title: $(units[i])
                .text()
                .replaceAll('.', '')
                .trim()
                .replace(/[/\\?%*:|"<>]/g, '-'),
            videoData: videoData,
        });

        totalVideos += videoData.length;
    }

    console.log('All Videos Found');

    if (final_project_id != undefined && final_project_id != null) {
        console.log('Fetching Final Project');
        let final_data = await fetchFromApi(`https://api.domestika.org/api/courses/${final_project_id}/final-project?with_server_timing=true`, 'finalProject.v1', access_token);

        if (final_data && final_data.data) {
            let final_video_data = final_data.data.relationships;
            if (final_video_data != undefined && final_video_data.video != undefined && final_video_data.video.data != undefined && final_data.data.relationships.video.data != null) {
                final_project_id = final_video_data.video.data.id;
                final_data = await fetchFromApi(`https://api.domestika.org/api/videos/${final_project_id}?with_server_timing=true`, 'video.v1', access_token);

                allVideos.push({
                    title: 'Final project',
                    videoData: [
                        {
                            playbackURL: final_data.data.attributes.playbackUrl,
                            title: 'Final project',
                            section: 'Final project',
                        },
                    ],
                });
            }
        }
    }

    //Loop through all files and download them
    let count = 0;
    let downloadPromises = [];
    for (let i = 0; i < allVideos.length; i++) {
        const unit = allVideos[i];
        for (let a = 0; a < unit.videoData.length; a++) {
            const vData = unit.videoData[a];
            // Push the download promise to the array
            downloadPromises.push(downloadVideo(vData, title, unit.title, a));

            count++;
            console.log(`Download ${count}/${totalVideos} Started`);
        }
    }

    // Wait for all downloads to complete
    await Promise.all(downloadPromises);

    await page.close();
    await browser.close();

    if (debug) {
        fs.writeFileSync('log.json', JSON.stringify(debug_data));
        console.log('Log File Saved');
    }

    console.log('All Videos Downloaded');
}

async function getInitialProps(url, page) {
    await page.goto(url);

    const data = await page.evaluate(() => window.__INITIAL_PROPS__);
    const html = await page.content();
    const $ = cheerio.load(html);

    let section = $('h2.h3.course-header-new__subtitle')
        .text()
        .trim()
        .replace(/[/\\?%*:|"<>]/g, '-');

    let videoData = [];

    if (data && data != undefined && data.videos != undefined && data.videos.length > 0) {
        for (let i = 0; i < data.videos.length; i++) {
            const el = data.videos[i];

            videoData.push({
                playbackURL: el.video.playbackURL,
                title: el.video.title.replaceAll('.', '').trim(),
                section: section,
            });

            console.log('Video Found: ' + el.video.title);
        }
    }

    return videoData;
}

async function fetchFromApi(apiURL, accept_version, access_token) {
    const response = await fetch(apiURL, {
        method: 'get',
        headers: {
            Authorization: `Bearer ${access_token}`,
            Accept: 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
            'x-dmstk-accept-version': accept_version,
        },
    });

    if (!response.ok) {
        console.log('Error Fetching Data, check the credentials are still valid.');
        return false;
    }

    try {
        const data = await response.json();
        return data;
    } catch (error) {
        console.log(error);
        return false;
    }
}

async function downloadVideo(vData, title, unitTitle, index) {
    let save_name = `${index}_${vData.title.trimEnd()}`
    let save_dir = `domestika_courses/${title}/${vData.section}/${unitTitle}/`
    if (!fs.existsSync(save_dir)) {
        fs.mkdirSync(save_dir, {
            recursive: true,
        });
    }

    const options = { maxBuffer: 1024 * 1024 * 10 };

    try {
        if (machine_os === 'win') {
            let log = await exec(`N_m3u8DL-RE -sv res="1080*":codec=hvc1:for=best "${vData.playbackURL}" --save-dir "${save_dir}" --save-name "${save_name}"`, options);
            let log2 = await exec(`N_m3u8DL-RE --auto-subtitle-fix --sub-format SRT --select-subtitle lang="${subtitle_lang}":for=all "${vData.playbackURL}" --save-dir "${save_dir}" --save-name "${save_name}"`, options);
        } else {
            let log = await exec(`./N_m3u8DL-RE -sv res="1080*":codec=hvc1:for=best "${vData.playbackURL}" --save-dir "${save_dir}" --save-name "${save_name}"`);
            let log2 = await exec(`./N_m3u8DL-RE --auto-subtitle-fix --sub-format SRT --select-subtitle lang="${subtitle_lang}":for=all "${vData.playbackURL}" --save-dir "${save_dir}" --save-name "${save_name}"`);
        }

        if (debug) {
            debug_data.push({
                videoURL: vData.playbackURL,
                output: [log, log2],
            });
        }
    } catch (error) {
        console.error(`Error downloading video: ${error}`);
    }
}
