document.addEventListener('DOMContentLoaded', async function() {
    const tabFunctions = await tab();
    tabFunctions.DOMContentLoaded();
});

async function tab() {
    var qrView = document.getElementById("qrcode");
    const startServerBtn = document.getElementById('startServerBtn');
    const restartServerBtn = document.getElementById('restartServerBtn');
    const qrServerBtn = document.getElementById('qrServerBtn');
    const webServerBtn = document.getElementById('webServerBtn');
    const pathInput = document.getElementById('pathInput');
    // window.addEventListener('resize', sizeWindow);
    async function DOMContentLoaded() {
        isServerRunnedCheck(settings, true);
        const tabs = document.querySelectorAll('.squeare-tab');
        tabs.forEach(tab => {
            tab.classList.toggle('selected', tab.id == 'tab-main');
        });

        qrView = document.getElementById("qrcode");

        if (qrView) qrView.addEventListener('click', async () => {
            qrView.style.setProperty('display', 'none');
            qrView.classList.add("hide");
        });
        if (qrServerBtn) qrServerBtn.addEventListener('click', async () => {
            if (isRun && isOnline) {
                qrView.style.setProperty('display', '');
                qrView.classList.remove("hide");
            } else {
                addNotification('First need to start the server.');
            }
        });
        if (webServerBtn) webServerBtn.addEventListener('click', async () => {
            if (isRun && isOnline) {
                window.open(url, '_blank');
            } else {
                addNotification('First need to start the server.');
            }
        });
        if (startServerBtn) startServerBtn.addEventListener('click', async () => {
            if (!isOnline) {
                addNotification('First need to start the server.');
                return;
            }
            if (isRun) {
                let response = await fetch(`/stopServer`, { method: 'GET' });
                if (!response.ok) {
                    addNotification('Can\'t stop server.\nNetwork response was not ok');
                    return;
                }
                let result = await response.text();
                if (result === 'true' || result === 'false') {
                    addNotification(result === 'true' ? 'The server has stopped.' :  'The server is not stopped.', result === 'true' ? 'green' : 'red');
                } else {
                    addNotification('Can\'t stop server.\n' + result);
                    console.error(result);
                }
                isServerRunned();
            } else {
                if (!port) {
                    addNotification('Enter port to start.');
                } else if (!path) {
                    addNotification('Enter path to start.');
                } else {
                    port = document.getElementById('portInput').value;
                    updPathFromValue();
                    let response = await fetch(`/startServer?port=${port}&path=${path}`, { method: 'GET' });
                    if (!response.ok) {
                        addNotification('Can\'t run server.\nNetwork response was not ok');
                        return;
                    }
                    let result = await response.text();
                    if (result === 'true' || result === 'false') {
                        addNotification(result === 'true' ? 'The server has started.' :  'The server is not started.', result === 'true' ? 'green' : 'red');
                    } else {
                        addNotification('Can\'t start server.\n' + result);
                        console.error(result);
                    }
                    isServerRunned();
                }
            }
        });
        if (restartServerBtn) restartServerBtn.addEventListener('click', async () => {
            if (!isRun || !isOnline) {
                addNotification('First need to start the server.');
                return;
            }
            let response = await fetch(`/stopServer`, { method: 'GET' });
            if (!response.ok) {
                addNotification('Can\'t restart server.\nNetwork response was not ok');
                return;
            }
            let result = await response.text();
            if (result === 'true') {
                port = document.getElementById('portInput').value;
                updPathFromValue();
                let response = await fetch(`/startServer?port=${port}&path=${path}`, { method: 'GET' });
                if (!response.ok) {
                    addNotification('Can\'t restart server.\nNetwork response was not ok');
                    return;
                }
                let result = await response.text();
                if (result === 'true' || result === 'false') {
                    addNotification(result === 'true' ? 'The server has restarted.' :  'The server is not restarted.', result === 'true' ? 'green' : 'red');
                } else {
                    addNotification('Can\'t restart server.\n' + result);
                    console.error(result);
                }
            } else {
                addNotification('Can\'t restart server.\n' + result);
                console.error(result);
            }
            isServerRunned();
        });

        const pathSelectBtn = document.getElementById('pathSelectBtn')
        if (pathSelectBtn) pathSelectBtn.addEventListener('click', () => {
            if (!isOnline) {
                addNotification('First need to start the server.');
                return;
            }
            updPathFromValue();
            const p = path.replaceAll('\\', '/').replace(/\/+/g, '/');
            let callback = {positive: function(nPath) {
                path = nPath.replaceAll('\\', '/').replace(/\/+/g, '/');
                pathInput.value = path;
                fetch(`/set_settings_path?path='${path}'`)
                .catch(error => {
                    addNotification(error);
                    console.error('Ошибка:', error);
                });
                return true;
            }, negative: function() {return true;}}
            selectPath(p, false, callback);
        });

        const hostSelectBtn = document.getElementById('host_select')
        if (hostSelectBtn) hostSelectBtn.addEventListener('change', (e) => {
            if (!isOnline) {
                addNotification('First need to start the server.');
                return;
            }
            const selectElement = e.target;
            const value = selectElement.value;

            const local = value === 'All' || value === 'Local';
            const IPv4 = value === 'All' || value === 'IPv4';
            const IPv6 = value === 'All' || value === 'IPv6';
            fetch(`/set_settings_hosts?local=${local}&ipv4=${IPv4}&ipv6=${IPv6}`)
            .catch(error => {
                addNotification(error);
                console.error('Ошибка:', error);
            });
        });
    }

    function updPathFromValue() {
        path = path.replaceAll('\\', '/').replace(/\/+/g, '/');
        const pathVal = pathInput.value.replaceAll('\\', '/').replace(/\/+/g, '/');
        path = pathVal == '' ? path : pathVal;
    }

    function start_and_end(str) {
        if (str.length > 37) {
            return '...' + str.substr(str.length-33, str.length);
        }
        return str;
    }

    async function isServerRunned(hard = false) {
        fetch('/status')
        .then(response => response.text())
        .then(r => {
            isServerRunnedCheck(JSON.parse(r), hard);
        })
        .catch(error => console.error('Ошибка:', error));
    }
    function isServerRunnedCheck(r, hard = false) {
        settings = r;
        // if (script) eval(script);
        isRun = r.serverRunning;
        // document.getElementById('tab-logs').classList.toggle('disable', !isRun);
        
        if (startServerBtn) startServerBtn.textContent = !isRun ? '▶   Run server' : '◼   Stop server'
        if (restartServerBtn) restartServerBtn.classList.toggle('disable', !isRun);
        if (qrServerBtn) qrServerBtn.classList.toggle('disable', !isRun);
        if (webServerBtn) webServerBtn.classList.toggle('disable', !isRun);

        if (isRun || hard) {
            path = r.path;
            port = r.port;
            if (pathInput && document.activeElement !== pathInput) pathInput.value = path;
            const portInput = document.getElementById('portInput');
            if (portInput && document.activeElement !== portInput) portInput.value = port;
            const hostSelectBtn = document.getElementById('host_select');
            if (hostSelectBtn) hostSelectBtn.querySelector(`option[value="All"]`).selected = r.hosts.length == 3;
            if (r.hosts.length != 3) {
                for (const [i, type] of ['Local', 'IPv4', 'IPv6'].entries()) {
                    const isSelected = r.hosts_need.includes(type);
                    if (hostSelectBtn) hostSelectBtn.querySelector(`option[value="${type}"]`).selected = isSelected;
                    if (isSelected && hostSelectBtn) selectOption(hostSelectBtn, i + 1);
                }
            } else {
                if (hostSelectBtn) selectOption(hostSelectBtn, 0)
            }
        }
        let nUrl = (settings.server.use_ssl ? 'https' : 'http') + `://${r.host.startsWith('::') ? `[${r.host}]` : r.host}:${r.port}`;
        let locationFile = '';
        if (settings.server.use_initial && settings.server.use_initial_path.startsWith(settings.path))
            locationFile = settings.server.use_initial_path.replace(settings.path, '');
        if (settings.server.use_initial && locationFile) {
            nUrl = nUrl + ('/files/' + locationFile).replaceAll('//', '/');
        }
        const qrView = document.getElementById("qrcode");
        if (qrView && nUrl != url) {
            url = nUrl;
            qrView.innerHTML = '';
            const width = 400
            const qrcode = new QRCode(qrView, {
                text: url,
                width: width,
                height: width,
                colorDark : "#000000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
            });
        }
    }

    function selectOption(elem, index) { 
        elem.options.selectedIndex = index;
    }
    return {
        DOMContentLoaded,
        isServerRunnedCheck
    };
}
