const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs');

// --- CONFIGURATION ---
const debug = false;
const debug_data = [];

const course_urls = ['YOUR_COURSE_URLs_HERE', 'YOUR_COURSE_URLs_HERE'];

const subtitle_lang = 'en';
const transcode_to_hevc = false; // Enable H.265 transcode
const use_nvenc = false; // true = GPU (NVENC), false = CPU (libx265)
const max_concurrent_processes = 3; // Numer of downloads/transcodes to run in parallel

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
    scrapeAllSites();
} else {
    throw Error('N_m3u8DL-RE binary not found! Download the Binary here: https://github.com/nilaoda/N_m3u8DL-RE/releases');
}

//Get access token from the credentials
const regex_token = /accessToken\":\"(.*?)\"/gm;
const access_token = regex_token.exec(decodeURI(_credentials_))[1];


// Helper function for controlled concurrency
async function processWithConcurrency(tasks, maxConcurrent) {
    const results = [];
    const executing = [];
    
    for (const task of tasks) {
        const promise = task().then(result => {
            executing.splice(executing.indexOf(promise), 1);
            return result;
        });
        
        results.push(promise);
        executing.push(promise);
        
        if (executing.length >= maxConcurrent) {
            await Promise.race(executing);
        }
    }
    
    return Promise.all(results);
}


async function scrapeAllSites(){
    for (const course_url of course_urls) {
        await scrapeSite(course_url);
    };
}


function findSchemaMarkup($, type) {
    let ldJsonScripts = $('script[type=application/ld+json]');
    // Loop through each application/ld+json
    for (let i = 0; i < ldJsonScripts.length; i++) {
        let jsonText = $(ldJsonScripts[i]).html().trim(); // Get the JSON
        try {
            let parsed = JSON.parse(jsonText); // try parsing JSON into object
            // JSON can contain the schema right away, or be an array of schemas
            // Make it be always an array of schemas so we can loop predictably
            let candidates = Array.isArray(parsed) ? parsed : [parsed];
            for (const entry of candidates) {
                if (entry['@context'].includes('schema.org') && entry['@type']===type) {
                    return entry; // Found the schema we were looking for
                }
            }
        } catch (err) {}
    }
    return null;
}

async function scrapeSite(course_url) {
    //Scrape site for links to videos
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
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
    schemaMarkup = findSchemaMarkup($, 'Course');

    let allVideos = [];
    let units = $('h4.h2.unit-item__title a');
    let title = schemaMarkup.name.trim().replace(/[/\\?%*:|"<>]/g, '-');

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

                if (final_data && final_data.data && final_data.data.attributes && final_data.data.attributes.playbackUrl) {
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
                    console.log('Final project video added');
                } else {
                    console.log('Final project exists but has no video');
                }
            }
        }
    }

    //Loop through all files and download them
    let count = 0;
    const downloadTasks = [];

    // Build array of download tasks
    for (let i = 0; i < allVideos.length; i++) {
        const unit = allVideos[i];
        for (let a = 0; a < unit.videoData.length; a++) {
            const vData = unit.videoData[a];
            const currentCount = ++count;
            
            // Create a task (function that returns a promise)
            downloadTasks.push(() => {
                console.log(`Download ${currentCount}/${totalVideos} Started`);
                return downloadVideo(vData, title, unit.title, a);
            });
        }
    }

    // Execute with controlled concurrency
    console.log(`Processing ${totalVideos} videos with max ${max_concurrent_processes} concurrent processes`);
    await processWithConcurrency(downloadTasks, max_concurrent_processes);

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
        // Download video
        if (machine_os === 'win') {
            await exec(`N_m3u8DL-RE.exe -sv res="1080*":for=best "${vData.playbackURL}" --save-dir "${save_dir}" --tmp-dir "${save_dir}" --save-name "${save_name}"`, options);
            await exec(`N_m3u8DL-RE.exe --auto-subtitle-fix --sub-format SRT --select-subtitle lang="${subtitle_lang}":for=all "${vData.playbackURL}" --save-dir "${save_dir}" --tmp-dir "${save_dir}" --save-name "${save_name}"`, options);
        } else {
            await exec(`./N_m3u8DL-RE -sv res="1080*":for=best "${vData.playbackURL}" --save-dir "${save_dir}" --tmp-dir "${save_dir}" --save-name "${save_name}"`);
            await exec(`./N_m3u8DL-RE --auto-subtitle-fix --sub-format SRT --select-subtitle lang="${subtitle_lang}":for=all "${vData.playbackURL}" --save-dir "${save_dir}" --tmp-dir "${save_dir}" --save-name "${save_name}"`);
        }

        // Transcode to H.265 if enabled
        if (transcode_to_hevc) {
            const downloaded_file = `${save_dir}${save_name}.mp4`;
            const temp_output = `${save_dir}${save_name}_hevc.mp4`;
            
            // Check if file was downloaded
            if (fs.existsSync(downloaded_file)) {
                try {
                    // Detect current codec
                    const probe_cmd = `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "${downloaded_file}"`;
                    const { stdout } = await exec(probe_cmd, options);
                    const current_codec = stdout.trim();
                    
                    // Only transcode if not already H.265
                    if (current_codec === 'hevc' || current_codec === 'h265') {
                        console.log(`${save_name} already in H.265, skipping transcode`);
                    } else {
                        console.log(`Transcoding ${save_name} from ${current_codec} to H.265...`);
                        
                        const encoder = use_nvenc ? 'hevc_nvenc' : 'libx265';
                        const encoder_params = use_nvenc 
                            ? '-preset p7 -tune hq -rc vbr -cq 23 -b:v 0' 
                            : '-preset medium -crf 23';
                        
                        await exec(`ffmpeg -i "${downloaded_file}" -c:v ${encoder} ${encoder_params} -c:a copy -c:s copy "${temp_output}"`, options);
                        
                        // Replace original with transcoded version
                        fs.unlinkSync(downloaded_file);
                        fs.renameSync(temp_output, downloaded_file);
                        
                        console.log(`Transcode complete: ${save_name}`);
                    }
                } catch (probe_error) {
                    console.error(`Error detecting codec for ${save_name}, skipping transcode: ${probe_error.message}`);
                }
            }
        }

        if (debug) {
            debug_data.push({
                videoURL: vData.playbackURL,
                output: 'Download successful',
            });
        }
    } catch (error) {
        console.error(`Error downloading video: ${error}`);
    }
}
