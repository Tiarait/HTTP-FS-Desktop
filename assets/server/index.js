var url = '';
var isOnline = true;
var ws = null;
var wslogs = null;
let callbackOnline = {
    connected: function(path) {
        return true;
    }, 
    disconnected: function() {
        return true;
    }
}

const contentView = document.getElementById('content');
const logoView = document.getElementById('logo');
const menuView = document.getElementById('menu-left');

// window.addEventListener('resize', sizeWindow);
document.addEventListener('DOMContentLoaded', async function() {
    const notifications = document.querySelectorAll('.notification');
    notifications.forEach(notification => {
        notification.addEventListener('click', async () => {
            notificationClick(notification);
        });
    });

    logoView.addEventListener('click', async () => {
        if (getComputedStyle(menuView).position === 'absolute' && !menuView.classList.contains('horiz')) {
            menuView.style.setProperty('left', menuView.offsetLeft < 0 ? '0' : '-85px');
        }
        // .style.setProperty('display', !settings.server.use_ssl ? 'none' : '');
    });

    const tabs = document.querySelectorAll('.squeare-tab');
    tabs.forEach(tab => {
        // if (tab.id == 'tab-logs') {
        //     tab.classList.toggle('disable', !isRun);
        // }
        tab.addEventListener('click', async (event) => {
            event.preventDefault();
            const tabId = tab.id.replace('tab-', '')
            if (!tab.classList.contains('disable') && !tab.classList.contains('selected')) {
                if (wslogs != null) {
                    wslogs.close();
                    wslogs = null;
                }
                loadTab(tabId);
            }
        });
        // if (tab.classList.contains('disable') || tab.classList.contains('selected')) {
        //     tab.addEventListener('click', async (event) => {
        //         event.preventDefault();
        //     });
        // }
    });
    checkConnection();
    setTimeout(function() {
        createVersionInfo();
        contentView.classList.remove("hide");
    }, 150);

    window.onpopstate = function() {
        if (window.location.search.includes('?tab')) {
            const tabId = window.location.search || '?tab=main';
            loadTab(tabId.replace('?tab=', ''));
        } else {
            location.reload();
        }
    };
});

function createVersionInfo() {
    const versionInfo = document.createElement('div');
    versionInfo.innerHTML = `<div class="info wrap" style="margin-left: 4px; flex: none;">This is the <mark class="green">beta</mark> version of the application. Both moral and financial support are essential for its development. Any ideas and suggestions are welcome. ✉️ <a href="mailto:tiar.develop@gmail.com" target="_top">tiar.develop@gmail.com</a></div>`
    contentView.prepend(versionInfo)
}

function clearDynamicScripts() {
    const dynamicScripts = document.querySelectorAll('script[data-dynamic-script]');
    dynamicScripts.forEach(script => script.remove());
}

function loadTab(tabId) {
    clearDynamicScripts();
    const locationSearch = `?tab=${tabId}`
    fetch(`/tab${locationSearch}`)
        .then(response => {
            return response.text();
        })
        .then(data => {
            contentView.innerHTML = data;
            createVersionInfo();
            contentView.children[1].classList.add("hide");
            loadScript(container.getElementsByTagName('script')[0].src);
            
            if (window.location.search != locationSearch) {
                history.pushState(null, null, window.location);
                history.replaceState(history.state, '', window.location.origin + `/${locationSearch}`);
            }
            
            setTimeout(function() {
                contentView.children[1].classList.remove("hide");
                if (getComputedStyle(menuView).position === 'absolute' && !menuView.classList.contains('horiz')) {
                    menuView.style.setProperty('left', '-85px');
                }
            }, 250);
        })
        .catch(error => {
            addNotification(error);
            console.error('Error:', error);
        });
}

function loadScript(src) {
    var script = document.createElement('script');
    script.async = true;
    script.setAttribute('data-dynamic-script', 'true');
    script.onload = async function () {
        const tabFunctions = await tab();
        tabFunctions.DOMContentLoaded();
    };
    script.src = src;

    document.head.appendChild(script);
}

function selectPath(p, showFiles, callback) {
    fetch(`/selectFolder?files=${showFiles}&path='${p}'`)
        .then(response => {
            if (response && response.headers && response.headers.get('content-type') && response.headers.get('content-type').includes('application/json')) {
                return response.json();
            } else {
                return response.text();
            }
        })
        .then(data => {
            if (typeof data === 'object') {
                selectPathDialog(p == '' ? data.path : p, data, showFiles, callback);
            } else {
                console.error('Error:', data);
                addNotification(data);
            }
        })
        .catch(error => {
            addNotification(error);
            console.error('Error:', error);
        });
}

function selectPathDialog(p, data, showFiles, callback) {
    const pathVal = p.replaceAll('\\', '/').replaceAll('//', '/');
    const parts = pathVal.split('/');
    const existingDialog = document.getElementById('dialog-folders');
    if (existingDialog) {
        existingDialog.remove();
    }
    const dialogFolders = document.createElement('div');
    dialogFolders.id = 'dialog-folders';
    dialogFolders.classList.add("dialog-alert");
    dialogFolders.classList.add("center");
    dialogFolders.classList.add("noselect");
    const dialogFolderHeader = document.createElement('div');
    dialogFolderHeader.classList.add("header");
    dialogFolderHeader.classList.add("flex");
    var bg = document.getElementById('blured');
    if (!bg) {
        bg = document.createElement('div');
        bg.id = 'blured';
        bg.classList.add("blured");
        document.body.appendChild(bg);
    }

    const iFolder = document.createElement('i');
    iFolder.classList.add("icon");
    iFolder.classList.add("i-folder");
    dialogFolderHeader.prepend(iFolder);
    const dialogContainer = document.createElement('div');
    dialogContainer.classList.add("title-container");
    const dialogTitle = document.createElement('div');
    dialogTitle.classList.add("title");
    const dialogSubTitle = document.createElement('div');
    dialogSubTitle.classList.add("link");
    dialogTitle.textContent = parts[parts.length - 1].replace('%25', '%');
    dialogTitle.setAttribute('title', parts[parts.length - 1]);
    dialogSubTitle.textContent = pathVal.replace('%25', '%');
    dialogSubTitle.setAttribute('title', pathVal);
    dialogContainer.appendChild(dialogTitle);
    dialogContainer.appendChild(dialogSubTitle);
    dialogFolderHeader.appendChild(dialogContainer);

    dialogFolders.appendChild(dialogFolderHeader);
    const dialogFolderItems = document.createElement('div');
    dialogFolderItems.classList.add("items");
    dialogFolders.appendChild(dialogFolderItems);
    if (parts.length > 2 || (pathVal.split(':/')[1] != undefined && pathVal.split(':/')[1].length > 0)) {
        let backP = parts.length > 2 ? pathVal.substring(0, pathVal.lastIndexOf('/')) : (pathVal.split(':/')[0] + ':/');
        const backLink = document.createElement('div');
        const backLinkP = document.createElement('p');
        backLink.appendChild(backLinkP);
        backLinkP.textContent = '[....] ';// + p.split(backP + '/')[1]
        backLink.classList.add("back");
        backLink.addEventListener('click', function(event) {
            event.preventDefault();
            selectPath(backP, showFiles, callback);
        });
        dialogFolderItems.appendChild(backLink);
    }
    data.folders.forEach(folder => {
        const folderLink = document.createElement('div');
        const folderLinkP = document.createElement('p');
        folderLink.appendChild(folderLinkP);
        folderLinkP.textContent = folder.name;
        folderLink.classList.add("flex");
        folderLink.addEventListener('click', function(event) {
            event.preventDefault();
            selectPath(`${pathVal}/${folder.name.replace('%', '%25')}`, showFiles, callback);
        });
        const iFolder = document.createElement('i');
        iFolder.classList.add("icon");
        iFolder.classList.add("i-folder");
        if (folder.empty) {
            iFolder.classList.add("disable");
        }
        if (folder.error) {
            iFolder.classList.add("error");
        }
        folderLink.prepend(iFolder);
        dialogFolderItems.appendChild(folderLink);
    });
    if (showFiles) {
        data.files.forEach(file => {
            const fileLink = document.createElement('div');
            const fileLinkP = document.createElement('p');
            fileLink.appendChild(fileLinkP);
            fileLinkP.textContent = file.name;
            fileLink.classList.add("flex");
            fileLink.addEventListener('click', function(event) {
                event.preventDefault();
                dialogFolders.remove();
                bg.remove();
                callback.positive(`${pathVal}/${file.name.replace('%', '%25')}`);
            });
            const iFile = document.createElement('i');
            iFile.classList.add("i-file");
            fileLink.prepend(iFile);
            dialogFolderItems.appendChild(fileLink);
        });
    }
    const dialogBtns = document.createElement('div');
    dialogBtns.classList.add("btns");
    let dialogBtnOk = null;
    if (!showFiles) {
        dialogBtnOk = document.createElement('button');
        dialogBtnOk.textContent = 'Ok';
        dialogBtnOk.addEventListener('click', function(event) {
            event.preventDefault();
            dialogFolders.remove();
            bg.remove();
            callback.positive(pathVal);
        });
    }
    const dialogBtnCancel = document.createElement('button');
    dialogBtnCancel.textContent = 'Cancel';
    dialogBtnCancel.addEventListener('click', function(event) {
        event.preventDefault();
        dialogFolders.remove();
        bg.remove();
    });
    dialogBtns.appendChild(dialogBtnCancel);
    if (!showFiles) dialogBtns.appendChild(dialogBtnOk);
    dialogFolders.appendChild(dialogBtns);

    bg.addEventListener('click', function(event) {
        dialogFolders.remove();
        bg.remove();
    });
    document.body.appendChild(dialogFolders);
}

function dialogAlert(title, subtitle, message, callback) {
    const existingDialog = document.getElementById('dialog-alert');
    if (existingDialog) {
        existingDialog.remove();
    }
    const dialog = document.createElement('div');
    dialog.id = 'dialog-alert';
    dialog.classList.add("dialog-alert");
    dialog.classList.add("center");
    dialog.classList.add("noselect");
    const dialogHeader = document.createElement('div');
    dialogHeader.classList.add("header");
    dialogHeader.classList.add("flex");
    var bg = document.getElementById('blured');
    if (!bg) {
        bg = document.createElement('div');
        bg.id = 'blured';
        bg.classList.add("blured");
        document.body.appendChild(bg);
    }

    const icon = document.createElement('i');
    icon.classList.add("icon");
    icon.classList.add("i-logo");
    dialogHeader.prepend(icon);

    const dialogContainer = document.createElement('div');
    dialogContainer.classList.add("title-container");
    const dialogTitle = document.createElement('div');
    dialogTitle.classList.add("title");
    dialogTitle.textContent = title;
    dialogTitle.setAttribute('title', title);
    if (subtitle) {
        const dialogSubTitle = document.createElement('div');
        dialogSubTitle.classList.add("link");
        dialogSubTitle.textContent = subtitle;
        dialogSubTitle.setAttribute('title', subtitle);
    }
    dialogContainer.appendChild(dialogTitle);
    if (subtitle) dialogContainer.appendChild(dialogSubTitle);
    dialogHeader.appendChild(dialogContainer);
    dialog.appendChild(dialogHeader);

    const dialogMessage = document.createElement('div');
    dialogMessage.classList.add("message");
    dialogMessage.textContent = message;
    dialogMessage.setAttribute('title', message);
    const dialogMContainer = document.createElement('div');
    dialogMContainer.classList.add("message-container");
    dialogMContainer.appendChild(dialogMessage);
    dialog.appendChild(dialogMContainer);

    const dialogBtns = document.createElement('div');
    dialogBtns.classList.add("btns");
    let dialogBtnOk = document.createElement('button');
    dialogBtnOk.textContent = 'Ok';
    dialogBtnOk.addEventListener('click', function(event) {
        event.preventDefault();
        dialog.remove();
        bg.remove();
        callback.positive();
    });
    const dialogBtnCancel = document.createElement('button');
    dialogBtnCancel.textContent = 'Cancel';
    dialogBtnCancel.addEventListener('click', function(event) {
        event.preventDefault();
        dialog.remove();
        bg.remove();
        callback.negative();
    });
    dialogBtns.appendChild(dialogBtnCancel);
    dialogBtns.appendChild(dialogBtnOk);
    dialog.appendChild(dialogBtns);

    bg.addEventListener('click', function(event) {
        dialog.remove();
        bg.remove();
    });
    document.body.appendChild(dialog);
}

var prevNotif = '';
function addNotification(text, color = 'red', isHidden = true) {
    const colorCode = color == 'red' ? '#9c4545' : color;
    const notification = document.createElement('div');
    notification.classList.add('notification');
    notification.style.backgroundColor = colorCode;
    const formattedText = `<div>${text.toString().replace(/\n/g, '<br>')}</div><p>${getCurrentTime()}</p>`;
    notification.innerHTML = formattedText;
    notification.addEventListener('click', () => {
        notificationClick(notification);
    });
    const notifications = document.getElementById('notifications');
    if (prevNotif == text) {
        const lastNotif = notifications.querySelector('.notification:last-child');
        if (lastNotif) lastNotif.remove();
    }
    notifications.appendChild(notification);
    prevNotif = text;
    if (isHidden) setTimeout(function() {
        notificationClick(notification);
    }, 4000);
}

function getCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    
    return `${hours}:${minutes}:${seconds}:${milliseconds}`;
}

function notificationClick(notification) {
    notification.classList.add('fade-out');
    // notification.addEventListener('transitionend', function() {
    //     notification.remove();
    // });
    setTimeout(() => notification.remove(), 500);
}


var reconnectCount = 0;
var reconnected = false;
function checkConnection() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    ws = new WebSocket(`${protocol}//${host}/status`);
    ws.onopen = () => {
        isOnline = true;
        callbackOnline.connected();
        contentView.classList.toggle('noclick', !isOnline);
        contentView.classList.toggle('disable', !isOnline);
        if (reconnectCount > 0) {
            reconnected = true;
            addNotification('Reconnected', 'green');
        }
        reconnectCount = 0;
    };
    ws.onmessage = async (event) => {
        try {
            const data = JSON.parse(event.data);
            if (window.location.search === '?tab=main') {
                const tabFunctions = await tab();
                tabFunctions.isServerRunnedCheck(data, false);
            }
        } catch (error) {
            addNotification(event.data);
        }
        reconnected = false;
    };

    ws.onclose = () => {
        isOnline = false;
        callbackOnline.disconnected();
        contentView.classList.toggle('noclick', !isOnline);
        contentView.classList.toggle('disable', !isOnline);
        reconnectCount++;
        addNotification('No connection to the program\nTry reconnect');
        setTimeout(() => {
            checkConnection();
        }, 2000);
    };
    // ws.onerror = (error) => {
    //     console.error('wtf', error);
    // };
}

function isTextSelected(element) {
    const selection = window.getSelection();
    if (selection.rangeCount === 0 || selection.anchorNode == null || selection.anchorNode.nodeType === Node.TEXT_NODE) {
        return false;
    }
    return true;
}

function toggleTextSelection(element) {
    const selection = window.getSelection();
    if (isTextSelected(element)) {
        selection.removeAllRanges();
    } else {
        const range = document.createRange();
        range.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

