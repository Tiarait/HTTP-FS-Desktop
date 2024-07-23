document.addEventListener('DOMContentLoaded', async function() {
    const tabFunctions = await tab();
    tabFunctions.DOMContentLoaded();
});

async function tab() {
    const autoserver = document.getElementById('setting-autoserver');
    const autoweb = document.getElementById('setting-autoweb');

    const clearLogs = document.getElementById('clear_logs');
    const clearSettings = document.getElementById('clear_settings');

    const showSystem = document.getElementById('setting-showsystem');
    const checkConn = document.getElementById('setting-checkconn');
    const folderSize = document.getElementById('setting-foldersize');
    const thumbnails = document.getElementById('setting-thumbnails');
    const clearCache = document.getElementById('setting-clearcache');

    const usePass = document.getElementById('setting-usepass');
    const usePassContainer = document.getElementById('setting-usepass-container');
    const usePassLogin = document.getElementById('loginInput');
    const usePassPassword = document.getElementById('passInput');
    const usePassSession = document.getElementById('sessionInput');
    const logoutAll = document.getElementById('logout-all');

    const useHttps = document.getElementById('setting-https');
    const useHttpsContainer = document.getElementById('setting-https-container');

    const permissionRead = document.getElementById('setting-pread');
    const permissionWrite = document.getElementById('setting-pwrite');

    const pathInputVal = document.getElementById('pathInput');
    const pathBtn = document.getElementById('pathSelectBtn');
    const portInput = document.getElementById('portInput');

    const useInitial = document.getElementById('setting-initial');
    const useInitialContainer = document.getElementById('setting-initial-container');
    const useInitialPath = document.getElementById('pathFileInput');
    const useInitialPathBtn = document.getElementById('pathFileSelectBtn');
    const useInitialRedirect = document.getElementById('setting-file-redirect');

    const logsFile = document.getElementById('logFilePath');
    const configFile = document.getElementById('configFilePath');

    const certKey = document.getElementById('sslKeyInput');
    const certCrt = document.getElementById('sslCrtInput');

    async function DOMContentLoaded() {
        usePassLogin.value = settings.server.login;
        usePassPassword.value = settings.server.password;
        usePassSession.value = settings.server.session_time;
        useInitialPath.value = settings.server.use_initial_path;
        pathInputVal.value = settings.path;
        portInput.value = settings.port;

        logsFile.innerHTML = settings.app.logs_file;
        configFile.innerHTML = settings.app.config_file;
        logsFile.title = settings.app.logs_file;
        configFile.title = settings.app.config_file;
        // logsFile.addEventListener('click', async (e) => {
        //     toggleTextSelection(logsFile);
        // });
        // configFile.addEventListener('click', async (e) => {
        //     toggleTextSelection(configFile);
        // });
        clearCache.addEventListener('click', async (e) => {
            let response = await fetch(`/clear_cache`, { method: 'GET' });
            if (response.ok) {
                addNotification('Cleared', 'green');
                clearCache.innerHTML = `<p>Clear cache: ${await response.text()}</p>`
                return;
            }
        });
        clearLogs.addEventListener('click', async (e) => {
            let callback = {positive: async function() {
                let response = await fetch(`/clear_logs`, { method: 'GET' });
                if (response.ok) {
                    addNotification('Cleared', 'green');
                    clearCache.innerHTML = `<p>Clear cache: ${await response.text()}</p>`;
                }
                return true;
            }, negative: function() {return true;}}
            dialogAlert('Clear logs', undefined, 'Are You sure?', callback);
        });
        clearSettings.addEventListener('click', async (e) => {
            let callback = {positive: async function() {
                let response = await fetch(`/clear_settings`, { method: 'GET' });
                if (response.ok) {
                    try {
                        settings = JSON.parse(await response.text());
                        DOMContentLoaded();
                        addNotification('Reset', 'green');
                    } catch (error) {
                        addNotification(error.massage, 'red');
                    }
                }
                return true;
            }, negative: function() {return true;}}
            dialogAlert('Reset settings', undefined, 'Are You sure?', callback);
        });

        certKey.value = settings.server.ssl_key_path;
        certCrt.value = settings.server.ssl_crt_path;
        certKey.title = settings.server.ssl_key_path;
        certCrt.title = settings.server.ssl_crt_path;

        updSettingsVisual();
        usePassPassword.addEventListener('change', async (e) => {
            await updSettings();
        });
        usePassLogin.addEventListener('change', async (e) => {
            await updSettings();
        });
        usePassSession.addEventListener('change', async (e) => {
            await updSettings();
        });
        useInitialPath.addEventListener('change', async (e) => {
            if (!useInitialPath.value.startsWith(pathInputVal.value)) {
                addNotification('Initial file must be inside server dir');
            } else {
                await updSettings();
            }
        });
        pathInputVal.addEventListener('change', async (e) => {
            await updSettings();
        });
        portInput.addEventListener('change', async (e) => {
            await updSettings();
        });
        pathBtn.addEventListener('click', async (e) => {
            const p = pathInputVal.value.replaceAll('\\', '/').replace(/\/+/g, '/');
            let callback = {positive: function(path) {
                pathInputVal.value = path.replaceAll('\\', '/').replace(/\/+/g, '/');
                updSettings();
                return true;
            }, negative: function() {return true;}}
            selectPath(p, false, callback);
        });
        useInitialPathBtn.addEventListener('click', async (e) => {
            const p = pathInputVal.value.replaceAll('\\', '/').replace(/\/+/g, '/');
            let callback = {positive: function(path) {
                useInitialPath.value = path.replaceAll('\\', '/').replace(/\/+/g, '/');
                if (!useInitialPath.value.startsWith(pathInputVal.value)) {
                    addNotification('Initial file must be inside server dir');
                } else {
                    updSettings();
                }
                return true;
            }, negative: function() {return true;}}
            selectPath(p, true, callback);
        });
        logoutAll.addEventListener('click', async (e) => {
            let response = await fetch('/session_recreate', {
                method: 'GET'
            });
            if (!response.ok) {
                addNotification('Unable to log out users.\nNetwork response was not ok');
                return;
            }
            let result = await response.text();
            if (result === 'true' || result === 'false') {
                addNotification(result === 'true' ? 'Users logout successful.' :  'Unable to log out users.', result === 'true' ? 'green' : 'red');
            } else {
                addNotification('Unable to logout users.\n' + result);
                console.error(result);
            }
        });

        const tabs = document.querySelectorAll('.squeare-tab');
        tabs.forEach(tab => {
            tab.classList.toggle('selected', tab.id == 'tab-settings');
        });

        if (autoserver) {
            toggleCheckboxSetting(autoserver, 'app', 'auto_start');
        }
        if (autoweb) {
            toggleCheckboxSetting(autoweb, 'app', 'auto_web');
        }
        if (usePass) {
            toggleCheckboxSetting(usePass, 'server', 'use_pass');
        }
        if (useHttps) {
            toggleCheckboxSetting(useHttps, 'server', 'use_ssl');
        }
        if (permissionRead) {
            toggleCheckboxSetting(permissionRead, 'server', 'can_read');
        }
        if (permissionWrite) {
            toggleCheckboxSetting(permissionWrite, 'server', 'can_write');
        }
        if (useInitial) {
            toggleCheckboxSetting(useInitial, 'server', 'use_initial');
        }
        if (useInitialRedirect) {
            toggleCheckboxSetting(useInitialRedirect, 'server', 'use_initial_redirect');
        }

        if (showSystem) {
            toggleCheckboxSetting(showSystem, 'client', 'show_systems');
        }
        if (checkConn) {
            toggleCheckboxSetting(checkConn, 'client', 'check_connection');
        }
        if (folderSize) {
            toggleCheckboxSetting(folderSize, 'client', 'can_folder_size');
        }
        if (thumbnails) {
            toggleCheckboxSetting(thumbnails, 'client', 'can_thumbnails');
        }

        clearCache.innerHTML = `<p>Clear cache: ${await (await fetch(`/get_cache_size`, { method: 'GET' })).text()}</p>`
    }

    async function toggleCheckboxSetting(element, key1, key2) {
        element.addEventListener('click', async function(event) {
            if (event.target.tagName.toLowerCase() !== 'input') {
                await toggleCheckbox(event, key1, key2);
            }
        });
        element.addEventListener('keydown', async function(event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                await toggleCheckbox(event, key1, key2);
            }
        });
        element.querySelector('input[type="checkbox"]').checked = settings[key1][key2];
        element.querySelector('input[type="checkbox"]').addEventListener('click', async function(event) {
            this.checked = !this.checked;
            // settings[key1][key2] = !settings[key1][key2];
            // await updSettings();
        });
        // element.querySelector('input[type="checkbox"]').addEventListener('change', async function(event) {
        //     console.log('updSettings change ' + settings[key1][key2] + '|' + this.checked);
        //     settings[key1][key2] = this.checked;
        //     await updSettings();
        // });
    }

    async function toggleCheckbox(event, key1, key2) {
        const checkbox = event.currentTarget.querySelector('input[type="checkbox"]');
        if (key1 == 'client' && key2 == 'can_folder_size' && !settings.client.can_folder_size) {
            let callback = { positive: async function() {
                if (checkbox) checkbox.checked = !checkbox.checked;
                settings[key1][key2] = !settings[key1][key2];
                await updSettings();
                return true;
            }, negative: function() {return true;}}
            dialogAlert('Warning', undefined, 'This function will significantly slow down the query time.', callback);
        } else {
            if (checkbox) checkbox.checked = !checkbox.checked;
            settings[key1][key2] = !settings[key1][key2];
            await updSettings();
        }
    }

    function removeFields(obj, fields) {
        const newObj = { ...obj };
        fields.forEach(field => delete newObj[field]);
        return newObj;
    }
    function updSettingsVisual() {
        usePassContainer.style.setProperty('display', !settings.server.use_pass ? 'none' : '');
        useHttpsContainer.style.setProperty('display', !settings.server.use_ssl ? 'none' : '');
        useHttpsContainer.style.setProperty('display', !settings.server.use_ssl ? 'none' : '');
        useInitialContainer.style.setProperty('display', !settings.server.use_initial ? 'none' : '');
        useInitialPath.style.setProperty('color', !useInitialPath.value.startsWith(pathInputVal.value) ? 'red' : '');
        useInitialPath.title = !useInitialPath.value.startsWith(pathInputVal.value) ? 'Initial file must be inside server dir' : '';
        // clearCache.style.setProperty('display', !settings.client.can_thumbnails ? 'none' : '');
    }

    async function updSettings(showNotif = true) {
        window.getSelection().removeAllRanges();
        updSettingsVisual();
        settings.server.password = usePassPassword.value;
        settings.server.login = usePassLogin.value;
        settings.server.session_time = usePassSession.value;
        settings.path = pathInputVal.value;
        settings.port = portInput.value;
        settings.server.use_initial_path = useInitialPath.value;
        
        let response = await fetch('/update_settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(removeFields(settings, ['serverRunning', 'host']))
        });
        if (!response.ok) {
            addNotification('Can\'t update settings.\nNetwork response was not ok');
            return;
        }
        let result = await response.text();
        if (result === 'true' || result === 'false') {
            if (showNotif) addNotification(result === 'true' ? `Settings updated.${settings.serverRunning ? '\nYou must restart the server' : ''}` :  'Settings not updated.', result === 'true' ? 'green' : 'red');
        } else {
            if (showNotif) addNotification('Can\'t stop server.\n' + result);
            console.error(result);
        }
    }
    return {
        DOMContentLoaded
    };
}
