document.addEventListener('DOMContentLoaded', async function() {
    const tabFunctions = await tab();
    tabFunctions.DOMContentLoaded();
});

async function tab() {
    const logsContainer = document.getElementById('logs-container');
    async function DOMContentLoaded() {
        const tabs = document.querySelectorAll('.squeare-tab');
        tabs.forEach(tab => {
            tab.classList.toggle('selected', tab.id == 'tab-logs');
        });
        
        checkLogs();
        // callbackOnline.connected = function(path) {
        //     checkLogs();
        //     return true;
        // }
    }


    let prevLog = '';
    let logscount = 0;
    function checkLogs() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const tableBody = logsContainer.getElementsByTagName('tbody')[0];
        wslogs = new WebSocket(`${protocol}//${host}/logs`);
        wslogs.onopen = () => {
            tableBody.style.setProperty('filter', '');
            tableBody.innerHTML = '';
            if (logscount >= 100) {
                const newRow = tableBody.insertRow(0);
                newRow.classList.add('log');
                newRow.innerHTML = '<a href="/log-file" target="blank" class="button logs"><p>Show file with all logs</p></a>';
            }
        };
        wslogs.onmessage = (event) => {
            // console.log('onmessage ' + event.data);
            // const logEntry = document.createElement('div');
            const logPattern = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z) - (.+)$/;
            const match = logPattern.exec(event.data);
            if (match && prevLog != event.data) {
                const originalDate = match[1];
                const message = match[2];

                const formattedDate = formatDate(originalDate);
                addLogToTable(formattedDate, message);
                prevLog = event.data;
            }
        };

        wslogs.onclose = () => {
            const date = new Date().toISOString();
            tableBody.style.setProperty('filter', 'filter: blur(2px);');
            addLogToTable(formatDate(date), 'Application closed.');
        };
        wslogs.onerror = (error) => {
            const date = new Date().toISOString();
            tableBody.style.setProperty('filter', 'filter: blur(2px);');
            addLogToTable(formatDate(date), '[Error]');
            console.error('Logs socket: ', error);
        };
    }

    function formatDate(isoDateString) {
        const date = new Date(isoDateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear().toString().substring(2);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}\n${day}.${month}.${year}`;
    }

    function addLogToTable(date, message) {
        logscount++;
        const tableBody = logsContainer.getElementsByTagName('tbody')[0];
        const newRow = tableBody.insertRow(0);
        newRow.classList.add('log');

        const dateCell = newRow.insertCell(0);
        const messageCell = newRow.insertCell(1);

        const logPattern = /^\[([^\]]+)\] ([^\s]+) \[(\d{3})\] \(([^,]+)\), ([\d.]+) ms$/;
        const match = logPattern.exec(message);
        if (message.indexOf('[Error] ') != -1 || message.indexOf('Server stopped') != -1 || message == 'Application closed.') {
            newRow.classList.add('red');
            message = message.replace(`[Error] `, ``);
        } else if (message.indexOf('Server was runned ') != -1) {
            newRow.classList.add('green');
        }
        if (match) {
            const ip = match[1];
            message = message.replace(`[${ip}]`, `<font color="DeepSkyBlue">[${ip}]</font>`);

            const link = match[4];
            const url = (settings.server.use_ssl ? 'https' : 'http') + `://${settings.host}:${settings.port}` + link;
            message = message.replace(`(${link})`, `<a target="_blank" href="${url}">${decodeURIComponent(link)}</a>`);


            const statusCode = match[3];
            let color = 'chartreuse'
            if (statusCode >= 300 && statusCode < 400) {
                color = 'orange';
            } else if (statusCode >= 400) {
                color = 'red';
            }
            message = message
                .replace(`[${statusCode}]`, `<font color="${color}">[${statusCode}]</font>`)
                .replaceAll(` [`, `<font color="DeepSkyBlue">[`).replaceAll('] ',  ']</font>');
        } else {
            message = message.replaceAll(`[`, `<font color="DeepSkyBlue">[`).replaceAll(']',  ']</font>');
        }

        dateCell.textContent = date;
        messageCell.innerHTML = message;
        // tableBody.scrollTo(0, tableBody.scrollHeight);
    }

    return {
        DOMContentLoaded
    };
}