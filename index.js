const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const m3u8ToMp4 = require('m3u8-to-mp4');
const fs = require('fs');
const converter = new m3u8ToMp4();

const course_url = '';
const subtitle_lang = 'en';

const cookies = [
    {
        name: '_domestika_session',
        value: '',
        domain: 'www.domestika.org',
    },
];

const _credentials_ = '';

scrapeSite();

async function scrapeSite() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setCookie(...cookies);
    await page.goto(course_url);
    const html = await page.content();
    const $ = cheerio.load(html);

    let allVideos = [];

    let units = $('h4.h2.unit-item__title a');

    let title = $('h1.course-header-new__title')
        .text()
        .trim()
        .replace(/[/\\?%*:|"<>]/g, '-');

    let totalVideos = 1;

    for (let i = 0; i < units.length - 1; i++) {
        let videoData = await getInitialProps($(units[i]).attr('href'));
        allVideos.push({
            title: $(units[i])
                .text()
                .trim()
                .replace(/[/\\?%*:|"<>]/g, '-'),
            videoData: videoData,
        });

        totalVideos += videoData.length;
    }

    let access_token = decodeURI(_credentials_);
    let regex_token = /accessToken\":\"(.*?)\"/gm;
    access_token = regex_token.exec(access_token)[1];

    let regex_final = /courses\/(.*?)-/gm;
    let final_project_id = regex_final.exec($(units[units.length - 1]).attr('href'))[1];
    let final_data = await fetchFromApi(`https://api.domestika.org/api/courses/${final_project_id}/final-project?with_server_timing=true`, 'finalProject.v1', access_token);
    final_project_id = final_data.data.relationships.video.data.id;
    final_data = await fetchFromApi(`https://api.domestika.org/api/videos/${final_project_id}?with_server_timing=true`, 'video.v1', access_token);

    allVideos.push({
        title: 'Final project',
        videoData: [{ playbackURL: final_data.data.attributes.playbackUrl, title: 'Final project' }],
    });

    let count = 0;
    for (let i = 0; i < allVideos.length; i++) {
        const unit = allVideos[i];
        for (let a = 0; a < unit.videoData.length; a++) {
            const vData = unit.videoData[a];

            if (!fs.existsSync(`domestika_courses/${title}/${unit.title}/`)) {
                fs.mkdirSync(`domestika_courses/${title}/${unit.title}/`, { recursive: true });
            }

            await exec(`yt-dlp --allow-u -f "bv*[height<=1080]" ${vData.playbackURL} -o "domestika_courses/${title}/${unit.title}/${vData.title}.%(ext)s"`);
            await exec(`yt-dlp --write-subs --sub-langs ${subtitle_lang} --skip-download --convert-subtitles srt "${vData.playbackURL}" -o "domestika_courses/${title}/${unit.title}/${vData.title}"`);

            count++;
            console.log(`Download ${count}/${totalVideos} Downloaded`);
        }
    }

    await browser.close();

    console.log('All Videos Downloaded');
}

async function getInitialProps(url) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setCookie(...cookies);
    await page.goto(url);

    const data = await page.evaluate(() => window.__INITIAL_PROPS__);

    let videoData = [];

    if (data && data != undefined) {
        for (let i = 0; i < data.videos.length; i++) {
            const el = data.videos[i];

            videoData.push({
                playbackURL: el.video.playbackURL,
                title: el.video.title,
            });
        }
    }

    await browser.close();

    return videoData;
}

async function fetchFromApi(apiURL, accept_version, access_token) {
    const response = await fetch(apiURL, {
        method: 'get',
        headers: {
            'Content-Type': 'application/vnd.api+json',
            Accept: 'application/vnd.api+json',
            'x-dmstk-accept-version': accept_version,
            authorization: `Bearer ${access_token}`,
        },
    });
    const data = await response.json();

    return data;
}
