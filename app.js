const { program } = require('commander');
const open = require('open');
const readline = require('readline');
const net = require('net');
const Socket = net.Socket;
const serverModule = require('./modules/server');
const settingsModule = require('./modules/settings');
const logsModule = require('./modules/logs');


process.on('SIGINT', async function() {
    serverModule.stopAll();
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function isPortTaken(port) {
    return new Promise((resolve) => {
        const socket = new Socket();
        socket.on("timeout", () => {
            resolve(false);
            socket.destroy();
        });
        socket.on("connect", () => {
            resolve(true);
        });
        socket.on("error", error => {
            if (error.code !== "ECONNREFUSED") resolve(true);
            else resolve(false);
        });
        socket.connect(port, "0.0.0.0");
    });
}

async function findAvailablePort(startPort) {
    let port = startPort;
    let maxPort = startPort + 100;
    while (await isPortTaken(port)) {
        if (port >= maxPort) {
            throw new Error('No available ports found');
        }
        port++;
    }
    return port;
}

const originalLog = console.log;

console.log = function (...args) {
    originalLog.apply(console, args);
    rl.prompt();
};

program
    .option('-p, --port <port>', 'Set server port', parseInt)
    .option('-d, --dir <dir>', 'Set server dir', String)
    .option('-r, --run', 'Run the server', false)
    .parse(process.argv);
(async () => {
    await settingsModule.init();
    await settingsModule.read();
    const port = await findAvailablePort(3000);
    const subPort = program.opts().port || 8080;
    const autoServer = program.opts().run || false;
    const pathServer = program.opts().dir || settingsModule.getObjects().path;
    await serverModule.startMain(port, pathServer, autoServer, subPort);


    if (settingsModule.getObjects().app.auto_web) {
        await open(`http://localhost:${port}`);
    }

    let exit = false;
    readline.emitKeypressEvents(process.stdin);
    process.stdin.on('keypress', (ch, key) => {
        if (key && key.name === 'escape') {
            console.log('Close app? (y)');
            exit = true
            rl.prompt();
        } else if (key && key.name === 'y' && exit) {
            console.log('\nExiting application...');
            rl.close();
        } else {
            exit = false
        }
    });
    process.stdin.setRawMode(true);

    rl.on('line', async(input) => {
        if (input.trim() === 'open') {
            await open(`http://localhost:${port}`);
        } else if (input.trim() === 'exit') {
            console.log('Exiting application...');
        } else if (input.trim() === 'stop') {
            await serverModule.stop();
        } else if (input.trim() === 'run') {
            await serverModule.run();
        } else if (input.trim() === 'help' || input.trim() === '-h') {
            const help = 
                'exit - Close application\n' + 
                'run  - Start server\n' +
                'stop - Stop server';
            console.log(help);
        } else {
            console.log('Unknown command. To get available commands -h');
        }
        rl.prompt();
    });
    rl.prompt();

    rl.on('close', async() => {
        console.log('Application closed.');
        await logsModule.write('Application closed.')
        process.exit(0);
    });
})();
