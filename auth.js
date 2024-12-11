const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
require('dotenv').config();

class DomestikaAuth {
    constructor() {
        this.envPath = path.join(__dirname, '.env');
        this.loadCredentials();
    }

    loadCredentials() {
        this.cookies = [{
            name: '_domestika_session',
            value: process.env.DOMESTIKA_SESSION || '',
            domain: 'www.domestika.org',
        }];
        this._credentials_ = process.env.DOMESTIKA_CREDENTIALS || '';
    }

    async promptForCredentials(forceUpdate = false) {
        console.log('\n📝 Para obtener tus credenciales:');
        console.log('1. Inicia sesión en Domestika');
        console.log('2. Abre las Herramientas de Desarrollo (F12)');
        console.log('3. Ve a la pestaña Storage -> Cookies');
        console.log('4. Busca y copia el valor de las siguientes cookies:');
        console.log('   - _domestika_session');
        console.log('   - _credentials\n');

        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'domestika_session',
                message: 'Ingresa el valor de la cookie _domestika_session:',
                when: () => forceUpdate || !this.cookies[0].value
            },
            {
                type: 'input',
                name: 'credentials',
                message: 'Ingresa el valor de la cookie _credentials:',
                when: () => forceUpdate || !this._credentials_
            }
        ]);

        if (answers.domestika_session) {
            this.cookies[0].value = answers.domestika_session;
        }
        if (answers.credentials) {
            this._credentials_ = answers.credentials;
        }

        // Guardar las credenciales en el archivo .env
        await this.saveCredentials();
    }

    async saveCredentials() {
        const envContent = `# Domestika Credentials
DOMESTIKA_SESSION=${this.cookies[0].value}
DOMESTIKA_CREDENTIALS=${this._credentials_}`;

        fs.writeFileSync(this.envPath, envContent, 'utf8');
        
        // Actualizar las variables de entorno en tiempo de ejecución
        process.env.DOMESTIKA_SESSION = this.cookies[0].value;
        process.env.DOMESTIKA_CREDENTIALS = this._credentials_;
    }

    async validateCredentials() {
        try {
            const regex_token = /accessToken\":\"(.*?)\"/gm;
            const match = regex_token.exec(decodeURI(this._credentials_));
            
            if (!match || !this.cookies[0].value) {
                throw new Error('Credenciales inválidas');
            }
            
            return true;
        } catch (error) {
            console.log('\nError: Las credenciales parecen ser inválidas.');
            return false;
        }
    }

    async getCookies() {
        // Validar y solicitar credenciales si es necesario
        if (!await this.validateCredentials()) {
            await this.promptForCredentials();
            
            // Validar nuevamente después de obtener las credenciales
            if (!await this.validateCredentials()) {
                throw new Error('No se pudieron obtener credenciales válidas. Por favor, verifica tus cookies de Domestika.');
            }
        }

        return {
            cookies: this.cookies,
            _credentials_: this._credentials_,
            getAccessToken: () => {
                const regex_token = /accessToken\":\"(.*?)\"/gm;
                return regex_token.exec(decodeURI(this._credentials_))[1];
            }
        };
    }
}

module.exports = new DomestikaAuth(); 