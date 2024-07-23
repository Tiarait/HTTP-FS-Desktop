const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const EventEmitter = require('events');

const settingsModule = require('./settings');

let filePath = settingsModule.getObjects().app.logs_file;
async function ensureLogFile() {
    filePath = settingsModule.getObjects().app.logs_file;
    try {
        await fs.stat(filePath);
    } catch (err) {
        if (err.code === 'ENOENT') {
            await fs.writeFile(filePath, '', 'utf8');
        }
    }
}


class LogWatcher extends EventEmitter {
    constructor(filePath) {
        super();
        ensureLogFile();
        this.filePath = filePath;
        this.watch();
    }

    async read() {
        if (settingsModule.getObjects().app.use_logs) {
            try {
                const data = await fs.readFile(this.filePath, 'utf-8');
                return data;
            } catch (err) {
                if (err.code === 'ENOENT') {
                    await fs.writeFile(filePath, '', 'utf8');
                }
                return '';
            }
        } else {
            return '';
        }
    }

    async writeError(log) {
        await this.write('[Error] ' + log);
    }

    async write(log) {
        if (settingsModule.getObjects().app.use_logs) {
            const logEntry = `${new Date().toISOString()} - ${log}\n`;
            try {
                await fs.appendFile(this.filePath, logEntry, 'utf-8');
                this.emit('log', logEntry);
            } catch (err) { 
                if (err.code === 'ENOENT') {
                    await fs.writeFile(filePath, '', 'utf8');
                }
            }
        }
    }

    async reset() {
        await fs.writeFile(filePath, '', 'utf8');
    }

    async watch() {
        if (settingsModule.getObjects().app.use_logs) {
            try {
                const stats = await fs.stat(this.filePath);
                this.position = stats.size;
            } catch (err) {
                this.position = 0;
                if (err.code === 'ENOENT') {
                    await fs.writeFile(filePath, '', 'utf8');
                }
            }

            fsSync.watch(this.filePath, async (eventType, filename) => {
                if (eventType === 'change') {
                    try {
                        const stats = await fs.stat(this.filePath);
                        if (stats.size > this.position) {
                            const fd = await fs.open(this.filePath, 'r');
                            const buffer = Buffer.alloc(stats.size - this.position);
                            await fd.read(buffer, 0, buffer.length, this.position);
                            this.position = stats.size;
                            this.emit('change', buffer.toString('utf-8'));
                            // console.log('buffer.toString  ' + buffer.toString('utf-8'));
                            await fd.close();
                        } else {
                            // console.log('stats.size ' + stats.size + ' this.position ' + this.position);
                        }
                    } catch (error) {
                        this.emit('change', '[ERROR] Error reading changed log file: ' + error.message);
                        // console.error('Error reading changed log file:', error);
                    }
                } else {
                    // console.log('eventType ' + eventType);
                }
            });
        }
    }
}
const logWatcher = new LogWatcher(filePath);

module.exports = logWatcher;