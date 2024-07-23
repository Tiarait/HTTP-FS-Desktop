const http = require('http');
const webSocket = require('ws');
const path = require('path');
const url = require('url');
const serveStatic = require('serve-static');
const readLastLines = require('read-last-lines');
const fs = require('fs');
const os = require('os');
const networkInterfaces = os.networkInterfaces();
// const ip = require('ip');
const subServerModule = require('./subServer');
const settingsModule = require('./settings');
const logsModule = require('./logs');


const isPkg = typeof process.pkg !== 'undefined';
const baseDir = isPkg ? path.dirname(process.execPath) : __dirname;

let assetsPath = path.join(require.main ? require.main.path : process.cwd(), 'assets');
// console.log('assetsPath= ' + assetsPath);
// const assetsPath = isPkg ? path.resolve(baseDir, 'assets') : path.resolve(baseDir, '../assets');

const serve = serveStatic(path.join(assetsPath));

let server = null;
let wss = null;
let externalFilesDir = baseDir;


async function stopAll() {
    if (wss) wss.close();
    if (server) {
        await subServerModule.stopServer();
        server.close(() => {
            console.log('App stopped');
            process.exit();
        });
    }
}
async function stop() {
    await subServerModule.stopServer();
}
async function run() {
    await subServerModule.startServer(undefined, externalFilesDir);
}

async function startMain(port, pathServer, runSubServer, subPort) {
    await settingsModule.read();
    return new Promise((resolve, reject) => {
        if (server) {
            server.close();
        }
        server = http.createServer((req, res) => {
            routes(req, res);
        });
        server.listen(port, '127.0.0.1', (err) => {
            if (err) {
                resolve(err);
            } else {
                console.log(`App run at [localhost:${port}]`);
                if (runSubServer || settingsModule.getObjects().app.auto_start) {
                    if (pathServer == '') pathServer = externalFilesDir;
                    settingsModule.getObjects().path = pathServer
                    settingsModule.getObjects().hosts = [];
                    for (const type of ['Local', 'IPv4', 'IPv6']) {
                        if (settingsModule.getObjects().hosts_need.includes(type)) {
                            if (type == 'Local') {
                                settingsModule.getObjects().hosts.push(getLocalAddres());
                            }
                            if (type == 'IPv4') {
                                settingsModule.getObjects().hosts.push(getIPv4Addres());
                            }
                            if (type == 'IPv6') {
                                settingsModule.getObjects().hosts.push(getIPv6Addres());
                            }
                        }
                    }
                    settingsModule.write()
                    subServerModule.startServer()
                    .catch((err) => {
                        console.error('Error starting server:', err);
                    });
                }
                if (wss) {
                    wss.close();
                }
                wss = new webSocket.Server({ server });
                wss.on('error', (err) => {
                    console.error(`WebSocket server error: ${err.message}`);
                });
                wss.on('connection', async (ws, req) => {
                    if (req.url === '/status') {
                        if (!server.listening) {
                            ws.close();
                            return;
                        }
                        const sendStatus = () => {
                            ws.send(getStatus());
                            let time = 0;
                            const interval = setInterval(() => {
                                let isOff = !server.listening;
                                if (isOff) {
                                  clearInterval(interval);
                                  ws.close();
                                } else {
                                  ws.send(getStatus(), { 'Content-Type': 'application/json' });
                                }
                                time += 2000;
                            }, 2000);
                            ws.on('close', () => clearInterval(interval));
                        };
                        sendStatus();
                    } else if (req.url === '/logs') {
                        if (settingsModule.getObjects().app.use_logs) {
                            try {
                                const lines = await readLastLines.read(settingsModule.getObjects().app.logs_file, 100);
                                const linesArray = lines.split('\n');
                                for (const line of linesArray) {
                                    if (line.trim() !== '') {
                                        ws.send(line);
                                    }
                                }
                            } catch (error) {
                                console.error('Error reading last lines of logs:', error);
                            }
                            const changeHandler = (newData) => {
                                const newLines = newData.split('\n');
                                for (const line of newLines) {
                                    if (line.trim() !== '') {
                                        ws.send(line);
                                    }
                                }
                            };
                            logsModule.on('change', changeHandler);
                            ws.on('close', () => {
                                logsModule.removeListener('change', changeHandler);
                            });
                        } else {
                            wss.close();
                        }
                    } else {
                        wss.close();
                    }
                });
                resolve(true);
            }
        });
    });
}

async function routes(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    if (pathname === '/favicon-full.ico' || pathname === '/favicon.ico') {
        const filePath = path.join(assetsPath, 'server', 'icon.ico');
        return fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500);
                return res.end('Internal Server Error - ' + err);
            }
            res.writeHead(200, { 'Content-Type': 'image/x-icon', 'Cache-Control': 'public' });
            res.write(data);
            res.end();
        });
    } else if (pathname === '/tab') {
        var mainContent = '';
        if (parsedUrl.query.tab === 'settings') {
            mainContent = await readTextFromFile(path.join(assetsPath, 'server', 'tabs', 'settings.html'));
        } else if (parsedUrl.query.tab === 'logs') {
            mainContent = await readTextFromFile(path.join(assetsPath, 'server', 'tabs', 'logs.html'));
        } else {
            mainContent = await readTextFromFile(path.join(assetsPath, 'server', 'tabs', 'main.html'));
        }
        res.writeHead(200, { 'Content-Type': 'text/html' , 'Cache-Control': 'public'});
        res.write(mainContent);
        return res.end();
    } else if (pathname === '/' || pathname === '/index.html') {
        const filePath = path.join(assetsPath, 'server', 'index.html');
        var mainContent = '';
        if (parsedUrl.query.tab === 'settings') {
            mainContent = await readTextFromFile(path.join(assetsPath, 'server', 'tabs', 'settings.html'));
        } else if (parsedUrl.query.tab === 'logs') {
            mainContent = await readTextFromFile(path.join(assetsPath, 'server', 'tabs', 'logs.html'));
        } else {
            mainContent = await readTextFromFile(path.join(assetsPath, 'server', 'tabs', 'main.html'));
        }
        
        return fs.readFile(path.resolve(filePath), 'utf8', (err, data) => {
            if (err) {
                res.writeHead(500);
                return res.end('Internal Server Error - ' + err);
            }
            const modifiedData = data
                .replace('var path = \'\';', `var path = '${externalFilesDir}';`)
                .replace('[CONTENT]', mainContent)
                .replace('var isRun = false;', `var isRun = ${subServerModule.getObjects().is_run};`)
                .replace('var settings = null;', `var settings = ${getStatus()};`);
            res.writeHead(200, { 'Content-Type': 'text/html' , 'Cache-Control': 'public'});
            res.write(modifiedData);
            res.end();
        });
    } else if (pathname === '/set_settings_path') {
        const externalFilesDir = parsedUrl.query.path.replaceAll('\'', '').replaceAll('"', '');
        if (!externalFilesDir) {
            return res.writeHead(500).end('Port not set');
        }
        settingsModule.getObjects().path = externalFilesDir;
        settingsModule.write();
    } else if (pathname === '/session_recreate') {
        try {
            await settingsModule.write(null, true);
            subServerModule.updSessions();
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end('true');
        } catch (err) {
            res.writeHead(400, {'Content-Type': 'application/json'});
            console.error(err);
            return res.end(JSON.stringify({error: 'Invalid JSON'}));
        }
    } else if (pathname === '/update_settings') {
        if (req.method === 'POST' && req.headers['content-type'] === 'application/json') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    await settingsModule.write(data);
                    subServerModule.updSessions();
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end('true');
                } catch (err) {
                    res.writeHead(400, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify({error: 'Invalid JSON'}));
                }
            });
        } else {
            res.writeHead(404, {'Content-Type': 'application/json'});
            return res.end(JSON.stringify({error: 'Not Found'}));
        }
    } else if (pathname === '/set_settings_hosts') {
        settingsModule.getObjects().hosts_need.length = 0;
        if (parsedUrl.query.local === 'true') settingsModule.getObjects().hosts_need.push('Local');
        if (parsedUrl.query.ipv4 === 'true') settingsModule.getObjects().hosts_need.push('IPv4');
        if (parsedUrl.query.ipv6 === 'true') settingsModule.getObjects().hosts_need.push('IPv6');
        settingsModule.getObjects().hosts.length = 0;
        for (const type of ['local', 'IPv4', 'IPv6']) {
            if (settingsModule.getObjects().hosts_need.includes(type)) {
                const localAddress = Object.values(networkInterfaces)
                    .flat()
                    .find(info => info.family === type && !info.internal)?.address;
                // const localAddress = ip.address('public', type == 'IPv6' ? 'ipv6' : 'ipv4');
                if (localAddress) {
                    settingsModule.getObjects().hosts.push(localAddress);
                }
            }
        }
        settingsModule.write();
        return res.writeHead(200).end();
    } else if (pathname === '/startServer') {
        const port = parsedUrl.query.port;
        if (!port) {
            return res.writeHead(500).end('Port not set');
        }
        externalFilesDir = parsedUrl.query.path;
        if (!externalFilesDir) {
            return res.writeHead(500).end('Path not set');
        }
        settingsModule.getObjects().port = port;
        settingsModule.getObjects().path = externalFilesDir;
        settingsModule.getObjects().hosts = [];
        for (const type of ['Local', 'IPv4', 'IPv6']) {
            if (settingsModule.getObjects().hosts_need.includes(type)) {
                if (type == 'Local') {
                    settingsModule.getObjects().hosts.push(getLocalAddres());
                }
                if (type == 'IPv4') {
                    settingsModule.getObjects().hosts.push(getIPv4Addres());
                }
                if (type == 'IPv6') {
                    settingsModule.getObjects().hosts.push(getIPv6Addres());
                }
            }
        }
        settingsModule.write();
        subServerModule.startServer()
        .then((status) => {
            return res.writeHead(200).end(`${status}`);
        })
        .catch((err) => {
            console.error('Error starting server:', err);
            return res.writeHead(500).end('Internal Server Error');
        });
    } else if (pathname === '/stopServer') {
        subServerModule.stopServer().then((status) => {
            return res.writeHead(200).end(`${status}`);
        }).catch((err) => {
            console.error('Error stopping server:', err);
            return res.writeHead(500).end('Internal Server Error');
        });
    } else if (pathname === '/status' || pathname === '/server/status') {
        return res
            .writeHead(200, { 'Content-Type': 'application/json' })
            .end(getStatus());
    } else if (pathname === '/selectFolder') {
        let pathDir = decodeURIComponent(parsedUrl.query.path.replace('%', '%25')).replaceAll('\'', '').replaceAll('"', '') || externalFilesDir;
        let showFiles = parsedUrl.query.files === 'true';
        if (pathDir == '') pathDir = externalFilesDir;
        fs.readdir(pathDir, { withFileTypes: true }, (err, files) => {
            if (err) {
                //console.error('selectFolder:', err);
                return res.writeHead(500).end(`Cant select folders [${pathDir}]\n${err.message}`);
            } else {
                const foldersArr = files.filter(file => file.isDirectory()).map(file => {
                    const isEmpty = isDirectoryOnlyFilesOrEmpty(path.join(pathDir, file.name));
                    return {
                        name: file.name,
                        empty: isEmpty == null || isEmpty,
                        error: isEmpty == null
                    }
                });
                let filesArr = [];
                if (showFiles) {
                    filesArr = files.filter(file => !file.isDirectory()).map(file => {
                        return {
                            name: file.name
                        }
                    });
                }
                return res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ path: pathDir, folders: foldersArr, files: filesArr }));
            }
        });
    } else if (pathname === '/get_cache_size') {
        return res
            .writeHead(200, { 'Content-Type': 'text/plain' })
            .end(formatBytes((await fs.promises.stat(settingsModule.getCacheDir())).size));
    } else if (pathname === '/clear_cache') {
        fs.readdirSync(settingsModule.getCacheDir()).forEach(f => fs.rmSync(`${settingsModule.getCacheDir()}/${f}`, {recursive: true}));
        return res
            .writeHead(200)
            .end(formatBytes((await fs.promises.stat(settingsModule.getCacheDir())).size));
    } else if (pathname === '/clear_logs') {
        await logsModule.reset();
        return res
            .writeHead(200)
            .end();
    } else if (pathname === '/clear_settings') {
        await settingsModule.reset();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(getStatus());
    } else if (pathname === '/log-file') {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Type', 'text/plain');
        const stream = fs.createReadStream(settingsModule.getObjects().app.logs_file);
        stream.pipe(res);
        stream.on('error', err => {
            try {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'InternalServerError', message: err.message }));
            } catch (err) {}
        });
    } else {
        serve(req, res, () => {
            res.writeHead(404);
            res.end('404 Not Found');
        });
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 b';
    const k = 1024;
    const sizes = ['b', 'Kb', 'Mb', 'Gb', 'Tb'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getStatus() {
    const modifiedData = JSON.parse(JSON.stringify(settingsModule.getObjects()));
    modifiedData.serverRunning = subServerModule.getObjects().is_run;
    modifiedData.host = subServerModule.getObjects().host;
    return JSON.stringify(modifiedData);
}

async function readTextFromFile(filePath) {
    try {
        const text = await fs.promises.readFile(filePath, 'utf-8');
        return text;
    } catch (error) {
        return '';
    }
}

function isDirectoryOnlyFilesOrEmpty(directoryPath) {
    try {
        const files = fs.readdirSync(directoryPath)
        for (const entry of files) {
            const stats = fs.statSync(path.join(directoryPath, entry))
            if (stats.isDirectory()) return false;
        };
        return true;
    } catch(err) {
        return null;
    }
}

function getLocalAddres() {
    const localAddress = Object.values(networkInterfaces)
        .flat()
        .find(info => info.family === 'IPv4' && info.address === '127.0.0.1')?.address;
    if (localAddress) {
        return localAddress;
    }
    return '127.0.0.1';
}

function getIPv4Addres() {
    const localAddress = Object.values(networkInterfaces)
        .flat()
        .find(info => info.family === 'IPv4' && !info.internal)?.address;
    // const localAddress = ip.address('public', 'ipv4');
    if (localAddress) {
        return localAddress;
    }
    return '0.0.0.0';
}

function getIPv6Addres() {
    return ipv4ToIpv6(getIPv4Addres());
}

function ipv4ToIpv6(ipv4Address) {
    const ipv4Parts = ipv4Address.split(".");
    const ipv4Bytes = ipv4Parts.map(part => parseInt(part));
    const ipv6Bytes = new Uint8Array(16);

    ipv6Bytes[10] = 0xff;
    ipv6Bytes[11] = 0xff;
    ipv6Bytes[12] = ipv4Bytes[0];
    ipv6Bytes[13] = ipv4Bytes[1];
    ipv6Bytes[14] = ipv4Bytes[2];
    ipv6Bytes[15] = ipv4Bytes[3];

    const ipv6 = `::ffff:${ipv6Bytes[12].toString(16).padStart(2, '0')}${ipv6Bytes[13].toString(16).padStart(2, '0')}:${ipv6Bytes[14].toString(16).padStart(2, '0')}${ipv6Bytes[15].toString(16).padStart(2, '0')}`;
    return ipv6;
}

module.exports = { startMain, stopAll, stop, run };
