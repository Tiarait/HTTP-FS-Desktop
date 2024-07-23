const fs = require('fs').promises;
const fsSync = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const isPkg = typeof process.pkg !== 'undefined';
let baseDir;
switch (os.platform()) {
    case 'win32':
        baseDir = path.join(process.env.APPDATA, 'tiar.ua.slf.desktop');
        break;
    case 'darwin':
        baseDir = path.join(process.env.HOME, 'Library', 'Application Support', 'tiar.ua.slf.desktop');
        break;
    case 'linux':
        baseDir = path.join(process.env.HOME, '.config', 'tiar.ua.slf.desktop');
        break;
    default:
        baseDir = isPkg ? path.dirname(process.execPath) : __dirname;
}
const filePath = path.resolve(baseDir, 'config.json');
const assetsPath = path.join(require.main ? require.main.path : process.cwd(), 'assets');
let externalFilesDir = path.dirname(isPkg ? path.dirname(process.execPath) : __dirname);

const objctBase = { 
    port: 8080, 
    path: externalFilesDir, 
    hosts_need:['Local', 'IPv4', 'IPv6'], 
    hosts:['127.0.0.1', '127.0.0.1', '127.0.0.1'],
    session_key: crypto.randomBytes(32).toString('hex'),
    app: {
        auto_start: false,
        auto_web: true,
        use_logs: true,
        language: 'def',
        logs_file: path.resolve(baseDir, 'logs.log'),
        config_file: path.resolve(baseDir, 'config.json')
    },
    server: {
        use_pass: false,
        login: os.userInfo().username || 'user',
        password: '0000',
        session_time: 60,
        use_ssl: false,
        ssl_key_path: path.resolve(baseDir, 'private.key'),
        ssl_crt_path: path.resolve(baseDir, 'certificate.crt'),
        can_read: true,
        can_write: true,
        use_initial: false,
        use_initial_redirect: false,
        use_initial_path: ''
    },
    client: {
        language: 'def',
        show_systems: true,
        check_connection: true,
        can_folder_size: false,
        can_thumbnails: true,
        folder_size_max: 10000
    }
};
var objct = structuredClone(objctBase);

function getObjects() {
    try {

    } catch (err) {}
    return objct;
}

function getDir() {
    return baseDir;
}

function getCacheDir() {
    return path.join(os.tmpdir(), 'tiar.ua.slf.desktop');
}

async function init() {
    const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
    await ensureFile(baseDir, ffmpegPath);
    const ffmpegPathCopy = path.resolve(baseDir, path.basename(ffmpegPath));
    await fs.chmod(ffmpegPathCopy, '755');

    if (!fsSync.existsSync(getDir())) {
        fsSync.mkdirSync(getDir(), { recursive: true });
    }
    if (!fsSync.existsSync(getCacheDir())) {
        fsSync.mkdirSync(getCacheDir(), { recursive: true });
    }
}

function ensureFile(cacheDir, assetFilePath) {
    return new Promise((resolve, reject) => {
        const fileName = path.basename(assetFilePath);
        const cacheFilePath = path.join(cacheDir, fileName);
        fsSync.access(cacheFilePath, fsSync.constants.F_OK, (err) => {
            if (!err) {
                resolve(cacheFilePath);
            } else {
                fsSync.copyFile(assetFilePath, cacheFilePath, (err) => {
                    if (err) {
                        resolve(`Ошибка при копировании файла: ${err.message}`);
                    } else {
                        resolve(cacheFilePath);
                    }
                });
            }
        });
    });
}

const algorithm = 'aes-256-cbc';
const key = crypto.createHash('sha256').update(String(os.userInfo().username + 'Questo è il fiore del partigiano Morto per la libertà')).digest('base64').substring(0, 32);
const iv = crypto.createHash('sha256').update(String(os.userInfo().username + 'Bella ciao ciao ciao')).digest('base64').substring(0, 16);

function encrypt(text) {
    let cipher = crypto.createCipheriv(algorithm, Buffer.from(key), Buffer.from(iv));
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

function decrypt(text) {
    let decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), Buffer.from(iv));
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

async function reset() {
    await write(objctBase, true)
}

async function read() {
    try {
        objct = JSON.parse(await fs.readFile(filePath));
        objct.server.password = decrypt(objct.server.password);
        objct.server.login = decrypt(objct.server.login);
        if (!objct.path) objct.path = externalFilesDir;
        if (!objct.session_key) objct.session_key = crypto.randomBytes(32).toString('hex');
    } catch (err) {
        await write();
    }
}

async function write(settings = objct, recreate = false) {
    if (settings != null && settings != undefined) {
        if (!settings.session_key) settings.session_key = crypto.randomBytes(32).toString('hex');
        objct = settings;
    }
    if (recreate) objct.session_key = crypto.randomBytes(32).toString('hex');

    var writeObj = structuredClone(objct);
    writeObj.server.password = encrypt(objct.server.password);
    writeObj.server.login = encrypt(objct.server.login);
    const data = JSON.stringify(writeObj, null, 2);
    await fs.writeFile(filePath, data, 'utf8');
}

module.exports = { getObjects, write, read, reset, getDir, getCacheDir, init};