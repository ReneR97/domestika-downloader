const path = require('path');
const fs = require('fs');

console.log('Sistema operativo detectado:', process.platform === 'win32' ? 'Windows' : 'macOS');

const macPath = path.join(process.cwd(), 'index.mac.js');
const winPath = path.join(process.cwd(), 'index.win.js');

process.on('uncaughtException', (error) => {
    console.error('Error no capturado:', error);
    process.exit(1);
});

try {
    if (process.platform === 'win32') {
        const winModule = require(winPath);
        // Preparado para cuando implementemos main() en Windows
    } else {
        const macModule = require(macPath);
        macModule.main().catch(error => {
            console.error('Error en main:', error);
            process.exit(1);
        });
    }
} catch (error) {
    console.error('Error al cargar el archivo:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
}
