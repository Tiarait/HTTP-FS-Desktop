const http = require('http');
const https = require('https');
const webSocket = require('ws');
const path = require('path');
const serveStatic = require('serve-static');
const cookieSession = require('cookie-session');
const fs = require('fs');
const url = require('url');
const mime = require('mime');

const settingsModule = require('./settings');
const logsModule = require('./logs');
const apiRoutesModule = require('./apiRoutes');

let server = null;
let wss = null;
let sessionMiddleware = null;
const objct = { port: -1, host: '', path: '', is_run: false };

const isPkg = typeof process.pkg !== 'undefined';
const baseDir = isPkg ? path.dirname(process.execPath) : __dirname;
const assetsPath = path.join(require.main ? require.main.path : process.cwd(), 'assets');
// const assetsPath = isPkg ? path.resolve(baseDir, 'assets') : path.resolve(baseDir, '../assets');
const serve = serveStatic(path.resolve(assetsPath, 'client'));

// const sharp = require('sharp');
//npm install @img/sharp-win32-x64 -f // "node_modules/@img/sharp-win32-x64/**/*",

const ffmpegPath = path.resolve(settingsModule.getDir(), path.basename(require('@ffmpeg-installer/ffmpeg').path));
const exec = require('child_process').exec;
//npm install --save @ffmpeg-installer/win32-x64 -f
//"node_modules/@ffmpeg-installer/win32-x64/*",
//npm install --save @ffmpeg-installer/darwin-arm64 -f
//"node_modules/@ffmpeg-installer/darwin-arm64/*",

async function startServer() {
    const port = settingsModule.getObjects().port || 8080;
    const pathServ = settingsModule.getObjects().path || undefined;
    const hosts = settingsModule.getObjects().hosts || undefined;
    return new Promise(async (resolve, reject) => {
        settingsModule.read();
        if (server && objct.is_run) {
            console.log(`Server already running at [${hosts[0]}:${port}]`);
            resolve('Error [ERR_SERVER_RUNNING]: Server already running.');
        } else {
            if (server) {
                server.close();
                objct.is_run = false;
            }
            try {
                updSessions();
                if (settingsModule.getObjects().server.use_ssl) {
                    try {
                        await ensureFile(path.join(assetsPath, 'certificate', 'certificate.crt'), settingsModule.getObjects().server.ssl_crt_path);
                        await ensureFile(path.join(assetsPath, 'certificate', 'private.key'), settingsModule.getObjects().server.ssl_key_path);
                        const httpsOptions = {
                            key: fs.readFileSync(settingsModule.getObjects().server.ssl_key_path),
                            cert: fs.readFileSync(settingsModule.getObjects().server.ssl_crt_path)
                        };
                        server = https.createServer(httpsOptions, (req, res) => {
                            handleLogs(req, res);
                            sessionMiddleware(req, res, () => routes(req, res));
                        });
                    } catch (err) {
                        const logError = `Error check certificate: ${err.message}`;
                        console.error(logError);
                        await logsModule.writeError(logError);
                        resolve(logError);
                    }
                } else {
                    server = http.createServer((req, res) => {
                        handleLogs(req, res);
                        sessionMiddleware(req, res, () => routes(req, res));
                    });
                }
                
                server.on('error', async (err) => {
                    console.error(`Server error: ${err.message}`);
                    await logsModule.writeError(err.message);
                    objct.is_run = false;
                    objct.port = -1;
                    objct.host = '';
                    objct.path = '';
                    resolve(err);
                });
                const onListen = async (err) => {
                    if (err) {
                        objct.is_run = false;
                        objct.port = -1;
                        objct.host = '';
                        objct.path = '';

                        await logsModule.writeError(err.message);
                        resolve(err);
                    } else {
                        objct.is_run = true;
                        objct.port = port;
                        objct.host = settingsModule.getObjects().hosts_need.length == 3 ? hosts[1] : hosts[0];
                        objct.path = pathServ;

                        if (wss) {
                            wss.close();
                        }
                        wss = new webSocket.Server({ server });
                        wss.on('error', (err) => {
                            console.error(`WebSocket server error: ${err.message}`);
                        });
                        wss.on('connection', (ws, req) => {
                            apiRoutesModule.setStartPath(objct.path);
                            apiRoutesModule.handleSocketRequests(server, ws, req);
                        });

                        const logEntry = `Server was runned at [${objct.host}:${port}]${settingsModule.getObjects().hosts_need.length == 3 ? '' : ' (only)'} in [${pathServ}]`
                        console.log(logEntry);
                        await logsModule.write(logEntry);
                        
                        resolve(true);
                    }
                };
                if (settingsModule.getObjects().hosts_need.length == 3) {
                    server.listen(port, onListen);
                } else {
                    server.listen(port, hosts[0], onListen);
                }
            } catch (error) {
                resolve(error.message);
            }
        }
    });
}

async function ensureFile(assetsPath, userPath) {
    try {
        await fs.promises.access(userPath, fs.constants.F_OK);
    } catch (error) {
        if (error.code === 'ENOENT') {
            await fs.promises.copyFile(assetsPath, userPath);
        } else {
            throw error;
        }
    }
}

function needAuthorizeBasic(req, res) {
    const authHeader = req.headers['authorization'];
    var errorAuth = false;
    if (!authHeader) {
        errorAuth = true;
    } else {
        const [scheme, encoded] = authHeader.split(' ');
        if (scheme !== 'Basic') {
            errorAuth = true;
        } else {
            const buffer = Buffer.from(encoded, 'base64');
            const [username, password] = buffer.toString().split(':');
            if (password !== settingsModule.getObjects().server.password || username !== settingsModule.getObjects().server.login) {
                errorAuth = true;
            }
        }
    }
    return errorAuth;
};

async function fileExists(filePath) {
    try {
        const stats = await fs.promises.stat(filePath);
        return stats.isFile();
    } catch (err) {
        return false;
    }
}

async function stopServer() {
    return new Promise((resolve, reject) => {
        if (server) {
            server.close(async (err) => {
                if (err) {
                    console.error('Error stopping server:', err);
                    await logsModule.writeError(err.message);
                    resolve(err);
                } else {
                    if (wss) {
                        wss.close((err) => {
                            if (err) console.error('Error stopping WebSocket server:', err);
                        });
                    }
                    console.log(`Server stopped`);
                    logsModule.write('Server stopped');
                    objct.is_run = false;
                    objct.port = -1;
                    objct.host = '';
                    objct.path = '';
                    resolve(true);
                }
            });
        } else {
            console.log('Server is not running');
            resolve(true);
        }
    });
}

process.on('SIGINT', function() {
    stopServer();
    process.exit();
});

function updSessions() {
    sessionMiddleware = cookieSession({
        name: 'session',
        keys: [settingsModule.getObjects().session_key],
        maxAge: settingsModule.getObjects().server.session_time * 60 * 1000
    });
}

function getObjects() {
    return objct
}

function handleLogs(req, res) {
    if (!req.url.startsWith('/web/template') && !req.url.startsWith('/favicon.ico') && !req.url.startsWith('/favicon-full.ico')) {
        const start = Date.now();
        let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        if (ip.includes('::ffff:')) {
            ip = ip.split('::ffff:')[1];
        }
        const method = req.method;
        res.on('finish', async () => {
            const end = Date.now();
            const responseTime = end - start;
            await logsModule.write(`[${ip}] ${method} [${res.statusCode}] (${req.url}), ${responseTime.toFixed(2)} ms`);
        });
    }
}

function routes(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const needAuth = settingsModule.getObjects().server.use_pass && settingsModule.getObjects().server.password && !req.session.isAuthenticated;
    let locationFile = '';
    if (settingsModule.getObjects().server.use_initial && settingsModule.getObjects().server.use_initial_path.startsWith(settingsModule.getObjects().path))
        locationFile = settingsModule.getObjects().server.use_initial_path.replace(settingsModule.getObjects().path, '');
    if (pathname === '/' || pathname === '/files') {
        res.writeHead(301, { 'Location': ('/files/' + locationFile).replaceAll('//', '/') });
        return res.end();
    } else if (pathname === '/favicon-full.ico' || pathname === '/favicon.ico') {
        const filePath = path.resolve(assetsPath, 'client', 'web', 'ic_launcher.png');
        return fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500);
                return res.end('Internal Server Error - ' + err);
            }
            res.writeHead(200, { 'Content-Type': 'image/x-icon' });
            res.write(data);
            res.end();
        });
    } else if (req.method === 'POST' && req.url === '/login') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            const params = new URLSearchParams(body);
            const pass = params.get('password');
            const login = params.get('username');
            if (pass === settingsModule.getObjects().server.password && login === settingsModule.getObjects().server.login) {
                req.session.isAuthenticated = true;
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('Login successful');
            } else {
                res.writeHead(401, { 'Content-Type': 'text/plain' });
                res.end('Invalid credentials');
            }
        });
    } else if (pathname.startsWith('/files/')) {
        let pathQ = formatPathQuery(pathname);
        if (pathQ.includes('?')) {
            pathQ = pathQ.substring(0, pathQ.indexOf('?'));
        }
        const entryPath = path.join(settingsModule.getObjects().path, pathQ).replace(/\/\//g, '/');
        fileExists(entryPath).then((exists) => {
            if (exists && !needAuth && settingsModule.getObjects().server.can_read) {
                return handleRequestFile(entryPath, req, res);
            } else {
                const filePath = path.resolve(assetsPath, 'client', 'web', 'template', 'index.html');
                return fs.readFile(filePath, 'utf-8', (err, data) => {
                    if (err) {
                        res.writeHead(500);
                        return res.end('Internal Server Error - ' + err);
                    }
                    const dataHtml = data
                        .replace('[LANG]', 'en-us')
                        .replace(`<span class="brand-text"></span>`, `<span class="brand-text">Http FS Desctop</span>`);
                    if (needAuth) {
                        res.writeHead(401, { 'Content-Type': 'text/html' });
                        res.write(dataHtml.replace("</body>",
                        `<div class=\"dialog bg alert\" style=\"backdrop-filter: blur(3px); background-color: var(--color-shadow); transition: none 0s ease 0s;\">
                            <div id=\"dialog-login\" class=\"alert-dialog uncancabled\" style=\"transform: translate(-50%, -50%) scale(1); opacity: 1; transition: all 150ms linear 0s;\">
                                <div class=\"alert-title\">
                                    <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1em\" height=\"1em\" fill=\"currentColor\" viewBox=\"0 0 16 16\">
                                        <path fill-rule=\"evenodd\" d=\"M8 0c-.69 0-1.843.265-2.928.56-1.11.3-2.229.655-2.887.87a1.54 1.54 0 0 0-1.044 1.262c-.596 4.477.787 7.795 2.465 9.99a11.8 11.8 0 0 0 2.517 2.453c.386.273.744.482 1.048.625.28.132.581.24.829.24s.548-.108.829-.24a7 7 0 0 0 1.048-.625 11.8 11.8 0 0 0 2.517-2.453c1.678-2.195 3.061-5.513 2.465-9.99a1.54 1.54 0 0 0-1.044-1.263 63 63 0 0 0-2.887-.87C9.843.266 8.69 0 8 0m0 5a1.5 1.5 0 0 1 .5 2.915l.385 1.99a.5.5 0 0 1-.491.595h-.788a.5.5 0 0 1-.49-.595l.384-1.99A1.5 1.5 0 0 1 8 5\"></path>
                                    </svg>
                                    <span>${'Login to'}</span>
                                </div>
                                <div class="flex">
                                    <input class="alert-msg dialogEditable login" type="text" placeholder="${'Login'}">
                                    <input class="alert-msg dialogEditable pass" type="password" placeholder="${'Password'}">
                                </div>
                                <div class=\"alert-btns flex noselect\">
                                    <button id=\"btn-login\" type=\"button\" tabindex=\"0\" class=\"dialog space-item space-compact alert-btn-ok\">
                                        <div class=\"space-item-text\">${'Login'}</div>
                                    </button>
                                </div>
                            </div>
                        </div>
                        </body>`));
                    } else if (settingsModule.getObjects().server.use_initial && settingsModule.getObjects().server.use_initial_redirect && locationFile) {
                        res.writeHead(301, { 'Location': ('/files/' + locationFile).replaceAll('//', '/') });
                        return res.end();
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.write(dataHtml);
                    }
                    return res.end();
                });
            }
        });
    } else if (pathname.startsWith('/api/')) {
        if (needAuth) {
            res.writeHead(401);
            return res.end('Invalid Authenticate');
        }
        apiRoutesModule.setStartPath(objct.path);
        return apiRoutesModule.handleApiRequests(req, res);
    } else if (pathname === '/web/template/config.js') {
        const configData = buildConfig();
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.write(configData);
        return res.end();
    } else {
        serve(req, res, () => {
            if (needAuth) {
                res.writeHead(401);
                return res.end('Invalid Authenticate');
            }
            res.writeHead(404);
            return res.end('404 Not Found');
        });
    }
}

function handleRequestFile(filePath, req, res) {
    const canRead = settingsModule.getObjects().server.can_read;
    const canThumb = settingsModule.getObjects().client.can_thumbnails;
    const parsedUrl = url.parse(req.url, true);
    const fileName = path.basename(filePath);
    //TODO
    // if (Utils.isHidden(filePath)) {
    //     res.writeHead(405, { 'Content-Type': 'application/json' });
    //     res.end(JSON.stringify({ error: 'MethodNotAllowed' }));
    // }
    fs.stat(filePath, async (err, stats) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'InternalServerError', message: err.message }));
        } else if (stats.isDirectory()) {
            res.writeHead(301, { 'Location': (req.url + '/').replaceAll('//', '/') });
            res.end();
        } else if (stats.isFile() && canRead) {
            const query = parsedUrl.query;
            let contentType = mime.getType(fileName) || '';//mime.lookup(filePath) || 'application/octet-stream';
            const rangeHeader = req.headers['range'];
            if (query.type === 'download') {
                res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            } else if (parsedUrl.query.type === 'text' && !filePath.endsWith('.pdf')) {
                contentType = 'text/plain';
                res.setHeader('X-Content-Type-Options', 'nosniff');
            } else if (parsedUrl.query.type === 'iframe') {
                res.setHeader('Content-Disposition', 'inline');
                res.setHeader('X-Content-Type-Options', 'nosniff');
            }

            if (query.type === "thumb" && !fileName.endsWith(".svg") && canThumb) {
                res.writeHead(200, {
                    'Content-Type': 'image/png',
                    'Accept-Ranges': 'bytes',
                    'X-Content-Type-Options': 'nosniff'
                });
                try {
                    const outThumbPath = contentType.startsWith('video') ? await createThumbnailVideo(filePath) : await createThumbnailImage(filePath);
                    if (await fileExists(outThumbPath)) {
                        returnFile(outThumbPath, res)
                    } else if (contentType.startsWith('video')) {
                        res.writeHead(405, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Cant create thumb' }));
                    } else {
                        returnFile(filePath, res)
                    }
                } catch (err) {
                    returnFile(filePath, res)
                }
            } else if (rangeHeader) {
                const range = parseRangeHeader(rangeHeader, stats.size);
                if (range) {
                    res.writeHead(206, {
                        'Content-Range': `bytes ${range.start}-${range.end}/${stats.size}`,
                        'Accept-Ranges': 'bytes',
                        'Content-Length': range.end - range.start + 1,
                        'Content-Type': contentType
                    });
                    const stream = fs.createReadStream(filePath, { start: range.start, end: range.end });
                    stream.pipe(res);
                    stream.on('error', err => {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'InternalServerError', message: err.message }));
                    });
                }
            } else {
                res.writeHead(200, {
                    'Content-Type': contentType,
                    'Content-Length': stats.size,
                    'Accept-Ranges': 'bytes'
                });
                const stream = fs.createReadStream(filePath);
                stream.pipe(res);
                stream.on('error', err => {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'InternalServerError', message: err.message }));
                });
            }
        } else {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'File type error' }));
        }
    });
}

function returnFile(filePath, res) {
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    stream.on('error', err => {
        try {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'InternalServerError', message: err.message }));
        } catch (err) {}
    });
    res.on('finish', () => {
        stream.close();
    });
}
async function createThumbnailVideo(filePath, time = '00:00:01', size = '180x124') {
    return await new Promise((resolve, reject) => {
        const outputFilePath = path.join(settingsModule.getCacheDir(), `${path.basename(filePath, path.extname(filePath))}_thumb.png`);
        const command = `"${ffmpegPath}" -ss ${time} -i "${filePath}" -y -s ${size} -vframes 1 -f image2 "${outputFilePath}"`;
        fs.access(outputFilePath, fs.constants.F_OK, (err) => {
            if (err) {
                execFunc(command, (err) => {
                    if (err) {
                        resolve('');
                    }
                    resolve(outputFilePath); 
                });
            } else resolve(outputFilePath); 
        })
        // resolve('');
    });
}

function execFunc(command, callback){
	exec(command, function( err ) {
		if (err) return callback(err);
		return callback(null);
	});
}

async function createThumbnailImage(filePath, size = '180x124') {
    return new Promise(async (resolve, reject) => {
        const outputFilePath = path.join(settingsModule.getCacheDir(), `${path.basename(filePath, path.extname(filePath))}_thumb.png`);
        const command = `"${ffmpegPath}" -i "${filePath}" -vf "scale=${size}":force_original_aspect_ratio=decrease "${outputFilePath}"`;
        fs.access(outputFilePath, fs.constants.F_OK, (err) => {
            if (err) {
                execFunc(command, (err) => {
                    if (err) {
                        console.error(err);
                        resolve(filePath);
                    }
                    resolve(outputFilePath); 
                });
            } else resolve(outputFilePath); 
        });
        
        // sharp(filePath)
        //     .resize(180, 124, {
        //         fit: sharp.fit.inside,
        //         withoutEnlargement: true
        //     })
        //     .toFile(outputFilePath, (err, info) => {
        //         if (err) {
        //             resolve(filePath);
        //         } else {
        //             resolve(outputFilePath);
        //         }
        //     });
            // resolve(filePath);
    });
}

function parseRangeHeader(header, fileSize) {
    if (!header) return null;

    const rangeMatch = /bytes=(\d+)-(\d+)?/.exec(header);

    if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = rangeMatch[2] !== undefined ? parseInt(rangeMatch[2], 10) : fileSize - 1;

        return {
            start: start,
            end: end,
            size: fileSize
        };
    } else {
        return null;
    }
}

function formatPathQuery(queryPath) {
    let r = queryPath
    try {
        r =  decodeURIComponent(queryPath || '');
    } catch(e) {}
    return r.replaceAll('[%]', '%').replaceAll('\'', '').replaceAll('\\', '/').replace('//', '/').replaceAll('"', '').replace('/files/','/');
}

function buildConfig() {
    return `var var_can_write = ${settingsModule.getObjects().server.can_write};
        var var_can_read = ${settingsModule.getObjects().server.can_read};
        var str_server_ok = "OK";
        var str_server_cancel = "Cancel";
        var str_server_uploading = "Uploading";
        var str_server_warn_save = "This file cannot be opened. Want to SAVE it?";
        var str_server_yes = "Yes";
        var str_server_no = "No";
        var str_server_rename = "Rename";
        var str_server_move = "Move";
        var str_server_downzip = "Download as zip";
        var str_server_down = "Download";
        var str_server_delete = "Delete";
        var str_create_folder = "Create folder";
        var str_create_file = "Create file";
        var str_error_permission = "Error no permission!";
        var str_pass = "Password";
        var dataApi = null;
        var str_view = "View";
        var str_view_grid = "Grid";
        var str_view_list = "List";
        var str_sorting = "Sorting";
        var str_sorting_name = "Name";
        var str_sorting_size = "Size";
        var str_sorting_date = "Date";
        var str_sorting_type = "Type";
        var str_home = "Files";
        var str_refresh = "Refresh";
        var str_upload_file = "Upload file";
        var str_about_author = "About author";
        var str_about_app = "About app";
        var str_coffee = "Give for coffee";
        var str_rate_app = "Rate this app";
        var str_app_name = "HTTP FS Client";
        var str_files = "Files";
        var str_folder = "Folder";
        var str_selected = "Selected";
        var str_select = "Select";
        var str_download_zip = "Download as .zip";
        var var_can_folder_size = ${settingsModule.getObjects().client.can_folder_size};
        var str_first_alert = '<h2>Welcome!</h2><div style=text-align: justify;>If you liked the application, you can support me by <a href=https://www.buymeacoffee.com/tiarapps target=_blank>giving me a coffee</a>. You can also find all the news about updates, changes and bugs on <a href=https://github.com/Tiarait/HTTP-FS-file-server target=_blank>the git</a>.</div>';
        var rss_enabled = false;
        var use_thumb = ${settingsModule.getObjects().client.can_thumbnails};;
        var link_home = "/files/";
        var str_upload = "Upload";
        var str_add_new = "Create";
        var str_theme = "Theme";
        var str_fullscreen = "On full screen";
        var str_open = "In new tab";
        var str_file = "File";
        var str_server_offline = "Server is offline";
        var str_server_reconnect = "Repeat";
        var str_server_hide = "Hide";
        var str_server_cancel_all = "Cancel all";
        var str_login_to = "Login to continue";
        var str_login = "Login";
        var var_check_connection = ${settingsModule.getObjects().client.check_connection};`
}


module.exports = { startServer, stopServer, getObjects, updSessions };