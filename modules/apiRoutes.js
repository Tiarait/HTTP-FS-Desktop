const fs = require('fs');
const fsExtra = require('fs-extra'); //for moving
const url = require('url');
const mime = require('mime');
const path = require('path');
const formidable = require('formidable'); //for upload
// const archiver = require('archiver');//Ikarus Trojan.JS.Spy
const yazl = require('yazl');
const settingsModule = require('./settings');
const logsModule = require('./logs');
var startPath = ''

function setStartPath(newStartPath) {
    startPath = newStartPath;
}

async function countInDirectory(dir) {
    const files = await fs.promises.readdir(dir);
    let total = 0;
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stats = await fs.promises.stat(fullPath);
        if (stats.isFile()) {
            total++;
        } else if (stats.isDirectory()) {
            total += await countInDirectory(fullPath);
        }
    }
    return total;
}

function handleSocketRequests(server, ws, req) {
    if (req.url === '/api/files/status') {
        if (!settingsModule.getObjects().client.check_connection) {
            ws.close();
            return;
        }
        //const ip = req.connection.remoteAddress;
        //const address = server.address();
        //console.log(`server [${address.address}:${address.port}] ip=${ip}`);
                    
        const sendStatus = () => {
            ws.send('online');

            let time = 0;
            const interval = setInterval(() => {
                let isOff = !server.listening;
                if (isOff) {
                  ws.send('offline');
                  clearInterval(interval);
                  ws.close();
                } else {
                  ws.send('online');
                }
                time += 2000;
            }, 2000);
            ws.on('close', () => clearInterval(interval));
        };
        sendStatus();
    } else if (req.url === '/api/files/download-zip') {
        ws.on('message', async (message) => {
            zipWithYazl(message, ws)
        });
    } else {
        ws.close();
    }
}

async function addFilesToZipYazl(zipfile, basePath, relativePath = '') {
    const fullPath = path.join(basePath, relativePath);
    const items = await fs.promises.readdir(fullPath);
    for (const item of items) {
        const itemFullPath = path.join(fullPath, item);
        const itemRelativePath = path.join(relativePath, item);
        const stats = await fs.promises.stat(itemFullPath);
        if (stats.isFile()) {
            zipfile.addFile(itemFullPath, itemRelativePath);
        } else if (stats.isDirectory()) {
            zipfile.addEmptyDirectory(itemRelativePath);
            await addFilesToZipYazl(zipfile, basePath, itemRelativePath);
        }
    }
}

async function zipWithYazl(message, ws) {
    try {
        const request = JSON.parse(message);
        const { names, path: pathParameter } = request;
        if (!names || !pathParameter) {
            ws.send(JSON.stringify({ error: 'Missing filename parameter' }));
            ws.close();
            return;
        }
        const pathQuery = formatPathQuery(pathParameter);
        const nameZipFile = `.HttpFs-${Date.now()}.temp`;
        const tempZipFile = path.join(startPath, pathQuery, nameZipFile);

        const zipfile = new yazl.ZipFile();
        let totalFiles = 0;
        for (const name of names) {
            const fullPath = path.join(startPath, pathQuery, name);
            if (fs.existsSync(fullPath)) {
                const stats = fs.statSync(fullPath);
                if (stats.isFile()) {
                    totalFiles++;
                    zipfile.addFile(fullPath, name);
                } else if (stats.isDirectory()) {
                    const dirFiles = await countInDirectory(fullPath);
                    totalFiles += dirFiles;
                    zipfile.addEmptyDirectory(name);
                    await addFilesToZipYazl(zipfile, fullPath, '');
                }
            } else {
                ws.send(JSON.stringify({ error: `File or directory not found: ${path.join(pathParameter, name)}` }));
                zipfile.end();
                fs.unlink(tempZipFile, (err) => {
                    if (err) throw err;
                });
                ws.close();
                return;
            }
        }

        zipfile.outputStream.pipe(fs.createWriteStream(tempZipFile)).on('close', () => {
            ws.send(JSON.stringify({ progress: `Send: 00%` }));
            const fileSize = fs.statSync(tempZipFile).size;
            let totalBytesSent = 0;

            const zipStreamOut = fs.createReadStream(tempZipFile);
            zipStreamOut.on('data', (chunk) => {
                ws.send(chunk);
                totalBytesSent += chunk.length;
                const progress = Math.round((totalBytesSent / fileSize) * 100);
                const pr = (progress == 100 ? 99 : progress).toString();
                ws.send(JSON.stringify({ progress: `Send: ${progress < 10 ? `0${pr}` : pr}%` }));
            });
            zipStreamOut.on('end', () => {
                ws.send(JSON.stringify({ progress: 'Send: 100%' }));
                const nameZip = names.length == 1 ? `${names[0]}.zip` : `HttpFs-files-${names.length}.zip`;
                ws.send(JSON.stringify({ filename: nameZip, totalSize: fileSize.toString() }));
                fs.unlink(tempZipFile, (err) => {
                    if (err) throw err;
                });
                ws.close();
            });
            zipStreamOut.on('error', (err) => {
                ws.send(JSON.stringify({ error: err.message }));
                fs.unlink(tempZipFile, (err) => {
                    if (err) throw err;
                });
                ws.close();
            });
        });

        zipfile.end();
    } catch (error) {
        console.error(error);
        ws.send(JSON.stringify({ error: error.message }));
        ws.close();
    }
}

// function zipWithArchiver(message, ws) {
//     try {
//         const request = JSON.parse(message);
//         const { names, path: pathParameter } = request;
//         if (!names || !pathParameter) {
//             ws.send(JSON.stringify({ error: 'Missing filename parameter' }));
//             ws.close();
//             return;
//         }
//         const pathQuery = formatPathQuery(pathParameter);
//         const nameZipFile = `.HttpFs-${Date.now()}.temp`;
//         const tempZipFile = path.join(startPath, pathQuery, nameZipFile);

//         const archive = archiver('zip', { zlib: { level: 0 } });
        
//         archive.on('warning', (err) => {
//             if (err.code === 'ENOENT') {
//                 console.warn(err);
//             } else {
//                 throw err;
//             }
//         });

//         archive.on('error', (err) => {
//             ws.send(JSON.stringify({ error: err.message }));
//             console.error(err);
//             fs.unlink(tempZipFile, (err) => {
//                 if (err) throw err;
//             });
//             ws.close();
//         });
//         let totalFiles = 0;
//         archive.on('progress', function (progress) {
//             const percent = ((progress.entries.processed / totalFiles) * 100).toFixed(2);
//             ws.send(JSON.stringify({ progress: `Zip ${percent}%` }));
//         })
//         let current = 0;
//         const zipStream = fs.createWriteStream(tempZipFile);
//         archive.pipe(zipStream);
//         names.forEach(name => {
//             current++
//             // let sizeOf = names.length == 1 ? '... ' : `: (${current}/${names.length})... `;
//             // if (names.length >= 10 && current < 10) sizeOf = `: (0${current}/${names.length})... `;
//             // let pr = 0;

//             const fullPath = path.join(startPath, pathQuery, name);
//             if (fs.existsSync(fullPath)) {
//                 const stats = fs.statSync(fullPath);
//                 if (stats.isFile()) {
//                     totalFiles++;
//                     archive.file(fullPath, { name: name });
//                 } else if (stats.isDirectory()) {
//                     archive.directory(fullPath, name);
//                     countInDirectory(fullPath).then(filesCount => totalFiles += filesCount )
//                 }
//             } else {
//                 ws.send(JSON.stringify({ error: `File or directory not found: ${path.join(pathParameter, name)}` }));
//                 fs.unlink(tempZipFile, (err) => {
//                     if (err) throw err;
//                 });
//                 ws.close();
//                 return;
//             }
//         });
//         archive.finalize();
//         archive.on('end', () => {
//             ws.send(JSON.stringify({ progress: `Send: 00%` }));
//             const fileSize = archive.pointer();
//             let totalBytesSent = 0;

//             const zipStreamOut = fs.createReadStream(tempZipFile);
//             zipStreamOut.on('data', (chunk) => {
//                 ws.send(chunk);
//                 totalBytesSent += chunk.length;
//                 const progress = Math.round((totalBytesSent / fileSize) * 100);
//                 const pr = (progress == 100 ? 99 : progress).toString();
//                 ws.send(JSON.stringify({ progress: `Send: ${progress < 10 ? `0${pr}` : pr}%` }));
//             });
//             zipStreamOut.on('end', () => {
//                 ws.send(JSON.stringify({ progress: 'Send: 100%' }));
//                 const nameZip = names.length == 1 ? `${names[0]}.zip` : `HttpFs-files-${names.length}.zip`;
//                 ws.send(JSON.stringify({ filename: nameZip, totalSize: fileSize.toString() }));
//                 fs.unlink(tempZipFile, (err) => {
//                     if (err) throw err;
//                 });
//                 ws.close();
//             });
//             zipStreamOut.on('error', (err) => {
//                 ws.send(JSON.stringify({ error: err.message }));
//                 fs.unlink(tempZipFile, (err) => {
//                     if (err) throw err;
//                 });
//                 ws.close();
//             });
//         });
//     } catch (error) {
//         console.error(error);
//         ws.send(JSON.stringify({ error: error.message }));
//         ws.close();
//     }
// }

function handleApiRequests(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    if (pathname == '/api/files/list') {
        const rawQueryParams = new URLSearchParams(req.url.split('?')[1]);
        const rawPath = rawQueryParams.get('path');
        let pathQ = formatPathQuery(rawPath);
        if (pathQ.includes('?')) {
            pathQ = pathQ.substring(0, pathQ.indexOf('?'));
        }
        const dirPath = startPath + pathQ;
        return getApiFromPath(dirPath)
            .then(data => {
                let error = false;
                try {
                    if (JSON.parse(data).error) error = true;
                } catch (error) {}
                if (error) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    if (!settingsModule.getObjects().server.can_read && JSON.parse(data).msg == 'Its a file') {
                        res.end(JSON.stringify({
                            error: "Error no permission!"
                        }));
                    } else {
                        res.end(data)
                    }
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(data)
                }
            })
            .catch(err => {
                logsModule.writeError(err.message);
                res.writeHead(500);
                res.end(`Cant select folders [${dirPath}]\n${err.message}`)
            });
    } else if (pathname == '/api/files/tree') {
        const recursion = (parsedUrl.query.recursion || '0').replaceAll('"', '').replaceAll('\'','');
        const pathQ = formatPathQuery(parsedUrl.query.path);
        const dirPath = startPath + pathQ;
        const maxLvl = (parsedUrl.query.maxLvl || 3)
        const lvl = parsedUrl.query.lvl || dirPath.split('/').length - 2;
        return parallelRecursionTree(dirPath, recursion === '1', lvl + 1, lvl + maxLvl + 1)
            .then(data => {
                if (data.error) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    if (!settingsModule.getObjects().server.can_read && data.msg == 'Its a file') {
                        res.end(JSON.stringify({
                            error: "Error no permission!"
                        }));
                    } else {
                        res.end(data)
                    }
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    const n = (dirPath === "/" || dirPath === '' || dirPath == startPath) ? 'files' : path.basename(dirPath);
                    let mtime = 'undefined';
                    let inside = -1;
                    try {
                        inside = fs.readdirSync(dirPath).length;
                        mtime = fs.statSync(dirPath).mtimeMs.toString()
                    } catch(err) {}
                    const result = {
                        name: n,
                        url: formatPath(dirPath),
                        lvl: lvl,
                        date: mtime,
                        directory: true,
                        inside: inside,
                        list: settingsModule.getObjects().client.show_systems ? data : data.filter(entry => entry.date != 'undefined')
                    };
                    res.end(JSON.stringify(result));
                }
            })
            .catch(err => {
                //res.writeHead(500);
                logsModule.writeError(err.message);
                res.end(`Cant select folders [${pathQ}]\n${err.message}`)
            });
    } else if (pathname == '/api/files/upload') {
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'text/plain' });
            return res.end('Method Not Allowed');
        }
        const permissionCanWrite = settingsModule.getObjects().server.can_write;
        if (!permissionCanWrite) {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Error#9', message: 'Permission denied' }));
        }
        const freeSpaceMB = 100; // TODO
        if (freeSpaceMB < 50) {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Error#21', message: 'No free space on the disk' }));
        }
        const form = new formidable.IncomingForm();
        form.parse(req, (err, fields, files) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Error#6', message: 'Problem with file upload' }));
            }

            let uploadPath = startPath;
            if (fields.path) {
                uploadPath = path.join(startPath, formatPathQuery(fields.path));
            }
            if (files['files[]']) {
                const uploadedFiles = Array.isArray(files['files[]']) ? files['files[]'] : [files['files[]']];
                uploadedFiles.forEach(file => {
                    const relativeFilePath = file.originalFilename.replace(/\&and\//g, '');
                    const filePath = path.join(uploadPath, relativeFilePath);
                    const dirPath = path.dirname(filePath);
                    fs.mkdirSync(dirPath, { recursive: true });

                    fs.rename(file.filepath, filePath, (renameErr) => {
                        if (renameErr) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            return res.end(JSON.stringify({ error: 'Error#8', message: renameErr.message }));
                        }

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ success: true, message: 'File uploaded successfully' }));
                    });
                });
            } else {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Error#6', message: 'No file uploaded' }));
            }
        });
    } else if (pathname == '/api/files/delete') {
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'text/plain' });
            return res.end('Method Not Allowed');
        }
        const permissionCanWrite = settingsModule.getObjects().server.can_write;
        if (!permissionCanWrite) {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Error#9', message: 'Permission denied' }));
        }
        let requestBody = '';
        req.on('data', chunk => {
            requestBody += chunk.toString();
        });
        req.on('end', () => {
            try {
                const requestData = JSON.parse(requestBody);
                const names = requestData.names;
                const pathParameter = requestData.path;
                if (pathParameter) {
                    let fullPath = path.join(startPath, formatPathQuery(pathParameter));
                    if (fs.existsSync(fullPath)) {
                        let result = true;
                        if (names && names.length > 0) {
                            names.forEach(name => {
                                let filePath = path.join(fullPath, name);
                                if (fs.existsSync(filePath)) {
                                    if (fs.statSync(filePath).isDirectory()) {
                                        fs.rmSync(filePath, { recursive: true });
                                    } else {
                                        fs.unlinkSync(filePath);
                                    }
                                }
                            });
                        } else {
                            if (fs.statSync(fullPath).isDirectory()) {
                                fs.rmSync(fullPath, { recursive: true });
                            } else {
                                fs.unlinkSync(fullPath);
                            }
                        }
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    } else {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ error: 'File or folder not found' }));
                    }
                } else {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Missing path parameter' }));
                }
            } catch (error) {
                logsModule.writeError(err.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        });
    } else if (pathname == '/api/files/rename') {
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'text/plain' });
            return res.end('Method Not Allowed');
        }
        const permissionCanWrite = settingsModule.getObjects().server.can_write;
        if (!permissionCanWrite) {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Error#9', message: 'Permission denied' }));
        }
        let requestBody = '';
        req.on('data', chunk => {
            requestBody += chunk.toString();
        });

        req.on('end', () => {
            try {
                const requestData = JSON.parse(requestBody);
                const { name: newName, path: pathQuery } = requestData;

                if (!newName || !pathQuery) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Missing filename or path parameter' }));
                }
                const fullPath = path.join(startPath, formatPathQuery(pathQuery));
                
                fs.access(fullPath, fs.constants.F_OK, (existErr) => {
                    if (existErr) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ error: 'File or directory not found' }));
                    }

                    fs.rename(fullPath, path.join(path.dirname(fullPath), newName), (renameErr) => {
                        if (renameErr) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            return res.end(JSON.stringify({ error: renameErr.message }));
                        }

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ success: true }));
                    });
                });
            } catch (error) {
                logsModule.writeError(err.message);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Invalid JSON payload', message: error.message }));
            }
        });
    } else if (pathname == '/api/files/create') {
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'text/plain' });
            return res.end('Method Not Allowed');
        }
        const permissionCanWrite = settingsModule.getObjects().server.can_write;
        if (!permissionCanWrite) {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Error#9', message: 'Permission denied' }));
        }
        let requestBody = '';
        req.on('data', chunk => {
            requestBody += chunk.toString();
        });

        req.on('end', () => {
            try {
                const requestData = JSON.parse(requestBody);
                const { name: nameQuery, path: pathQuery } = requestData;

                if (!nameQuery || !pathQuery) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Missing filename or path parameter' }));
                }
                const isDirectory = nameQuery.endsWith("/");
                const fullPath = path.join(startPath, formatPathQuery(pathQuery), nameQuery.endsWith("/") ? nameQuery.substring(0, nameQuery.length - 1) : nameQuery);
                fs.access(fullPath, fs.constants.F_OK, (existErr) => {
                    if (!existErr) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ error: 'Error#10', message: 'File or directory already exists' }));
                    }

                    if (isDirectory) {
                        fs.mkdir(fullPath, { recursive: true }, (mkdirErr) => {
                            if (mkdirErr) {
                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                return res.end(JSON.stringify({ error: 'Error#TODO 1', message: mkdirErr.message }));
                            }

                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            return res.end(JSON.stringify({
                                name: nameQuery.substring(0, nameQuery.length - 1),
                                url: formatPath(fullPath),
                                permissions: '',
                                inside: '0',
                                directory: true,
                                size: 64,
                                size_max: formatBytes(64),
                                mimeType: '',
                                date: new Date().getTime().toString()
                            }));
                        });
                    } else {
                        fs.writeFile(fullPath, '', (writeErr) => {
                            if (writeErr) {
                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                return res.end(JSON.stringify({ error: 'Error#TODO 2', message: writeErr.message }));
                            }

                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            return res.end(JSON.stringify({
                                name: nameQuery,
                                url: formatPath(fullPath),
                                permissions: '',
                                inside: '0',
                                directory: false,
                                size: 0,
                                size_max: formatBytes(0),
                                mimeType: '',
                                date: new Date().getTime().toString()
                            }));
                        });
                    }
                });
            } catch (error) {
                logsModule.writeError(err.message);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Invalid JSON payload', message: error.message }));
            }
        });
    } else if (pathname == '/api/files/move') {
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'text/plain' });
            return res.end('Method Not Allowed');
        }
        const permissionCanWrite = settingsModule.getObjects().server.can_write;
        if (!permissionCanWrite) {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Error#9', message: 'Permission denied' }));
        }

        let requestBody = '';
        req.on('data', chunk => {
            requestBody += chunk.toString();
        });

        req.on('end', () => {
            try {
                const requestData = JSON.parse(requestBody);
                const { paths: pathsQueryStart, pathEnd: pathQueryEnd } = requestData;
                if (!pathsQueryStart || !pathQueryEnd) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Missing filename or path parameter' }));
                }
                const fullEndPath = path.join(startPath, formatPathQuery(pathQueryEnd));
                pathsQueryStart.forEach(pathQueryStart => {
                    const fullStartPath = path.join(startPath, formatPathQuery(pathQueryStart));
                    const newPath = path.join(fullEndPath, path.basename(fullStartPath));
                    fsExtra.move(fullStartPath, newPath, (err) => {
                        if (err) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            return res.end(JSON.stringify({ error: 'Error#TODO 3', message: err.message }));
                        } else {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            return res.end(JSON.stringify({ success: true }));
                        }
                    });
                });
            } catch (err) {
                logsModule.writeError(err.message);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Invalid JSON payload', message: err.message }));
            }
        });
    } else {
        res.writeHead(404);
        return res.end('404 Not Found - ' + pathname);
    }
    
}

const getFolderSizeParallel = async dir => {
    try {
        const files = await fs.promises.readdir( dir, { withFileTypes: true } );
        const paths = files.map( async file => {
            const p = path.join( dir, file.name );

            if ( file.isDirectory() ) return await getFolderSizeParallel( p );

            if ( file.isFile() ) {
                try {
                    const { size } = await fs.promises.stat( p );
                    return size;
                } catch (error) {
                    return 0;
                }
            }
            return 0;
        } );

        return ( await Promise.all( paths ) ).flat( Infinity ).reduce( ( i, size ) => i + size, 0 );
    } catch (error) {
        return 0;
    }
}

async function getFolderSize(folderPath) {
    const MAX_FILES = settingsModule.getObjects().client.folder_size_max || 10000;
    let fileCount = 0;
    let totalSize = 0;
    async function getSizeRecursive(pathItem) {
        try {
            const stats = await fs.promises.stat(pathItem);
            if (stats.isFile()) {
                totalSize += stats.size;
                fileCount++;
            } else if (stats.isDirectory()) {
                let files;
                try {
                    files = await fs.promises.readdir(pathItem, { withFileTypes: true });
                } catch (err) {
                    return;
                }
                if (fileCount >= MAX_FILES) {
                    totalSize = totalSize * -1;
                    return;
                }
                fileCount += files.length;
                const promises = files.map(file => getSizeRecursive(path.join(pathItem, file.name)));
                await Promise.all(promises);
            }
        } catch (error) {
            return totalSize;
        }
    }
    await getSizeRecursive(folderPath);
    return totalSize;
}

async function countInDirectory(directoryPath) {
    let count = 0;
    async function traverseDirectory(dirPath) {
        const files = await fs.promises.readdir(dirPath, { withFileTypes: true });
        for (const file of files) {
            count++;
            const filePath = path.join(dirPath, file.name);
            if (file.isDirectory()) {
                await traverseDirectory(filePath);
            }
        }
    }
    try {
        await traverseDirectory(directoryPath);
        return count;
    } catch (error) {
        // logsModule.writeError(err.message);
        return 0;
    }
}

async function parallelRecursionTree(dirPath, recursion, lvl, maxLvl) {
    let isDir = false;
    let isFile = false;
    try {
        const stats = await fs.promises.stat(dirPath);
        isDir = stats.isDirectory();
        isFile = stats.isFile();
    } catch (e) {}
    if (isDir) {
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
        const promises = entries
            .filter(entry => entry.isDirectory())
            .map(async entry => {
                const childPath = path.join(dirPath, entry.name);
                let subList = [];
                let mtime = 'undefined';
                let inside = -1;
                try {
                    const stats = await fs.promises.stat(childPath);
                    if (recursion && lvl < maxLvl) {
                        subList = await parallelRecursionTree(childPath, true, lvl+1, maxLvl);
                    }
                    mtime = stats.mtimeMs.toString();
                    if (recursion && lvl < maxLvl) {
                        inside = fs.readdirSync(childPath).length;
                    }
                } catch(err) {}
                return {
                    name: entry.name,
                    url: formatPath(childPath),
                    lvl: lvl,
                    date: mtime,
                    directory: true,
                    inside: inside,
                    list: subList
                };
            });
        return await Promise.all(promises);
    } else {
        return JSON.stringify({
            error: "Wrong path",
            msg: isFile ? "Its a file" : "Its not a dirrectory"
        });
    }
}

async function getApiFromPath(dirPath) {
    try {
        let isDir = false;
        let isFile = false;
        try {
            const stats = await fs.promises.stat(dirPath);
            isDir = stats.isDirectory();
            isFile = stats.isFile();
        } catch (e) {}

        const n = (dirPath === "/" || dirPath === '' || dirPath == startPath || dirPath == `${startPath}/`) ? 'files' : path.basename(dirPath);
        const current = {
            name: n,
            url: formatPath(dirPath),
            inside: "0"
        };
        if (isDir) {
            const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
            current.inside = entries.length.toString();

            const listPromises = entries.map(async entry => {
                const entryPath = path.join(dirPath, entry.name).replace(/\/\//g, '/');
                let insideFiles = entry.isDirectory() ? (-1).toString() : '';
                let permissions = '700';
                let size = 0;
                let sizeMax = formatBytes(0);
                let mimeType = entry.isDirectory() ? 'folder' : '';
                let mtimeMs = entry.mtime ? entry.mtime.getTime().toString() : 'undefined';

                try {
                    const stats = await fs.promises.stat(entryPath);
                    permissions = stats.mode.toString(8).slice(-3);
                    insideFiles = entry.isDirectory() ? (await fs.promises.readdir(entryPath)).length.toString() : '';
                    mimeType = entry.isDirectory() ? 'folder' : mime.getType(entry.name) || '';
                    mtimeMs = stats.mtimeMs.toString();
                    size = stats.size;
                    sizeMax = formatBytes(size);
                } catch (e) {}
                if (entry.isDirectory() && settingsModule.getObjects().client.can_folder_size) {
                    size = settingsModule.getObjects().client.folder_size_max === -1 ? await getFolderSizeParallel(entryPath) : await getFolderSize(entryPath);
                    if (size < 0) {
                        size = size * -1;
                        sizeMax = '> ' + formatBytes(size);
                    } else sizeMax = formatBytes(size);
                }
                mimeType = entry.isDirectory() ? 'folder' : mimeType;

                return {
                    name: entry.name,
                    url: formatPath(entryPath),
                    permissions: permissions,
                    inside: insideFiles,
                    directory: entry.isDirectory(),
                    size: size,
                    size_max: sizeMax,
                    mimeType: mimeType,
                    date: mtimeMs
                };
            });

            const list = await Promise.all(listPromises);

            const folders = list.filter(entry => entry.directory).length.toString();
            const files = list.filter(entry => !entry.directory).length.toString();
            return JSON.stringify({
                current: current,
                folders: folders,
                files: files,
                list: settingsModule.getObjects().client.show_systems ? list : list.filter(entry => entry.date != 'undefined')
            });
        }

        return JSON.stringify({
            error: "Wrong path",
            msg: isFile ? "Its a file" : "Its not a dirrectory"
        });
    } catch (err) {
        return JSON.stringify({
            error: "Unexpected err",
            msg: err.message
        });
        // console.error('getApiFromPath:', error);
        // throw error;
    }
}


function formatPath(selectedPath) {
    const start = startPath.replaceAll('\\', '/').replace('//', '/').replace('%', '%25');
    const selected = selectedPath.replaceAll('\\', '/').replace('//', '/').replace('%', '%25').replace(start, '');
    return ('/files/' + selected).replaceAll('\\', '/').replace('//', '/').replace('%', '%25').replace(start, '');
}

function formatPathQuery(queryPath) {
    let r = queryPath
    try {
        r =  decodeURIComponent(queryPath || '');
    } catch(e) {}
    return r.replaceAll('[%]', '%').replaceAll('\'', '').replaceAll('\\', '/').replace('//', '/').replaceAll('"', '').replace('/files/','/');
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 b';
    const k = 1024;
    const sizes = ['b', 'Kb', 'Mb', 'Gb', 'Tb'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = { handleApiRequests, setStartPath, handleSocketRequests };