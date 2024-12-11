const fs = require('fs');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const path = require('path');
const domestikaAuth = require('./auth.js');

// Variables para los módulos que necesitan instalación
let cliProgress;
let colors;
let inquirer;

// --- CONFIGURATION ---
const debug = false;
const debug_data = [];

// Estas variables se obtendrán del usuario
let course_url;
let subtitle_lang;
let quality;

// --- END CONFIGURATION ---

// Función para verificar e instalar dependencias
async function checkAndInstallDependencies() {
    const requiredModules = {
        'cli-progress': () => cliProgress = require('cli-progress'),
        'colors': () => colors = require('colors'),
        'inquirer': () => inquirer = require('inquirer')
    };

    const missingModules = [];

    for (const [moduleName, requireFn] of Object.entries(requiredModules)) {
        try {
            requireFn();
            console.log(`✓ ${moduleName} está instalado`);
        } catch (error) {
            console.log(`✗ ${moduleName} no está instalado`);
            missingModules.push(moduleName);
        }
    }

    if (missingModules.length > 0) {
        console.log(`\nInstalando dependencias faltantes: ${missingModules.join(', ')}...`);
        try {
            await exec(`npm install ${missingModules.join(' ')}`);
            console.log('Dependencias instaladas correctamente.');
            
            for (const [moduleName, requireFn] of Object.entries(requiredModules)) {
                if (missingModules.includes(moduleName)) {
                    requireFn();
                }
            }
        } catch (error) {
            throw new Error(`Error instalando dependencias: ${error.message}`);
        }
    }
}

// Función para normalizar URLs de Domestika
function normalizeDomestikaUrl(url) {
    // Expresión regular para extraer el ID y nombre del curso
    const courseRegex = /domestika\.org\/.*?\/courses\/(\d+[-\w]+)/;
    const match = url.match(courseRegex);
    
    if (match) {
        // Construir la URL normalizada
        return `https://www.domestika.org/es/courses/${match[1]}/course`;
    }
    
    return url;
}

// Función principal
async function main() {
    try {
        console.log('Iniciando Domestika Downloader...');
        
        // Verificar e instalar dependencias
        await checkAndInstallDependencies();
        
        // Obtener credenciales
        const auth = await domestikaAuth.getCookies();
        
        // Pedir opciones al usuario
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'courseUrls',
                message: 'URLs de los cursos (separadas por espacios):',
                validate: (input) => {
                    const urls = input.trim().split(' ');
                    const validUrls = urls.every(url => {
                        // Verificar que sea una URL de curso de Domestika
                        return url.match(/domestika\.org\/.*?\/courses\/\d+[-\w]+/);
                    });
                    if (validUrls) {
                        return true;
                    }
                    return 'Por favor ingresa URLs válidas de cursos de Domestika';
                }
            },
            {
                type: 'list',
                name: 'subtitles',
                message: '¿Deseas descargar subtítulos?',
                choices: [
                    { name: 'No descargar subtítulos', value: null },
                    { name: 'Español', value: 'es' },
                    { name: 'Inglés', value: 'en' },
                    { name: 'Portugués', value: 'pt' },
                    { name: 'Francés', value: 'fr' },
                    { name: 'Alemán', value: 'de' },
                    { name: 'Italiano', value: 'it' }
                ]
            }
        ]);

        // Verificar N_m3u8DL-RE
        const N_M3U8DL_RE = process.platform === 'win32' ? 'N_m3u8DL-RE.exe' : 'N_m3u8DL-RE';
        if (!fs.existsSync(N_M3U8DL_RE)) {
            throw new Error(`${N_M3U8DL_RE} not found! Download the Binary here: https://github.com/nilaoda/N_m3u8DL-RE/releases`);
        }

        // Normalizar y procesar cada URL
        const courseUrls = answers.courseUrls
            .trim()
            .split(' ')
            .map(url => normalizeDomestikaUrl(url));

        console.log(`\nSe procesarán ${courseUrls.length} cursos:`);
        courseUrls.forEach((url, index) => {
            console.log(`${index + 1}. ${url}`);
        });

        for (let i = 0; i < courseUrls.length; i++) {
            const url = courseUrls[i];
            console.log(`\n📚 Procesando curso ${i + 1} de ${courseUrls.length}: ${url}`);
            await scrapeSite(url, answers.subtitles, auth);
        }
        
        console.log('\n✅ Todos los cursos han sido procesados');
        
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Iniciar la aplicación
if (require.main === module) {
    main().catch(error => {
        console.error('Error fatal:', error);
        process.exit(1);
    });
}

// ... resto de las funciones (scrapeSite, downloadVideo, etc.) ...

async function scrapeSite(courseUrl, subtitle_lang, auth) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(0);
    await page.setCookie(...auth.cookies);

    await page.setRequestInterception(true);
    page.on('request', (req) => {
        if (req.resourceType() == 'stylesheet' || req.resourceType() == 'font' || req.resourceType() == 'image') {
            req.abort();
        } else {
            req.continue();
        }
    });

    await page.goto(courseUrl);
    const html = await page.content();
    const $ = cheerio.load(html);

    console.log('Analizando sitio');

    let allVideos = [];
    let units = $('h4.h2.unit-item__title a');
    let courseTitle = $('h1.course-header-new__title')
        .text()
        .trim()
        .replace(/[/\\?%*:|"<>]/g, '-');

    // Verificar si estamos en la página correcta
    if (units.length === 0) {
        await page.close();
        await browser.close();

        console.log('\n❌ No se encontraron videos. Esto puede deberse a cookies inválidas.');
        
        const answer = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'updateCookies',
                message: '¿Deseas actualizar las cookies?',
                default: true
            }
        ]);

        if (answer.updateCookies) {
            // Forzar la actualización de credenciales
            await domestikaAuth.promptForCredentials(true);
            // Intentar nuevamente con las nuevas credenciales
            return scrapeSite(courseUrl, subtitle_lang, await domestikaAuth.getCookies());
        } else {
            throw new Error('No se pueden descargar los videos sin cookies válidas.');
        }
    }

    console.log(units.length + ' Unidades detectadas');

    for (let i = 0; i < units.length; i++) {
        let videoData = await getInitialProps($(units[i]).attr('href'), page);
        allVideos.push({
            title: $(units[i])
                .text()
                .replaceAll('.', '')
                .trim()
                .replace(/[/\\?%*:|"<>]/g, '-'),
            videoData: videoData,
            unitNumber: i + 1
        });
    }

    const totalVideos = allVideos.reduce((acc, unit) => acc + unit.videoData.length, 0);

    // Si no se encontraron videos después de escanear las unidades
    if (totalVideos === 0) {
        await page.close();
        await browser.close();

        console.log('\n❌ No se encontraron videos en las unidades. Esto puede deberse a cookies inválidas.');
        
        const answer = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'updateCookies',
                message: '¿Deseas actualizar las cookies?',
                default: true
            }
        ]);

        if (answer.updateCookies) {
            // Forzar la actualización de credenciales
            await domestikaAuth.promptForCredentials(true);
            // Intentar nuevamente con las nuevas credenciales
            return scrapeSite(courseUrl, subtitle_lang, await domestikaAuth.getCookies());
        } else {
            throw new Error('No se pueden descargar los videos sin cookies válidas.');
        }
    }

    console.log('Todos los videos encontrados');
    let completedVideos = 0;
    let downloadPromises = [];

    // Preparar todas las descargas
    for (let i = 0; i < allVideos.length; i++) {
        const unit = allVideos[i];
        for (let a = 0; a < unit.videoData.length; a++) {
            const vData = unit.videoData[a];
            if (!vData || !vData.playbackURL) {
                console.error(`Error: Datos de video inválidos para ${unit.title} #${a}`);
                continue;
            }

            downloadPromises.push(
                (async () => {
                    try {
                        console.log(`\nIniciando descarga: ${vData.title}`);
                        await downloadVideo(vData, courseTitle, unit.title, a + 1, subtitle_lang, unit.unitNumber);
                        completedVideos++;
                        console.log(`\nCompletados ${completedVideos} de ${totalVideos} videos`);
                        return true;
                    } catch (error) {
                        console.error(`Error en video ${vData.title}:`, error);
                        return false;
                    }
                })()
            );
        }
    }

    await Promise.all(downloadPromises);

    if (completedVideos === 0) {
        console.log('\n❌ No se pudo descargar ningún video. Esto puede deberse a cookies inválidas.');
        
        const answer = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'updateCookies',
                message: '¿Deseas actualizar las cookies?',
                default: true
            }
        ]);

        if (answer.updateCookies) {
            // Forzar la actualización de credenciales
            await domestikaAuth.promptForCredentials(true);
            // Intentar nuevamente con las nuevas credenciales
            return scrapeSite(courseUrl, subtitle_lang, await domestikaAuth.getCookies());
        }
    } else {
        console.log(`\nProceso finalizado. Completados ${completedVideos} de ${totalVideos} videos`);
    }

    await page.close();
    await browser.close();
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

    if (data && data.videos && data.videos.length > 0) {
        for (let i = 0; i < data.videos.length; i++) {
            const el = data.videos[i];
            videoData.push({
                playbackURL: el.video.playbackURL,
                title: el.video.title.replaceAll('.', '').trim(),
                section: section,
            });
            console.log('Video encontrado: ' + el.video.title);
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
        console.log('Error Fetching Data');
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

async function downloadVideo(vData, courseTitle, unitTitle, index, subtitle_lang, unitNumber) {
    if (!vData.playbackURL) {
        throw new Error(`URL de video no válida para ${vData.title}`);
    }

    const cleanPath = (path) => path.replace(/\/+/g, '/');
    const baseDir = cleanPath(`domestika_courses/${courseTitle}/${vData.section}/${unitTitle}`);

    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
    }
    
    // Nuevo formato de nombre: "Nombre del Curso - Ux - Nombre del video"
    const fileName = `${courseTitle} - U${unitNumber} - ${index}_${vData.title.trimEnd()}`;
    
    try {
        console.log('Descargando video...');
        await exec(
            `./N_m3u8DL-RE -sv "res=1920x1080" "${vData.playbackURL}" --save-dir "${baseDir}" --save-name "${fileName}"`,
            { maxBuffer: 1024 * 1024 * 10 }
        );
        
        console.log('Video descargado correctamente');

        if (subtitle_lang) {
            console.log('Descargando subtítulos...');
            
            try {
                await exec(
                    `./N_m3u8DL-RE --auto-subtitle-fix --sub-format SRT --select-subtitle lang="${subtitle_lang}":for=all "${vData.playbackURL}" --save-dir "${baseDir}" --save-name "${fileName}"`,
                    { maxBuffer: 1024 * 1024 * 10 }
                );

                const oldSubPath = path.join(baseDir, `${fileName}.${subtitle_lang}.srt`);
                const newSubPath = path.join(baseDir, `${fileName}.srt`);
                const videoPath = path.join(baseDir, `${fileName}.mp4`);

                if (fs.existsSync(oldSubPath)) {
                    console.log('Subtítulos descargados, incrustando en el video...');
                    fs.copyFileSync(oldSubPath, newSubPath);
                    await embedSubtitles(videoPath, oldSubPath);
                    console.log('Subtítulos incrustados correctamente');
                } else {
                    console.log('No se encontraron subtítulos disponibles');
                }
            } catch (error) {
                console.error('Error procesando subtítulos:', error.message);
            }
        }

        return true;
    } catch (error) {
        throw new Error(`Error descargando video: ${error.message}`);
    }
}

async function embedSubtitles(videoPath, subtitlePath) {
    try {
        const dir = path.dirname(videoPath);
        const filename = path.basename(videoPath, '.mp4');
        const outputPath = `${dir}/${filename}_with_subs.mp4`;
        const finalSrtPath = `${dir}/${filename}.srt`;

        // Crear una copia del archivo SRT con el mismo nombre que el video
        fs.copyFileSync(subtitlePath, finalSrtPath);

        await exec(`ffmpeg -i "${videoPath}" -i "${subtitlePath}" -c copy -c:s mov_text "${outputPath}"`);
        
        // Si todo salió bien, reemplazamos el archivo original
        fs.unlinkSync(videoPath);
        fs.renameSync(outputPath, videoPath);
        fs.unlinkSync(subtitlePath); // Eliminamos el SRT original (el temporal)
        
        // Ya no eliminamos el SRT final que copiamos
        
        return true;
    } catch (error) {
        console.error(`Error embedding subtitles: ${error}`);
        return false;
    }
}
