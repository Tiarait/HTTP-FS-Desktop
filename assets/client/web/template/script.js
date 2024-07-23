var isResizing = false, isDrag = false;
var ajaxCall = null;
var ajaxCallApi = null;
var ajaxTreeCall = null;
var leftSize = localStorage.getItem("treeSize") || 255;
var animDelay = 150;
var items = [];
var dataTree;
var tree;
var selectedItems = [];
var shiftPressed = false;
var ctrlPressed = false;

var order = localStorage.getItem('sortBy') || 'name';
var orderAz = localStorage.getItem('sortAz') || 'az';
var isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);


var statusOnline = 0;

$(document).ready(function() {
    isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    checkStatus();

    let treeView = $('#tree-view');
    let reszView = $('.resizer.resizer_vx');
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        $('body').on(eventName, function(e) {
            if (!hasDialog() && event.dataTransfer.types.includes('Files')) {
                createDialogUpload();
            }
        });
    });
    $('#coffee-btn').on('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        if (!hasDialog()) {
            createDialogIframe('https://www.buymeacoffee.com/widget/page/TiarApps', $('#coffee-btn'));
        } else {
            removeDialog();
        }
    });
    $('#btn-login').on('click', function(e) {
        login();
    });
    $('#dialog-login input.dialogEditable').on('keydown', function(e) {
        if (e.keyCode === 13) {
            e.preventDefault();
            login();
        }
    });
    $('#toggle-btns').on('click', function(e) {
        if (!hasDialog()) {
            e.stopPropagation();
            e.preventDefault();
            hideContextMenu();
            let bar = $('.navbar-items');
            if (bar.css('height') == '0px') {
                bar.css('padding-top', '5px');
                bar.css('padding-bottom', '9px');
                bar.css('border-bottom', '2px solid var(--color-border)');

                let autoHeight = bar.css('height', 'auto').height();
                bar.css('height', '0px');
                setTimeout(function() {
                    bar.css('height', autoHeight);
                }, 50);

            } else {
                bar.css('padding-top', '');
                bar.css('padding-bottom', '0px');
                bar.css('height', '0px');
                bar.css('border-bottom', '');
                setTimeout(function() {
                    bar.css('height', '0px');
                }, 50);
            }
        }
    });
    $('#btn-left-menu').on('click', function() {
        showTree = showTree == 1 ? 0 : 1;
        treeView.css('transition', `${animDelay}ms linear`);
        reszView.css('transition', `${animDelay}ms linear`);
        localStorage.setItem("treeShow", showTree);
        $('.files_breadcrumbs, .layout_center').css('border-top-left-radius', showTree == 1 ? '6px' : '0px');
        if (showTree == 1) {
            treeView.css('width', leftSize+'px');
            reszView.css('width', `10px`);
        } else {
            treeView.css('width', `0`);
            reszView.css('width', `0`);
        }
        setTimeout(function() {
            treeView.css('transition', `none`);
            reszView.css('transition', `none`);
        }, animDelay + 50);
    });
    $('#toggle').on('click', function() {
        var currentTr = parseInt(treeView.css('transform').split(',')[4]);
        treeView.css('top', `${$('.navbar-header').outerHeight()}px`);
        treeView.css('height', `${$('body').outerHeight()-$('.navbar-header').outerHeight()}px`);

        currentTr = (currentTr < 0) ? 0 : -100;
        treeView.css('width', '80%');
        treeView.css('transition', `${animDelay}ms linear`);
        treeView.css('transform', `translateX(${currentTr}%)`);
        $('.view.layout_line.layout_left').css('transform', `translateX(${currentTr}%)`);
        $('.navbar-items .el_box').toggleClass('no-click');
        $('.container_center').toggleClass('no-click');
        $('.navbar-items').css('filter', (currentTr < 0) ? 'blur(0px)' : 'blur(5px)');
        $('.container_center').css('filter', (currentTr < 0) ? 'blur(0px)' : 'blur(5px)');
        if (currentTr < 0) {
            $('.layout_center').off('click');
            $('.navbar-items').off('click');
        } else {
            $('.navbar-items').on('click', function() {
                $('#toggle').click();
            });
            $('.layout_center').on('click', function() {
                $('#toggle').click();
            });
        }
    });
    $('#btn-theme').on('click', function() {
        theme = (theme === "dark") ? "light" : "dark";
        localStorage.setItem("theme", theme);
        document.documentElement.setAttribute("data-theme", theme);
    });
    $('input#uploadFilesElem').change(function(e) {
        sendFiles(this.files, $('#btn-upload').attr('action'));
        this.value = null;
    });
    $('input#uploadFolderElem').change(function(e) {
        sendFiles(this.files, $('#btn-upload').attr('action'));
        this.value = null;
    });
    $('#btn-upload').on('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        var isFolderUploadSupported = 'webkitdirectory' in document.createElement('input');
        if (isFolderUploadSupported && !isMobileDevice) {
            var options = [
                { id: 0, name: str_folder, icon: svgUpload, enable: var_can_write },
                { id: 1, name: str_files, icon: svgUpload, enable: var_can_write }
            ];
            showContextMenu(options, function(selectedOption) {
                if (!selectedOption.enable) {
                    dialogAlertError(str_error_permission);
                } else {
                    switch (selectedOption.id) {
                        case 1:
                            $('input#uploadFilesElem').click();
                            break;
                        default:
                            $('input#uploadFolderElem').click();
                            break;
                    }
                }
            }, $('#btn-upload'));
        } else {
            $('input#uploadFilesElem').click();
        }
    });
    $('#btn-upload').on('contextmenu', function(e) {
        e.stopPropagation();
        e.preventDefault();
        var options = [
            { id: 0, name: str_folder, icon: svgUpload, enable: var_can_write },
            { id: 1, name: str_files, icon: svgUpload, enable: var_can_write }
        ];
        showContextMenu(options, function(selectedOption) {
            if (!selectedOption.enable) {
                dialogAlertError(str_error_permission);
            } else {
                switch (selectedOption.id) {
                    case 1:
                        $('input#uploadFilesElem').click();
                        break;
                    default:
                        $('input#uploadFolderElem').click();
                        break;
                }
            }
        });
    });
    $('#btn-sort').on('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        var options = [
            { id: 0, name: str_sorting_name, icon: undefined, enable: true, selected: order == 'name' },
            { id: 1, name: str_sorting_type, icon: undefined, enable: true, selected: order == 'type' },
            { id: 2, name: str_sorting_size, icon: undefined, enable: true, selected: order == 'size' },
            { id: 3, name: str_sorting_date, icon: undefined, enable: true, selected: order == 'date' },
            undefined,
            { id: 4, name: 'a-Z', enable: true, selected: orderAz == 'az' },
            { id: 5, name: 'z-A', enable: true, selected: orderAz == 'za' }
        ];
        showContextMenu(options, function(selectedOption) {
            switch (selectedOption.id) {
                case 0:
                    order = 'name';
                    break;
                case 1:
                    order = 'type';
                    break;
                case 2:
                    order = 'size';
                    break;
                case 3:
                    order = 'date';
                    break;
                case 4:
                    orderAz = 'az';
                    break;
                case 5:
                    orderAz = 'za';
                    break;
                default:
                    break;
            }

            localStorage.setItem("sortBy", order)
            localStorage.setItem("sortAz", orderAz)
            renderFiles(parseApiResponse());
            if (dataTree != undefined) renderTreeView(dataTree);
        }, $('#btn-sort'));
    });
    $('#btn-add').on('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        var options = [
            { id: 0, name: str_folder, icon: svgPlus, enable: var_can_write },
            { id: 1, name: str_file, icon: svgPlus, enable: var_can_write }
        ];
        showContextMenu(options, function(selectedOption) {
            let title = str_folder;
            if (selectedOption.id == 1) {
                title = str_file;
            }
            if (selectedOption.enable) {
                let callback = {positive: function(result) {return true;}, negative: function() {return true;}}
                callback.positive = function(result) {
                    result = result.replace('/', '')
                    if (result != '') {
                        showLoaderFiles();
                        let p = $('#btn-upload').attr('action');
                        let n = (selectedOption.id == 0 ? (result + '/') : result);
                        ajaxCall = $.ajax({
                            url: '/api/files/create',
                            contentType: "application/json",
                            type: 'POST',
                            data: JSON.stringify({ name: n, path: p }),
                            success: function(data) {
                                hideLoaderFiles();
                                try {
                                    items.push(data);
                                    dataApi.list = items;
                                    var sortBy = localStorage.getItem('sortBy');
                                    var sortAz = localStorage.getItem('sortAz');
                                    dataApi.list.sort(function(a, b) {
                                        if (a.directory === b.directory) {
                                            if (sortBy === 'date') {
                                                return sortByDate(a, b);
                                            } else if (sortBy === 'size') {
                                                return sortBySize(a, b);
                                            } else if (sortBy === 'type') {
                                                return sortByType(a, b);
                                            } else {
                                                return sortByName(sortAz, a, b);
                                            }
                                        } else {
                                            return a.directory ? -1 : 1;
                                        }
                                    });
                                    reRenderItems();
                                    if (dataTree != undefined) {
                                        if (data.directory) {
                                            createTreeItemByFile(data);
                                            renderTreeView(dataTree);
                                        }
                                    }
                                } catch (error) {
                                    console.error(error);
                                    loadDataApi(p, $('#btn-add'))
                                }
                                if (statusOnline == -1) checkStatus();
                            },
                            error: function(xhr, status, error) {
                                ajaxErrorMsg(xhr, status, error, $('#btn-add'));
                            }
                        });
                        ajaxCall.fail(function(jqXHR, textStatus, errorThrown) {
                            if (jqXHR.status === 401) {
                                dialogServLogin();
                            }
                        });
                    } else {
                        dialogAlertEdit(title, '', str_add_new, `<div class="svg">${svgPlus}</div>`, callback, $('#btn-add'));
                    }
                    return true;
                }
                dialogAlertEdit(title, '', str_add_new, `<div class="svg">${svgPlus}</div>`, callback, $('#btn-add'));
            } else {
                dialogAlertError(str_error_permission, $('#btn-add'));
            }
        }, $('#btn-add'));
    });
    $('#btn-view').on('click', function() {
        $('#btn-view-i').attr("class","icon-2x bi bi-view-list");
        let view = localStorage.getItem('showAs') == 'list' ? 'grid' : 'list';
        localStorage.setItem('showAs', view);
        renderFiles(parseApiResponse());
    });
    $('#btn-refresh').on('click', function() {
        loadDataApi($('#btn-upload').attr('action'), $('#btn-refresh'));
    });
    $('#btn-select').on('click', function() {
        if (selectedItems.length != items.length) {
            selectedItems = [];
            selectedItems.push(...items.filter(item => item.inside != '-1'));
        } else {
            selectedItems = [];
        }
        updSelectedView();
    });
    $('*[data-toggle="tooltip"]').hover(
        function () {
            showTooltip($(this));
        },
        function () {
            hideTooltip();
        }
    );
    var lastScrollTop = 0;
    var scrollToBottom = false;
    var timerScroll = new Timer(function() {
        let contentFD = $('#contentFD');
        let contentFilesDivs = $('#contentFiles .dataview_item');
        let ind = 0;
        let startIndex = scrollToBottom ? 0 : contentFilesDivs.length - 1;
        let endIndex = scrollToBottom ? contentFilesDivs.length : -1;
        let increment = scrollToBottom ? 1 : -1;
        for (let i = startIndex, ind = 0; i !== endIndex; i += increment) {
            let div = $(contentFilesDivs[i])
            let img = div.find('.fmanager_icon img');
            if (img.length > 0) {
                if (viewIsVisible(contentFD.parent(), $(contentFilesDivs[i]))) {
                    if (img.hasClass('loaded')) {
                        if (img.hasClass('hide')) {
                            img.stop(true, true).delay(100 * (ind + 1)).css('display', '');
                        }
                        ind++;
                    }
                    img.toggleClass('hide', false);
                } else {
                    img.toggleClass('hide', true).stop(true, true).css('display', 'none');
                }
            }
        }
    }, 50);
    $('#contentFD').on('scroll', function (e) {
        hideContextMenu();
        let st = $(this).scrollTop();
        scrollToBottom = st > lastScrollTop;
//        if (!use_thumb) {
//            timerScroll.start();
//        }
        lastScrollTop = st;
    });

    reszView.on('mousedown', function (e) {
        isResizing = true;
    });
    $(document).on('mousemove', function (e) {
        if (!isResizing || e.clientX < 100 || e.clientX > $('body').outerWidth()/2)
            return;
        treeView.css("width", e.clientX);
        leftSize = e.clientX;
        localStorage.setItem("treeSize", leftSize);
    }).on('mouseup', function (e) {
        $('body').find('.tooltip').remove();
        isResizing = false;
    });
    $(document).on('click', function (e) {
        hideContextMenu();
        if (hasDialog() && isPointInsideElement(e.pageX, e.pageY, $('#dialogBtnCancel'))) {
            removeDialog();
        }
    });
    $(document).on('contextmenu', function (e) {
        hideContextMenu();
    });

    $(document).on('keyup', function(event) {
        if (event.code === 'ShiftLeft' || event.code === 'ShiftRight' || event.code === 'Shift') {
            shiftPressed = false;
        }
        if (event.code === 'ControlLeft' || event.code === 'ControlRight' || event.code === 'Control') {
            ctrlPressed = false;
        }
    });
    $(document).on('keydown', function(event) {
        if (hasDialogAlertOnly()) return;
        if (event.code === 'ShiftLeft' || event.code === 'ShiftRight' || event.code === 'Shift') {
            shiftPressed = true;
        }
        if (event.code === 'ControlLeft' || event.code === 'ControlRight' || event.code === 'Control') {
            ctrlPressed = true;
        }
        // console.log(event.code + ' ' + ctrlPressed);
        if (event.code === 'KeyA' && ctrlPressed) {
            if (selectedItems.length != items.length) {
                selectedItems = [];
                selectedItems.push(...items.filter(item => item.inside != '-1'));
            } else {
                selectedItems = [];
            }
            updSelectedView();
        }
        if ((event.code === 'Backspace' || event.code === 'Delete' ) && selectedItems.length != 0) {
            filesSelectedDelete();
        }

        if (hasDialog()) {
            // event.stopPropagation();
            // event.preventDefault();
            if (event.code === 'ArrowLeft') {
                dialogPrevItem();
            } else if (event.code === 'ArrowRight' ) {
                dialogNextItem();
            } else if (event.code === 'ArrowUp') {
                event.preventDefault();
                isDialogFull = true;
                toggleDialogFull(isDialogFull, $('#dialog-content'));
            } else if (event.code === 'ArrowDown' ) {
                event.preventDefault();
                isDialogFull = false;
                toggleDialogFull(isDialogFull, $('#dialog-content'));
            }
        }

        if (event.code === 'Escape') {
            if (hasDialog) {
                if (isDialogFull) {
                    isDialogFull = false;
                    toggleDialogFull(isDialogFull, $('#dialog-content'));
                } else {
                    removeDialog()
                }
            }
        }
    });

    $(window).on('beforeunload', function (e) {
        if (hasDialogAlerts() && statusOnline != -1 && $('body').find('#dialog-login').length <= 0) {
            var confirmationMessage = 'Exit?';
            (e || window.event).returnValue = confirmationMessage;
            return confirmationMessage;
        }
    });

    $(window).on('popstate', function (e) {
        loadDataApi(window.location.href);
    });

    updConfigStr();
    if (dataApi == null || dataApi == undefined) {
        renderBreadcrumbsUrl(window.location.href);
        loadDataApi(window.location.href);
    } else {
        renderFiles(parseApiResponse());
    }

    if (str_first_alert != undefined && str_first_alert != '' && str_first_alert != null) {
        if (localStorage.getItem('welcome_msg_length') != str_first_alert.length) {
            let callback = {positive: function() {return true;}, negative: function() {
                localStorage.setItem('welcome_msg_length', str_first_alert.length);
                return true;
            }}
            dialogAlertCustom(str_first_alert, callback);
        }
    }
});

function login() {
    let dialog = $('#dialog-login');
    let button = dialog.find('#btn-login');
    let editPass = dialog.find('input.dialogEditable.pass');
    button.off('click');
    $.ajax({
        type: 'POST',
        url: "/login",
        contentType: 'application/x-www-form-urlencoded',
        headers: {'Upgrade-Insecure-Requests': '1'},
        data: {
            username: $('input.dialogEditable.login').val(),
            password: $('input.dialogEditable.pass').val()
        },
        error: function(xhr, status, error) {
            hideLoaderFiles();
            button.off('click').on('click', function(e) {
                login();
            });
            editPass.off('keydown').on('keydown', function(e) {
                if (e.keyCode === 13) {
                    e.preventDefault();
                    login();
                }
            });
            if (error == 'Unauthorized' || error == '') {
                dialog.css('transition', `${animDelay}ms linear`);
                dialog.css('background', 'red');
                dialog.css('animation', 'horizontal-translate-shaking 0.35s infinite');
                setTimeout(function() {
                    dialog.css('background', '');
                    dialog.css('animation', '');
                }, 500);
                setTimeout(function() {
                    $('#dialog-login').css('transition', '');
                }, 550 + animDelay);
            } else if (!xhr.responseText.startsWith('<!DOCTYPE html>')) {
                console.error('error - [' + xhr.responseText + '] status - ['+ status +'] error - ['+ error +'] serv - ['+ statusOnline +']');
                if (statusOnline == -1) {
                    dialogServIsOff();
                } else if (status != 'abort' && error != 'Unauthorized') {
                    hideLoaderFiles();
                    let e = xhr.responseText;
                    try { e = JSON.parse(e).error } catch (error) {
                        console.error(error);
                    }
                    dialogAlertError(e + ' ['+ error +']', button);
                }
            }
        },
        success: function(data) {
            dialog.parent().remove();
            dialog.remove();
            if (window.location.pathname.startsWith('/login')) {
                window.location = "/";
            } else if (window.location.pathname.endsWith('/') && window.location.pathname.startsWith('/files'))  {
                loadDataApi(window.location.href);
            } else {
                window.location = window.location.pathname;
            }
            checkStatus();
        }
    });
}

function viewIsVisible(container, child) {
    var containerTop = container.offset().top;
    var containerBottom = containerTop + container.height();
    var childTop = child.offset().top;
    var childBottom = childTop + child.height();
    return (childTop >= containerTop && childTop <= containerBottom) || (childBottom >= containerTop && childBottom <= containerBottom);
}

function isPointInsideElement(x, y, $element) {
    if (!$element.length) return false;
    let offset = $element.offset();
    return x >= offset.left && x <= (offset.left + $element.outerWidth()) &&
           y >= offset.top && y <= (offset.top + $element.outerHeight());
}

function showTooltip(element) {
    let text = element.attr("data-original-title");
    let w = element.outerWidth();
    let h = element.outerHeight() + 10;
    let top = element.offset().top + h;
    if (top + h > $('body').outerHeight()) {
        top = top - h - element.outerHeight();
    }
    let left = element.offset().left;

    let tooltip = $('<div class="tooltip" style="top:'+top+'px; left:'+left+'px; opacity:0;">'+text+'</div>');
    $('body').append(tooltip);
    let tw = tooltip.outerWidth();
    let th = tooltip.outerHeight();
    if (w < tw) {
        left = left-(tw-w)/2;
        if ((left+tw) > $('.files_main_layout').outerWidth()) {
            left = $('.files_main_layout').outerWidth() - tw - 5;
        } else if (left < 0) {
            left = 5;
        }
        tooltip.attr('style', 'top:'+top+'px; left:'+left+'px; opacity:0;');
    }
    tooltip.fadeTo(500, 1);
}
function hideTooltip() {
    $('body').find('.tooltip').remove();
}


function showContextMenu(options, clickListener, parentView = undefined) {
    hideContextMenu();
    let x = event.pageX;
    let y = event.pageY;
    if (parentView != undefined) {
        x = parentView.offset().left;
        y = parentView.offset().top + parentView.outerHeight() + 5;
    }
    let contextView = $(`<div id="context-menu" class="noselect" style="top:${y}px; left:${x}px; opacity:1;"></div>`);
    if (parentView != undefined) {
        contextView.css('min-width', parentView.outerWidth())
    }

    var ul = $('<ul></ul>');
    options.forEach(function(option) {
        let li = $(`<li class="undefined"></li>`);
        if (option != undefined) {
            let c = option.enable ? 'opacity-enabled' : 'opacity-disable';
            let ch = option.selected == undefined ? '' : `<input id="select-menu-${option.id}"  type="checkbox" class="checkbox" ${option.selected ? 'checked' : ''}>`
            let icon = option.selected == undefined && option.icon != undefined ? option.icon : '';
            li = $(`<li class="${c}">${icon}${ch}<span>${option.name}</span></li>`);
            li.on('click', function (e) {
                clickListener(option);
                hideContextMenu();
            });
        }
        ul.append(li);
    });
    contextView.append(ul);
    $('body').append(contextView);
    let cw = contextView.outerWidth();
    let ch = contextView.outerHeight();
    let bw = $('.files_main_layout').outerWidth();
    let bh = $('body').outerHeight();
    if (bw < x + cw) {
        x = bw - cw - 10;
    }
    if (bh < y + ch) {
        y = bh - ch - 10;
    }
    contextView.css('top', `${y}px`);
    contextView.css('left', `${x}px`);
    contextView.css('opacity', `1`);
}
function hideContextMenu() {
    $('body').find('#context-menu').remove();
}

function loadDataApi(path, view = undefined) {
    clearSelected();
    removeDialog();
    showLoaderFiles();
    let pathname = path;
    if (path.indexOf("://") !== -1) {
        try {
            var url = new URL(path);
            path = url.pathname;
            pathname = path;
            if (url.search) {
                path += '?' + url.search;
            }
        } catch (error) {
            console.error(error);
        }
    }
    $('#btn-left-rss').css("display", rss_enabled ? 'flex' : 'none');
    $('#btn-left-rss').attr("href", pathname.replace(/files/g, 'rss'));

    if (window.location.pathname != pathname) {
        history.pushState(null, null, window.location);
        history.replaceState(history.state, '', window.location.origin + pathname);
    }
    if (ajaxCallApi != null && ajaxCallApi != undefined) {
        ajaxCallApi.abort();
        ajaxCallApi = null;
    }
    ajaxCallApi = $.ajax({
        url: '/api/files/list?path=\'' + encodeURIComponent(path) + '\'',
        type: 'GET',
        contentType: 'text/html',
        processData: false,
        success: function(data) {
            hideLoaderFiles();
            try {
                dataApi = data;
                renderFiles(parseApiResponse());
            } catch (error) {
                console.error(error);
//                dialogAlertError(error, view);
            }
            if (statusOnline == -1) checkStatus();
        },
        error: function(xhr, status, error) {
            ajaxErrorMsg(xhr, status, error, undefined);
        }
    });
    ajaxCallApi.fail(function(jqXHR, textStatus, errorThrown) {
        if (jqXHR.status === 401) {
            dialogServLogin();
        }
    });
    loadDataApiTree(path);
}

function showLoaderFiles() {
    let loaderView = $('#loader-horizontal');
    if (loaderView.length == 0) {
        $('#contentFD').css('opacity', '0.5');
        loaderView = $('<div id="loader-horizontal"></div>');
        loaderView.css('top', ($('.files_breadcrumbs').outerHeight() + 1) + 'px')
        $('.view.layout_line.container_center').append(loaderView);
    }
}
function hideLoaderFiles() {
    let loaderView = $('#loader-horizontal');
    if (loaderView.length != 0) {
        $('#contentFD').css('opacity', '1');
        loaderView.remove();
    }
}

function parseApiResponse() {
    var sortBy = localStorage.getItem('sortBy');
    var sortAz = localStorage.getItem('sortAz');
    try {
        dataApi.list.sort(function(a, b) {
            if (a.directory === b.directory) {
                if (sortBy === 'date') {
                    return sortByDate(a, b);
                } else if (sortBy === 'size') {
                    return sortBySize(a, b);
                } else if (sortBy === 'type') {
                    return sortByType(a, b);
                } else {
                    return sortByName(sortAz, a, b);
                }
            } else {
                return a.directory ? -1 : 1;
            }
        });
        return dataApi;
    } catch (error) {
        console.error("Error parsing API response:", error);
        return null;
    }
}

function sortByName(sortAz, a, b) {
    let nameA = a.name;
    try {
      nameA = decodeURI(nameA);
    } catch (e) {}
    let nameB = b.name;
    try {
      nameB = decodeURI(nameB);
    } catch (e) {}
    return sortAz === 'az' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
}

function sortBySize(a, b) {
    var sortAz = localStorage.getItem('sortAz');
    const sizeDiff = parseInt(a.size) - parseInt(b.size);
    if (sizeDiff === 0) {
        return sortByName('az', a, b);
    } else {
        return sortAz === 'za' ? -sizeDiff : sizeDiff;
    }
}

function sortByType(a, b) {
    var endsA = a.name.indexOf('.') > 0 ? a.name.split('.').pop().toUpperCase() : "";
    var endsB = b.name.indexOf('.') > 0 ? b.name.split('.').pop().toUpperCase() : "";
    var sortAz = localStorage.getItem('sortAz');
    const diff = sortAz === 'az' ? endsA.localeCompare(endsB) : endsB.localeCompare(endsA);
    if (diff === 0) {
        return sortByName('az', a, b);
    } else {
        return diff;
    }
}

function sortByDate(a, b) {
    var sortAz = localStorage.getItem('sortAz');
    const dateDiff = parseInt(a.date) - parseInt(b.date);
    if (dateDiff === 0) {
        return sortByName('az', a, b);
    } else {
        return sortAz === 'za' ? -dateDiff : dateDiff;
    }
}

function renderFiles(jsonData) {
    let trimmedUrl = jsonData.current.url
    if (trimmedUrl.startsWith('http')) {
        trimmedUrl = '/' + jsonData.current.url.split('/').slice(3).join('/');
    }
    $('#contentFiles').empty();
    $('#contentFiles').attr("path", jsonData.current.url);
    $('#btn-upload').attr("action", trimmedUrl);

    $('#contentFD').scrollTop(0);

    items = jsonData.list;
    renderItems();
    let name = jsonData.current.name.replace('%25', '%');
    try {
      name = decodeURI(name);
    } catch (e) {}
    $('title').prop('text', name.toUpperCase() + ' | ' + str_app_name);
    renderBreadcrumbsUrl(jsonData.current.url)


    $('#loader').attr("style","display:none");
    $('#loader-horizontal').attr("style","display:none");
    if (dataTree != undefined) renderTreeView(dataTree);
}

function renderTree(parts) {
    treeApi = localStorage.getItem('tree_json');

    if (treeApi == undefined || treeApi == '') {
        let result = { path: `/${parts[0]}`, enabled: true, list: [] };
        let current = result;

        let lastUrl = parts[0];
        for (let i = 1; i < parts.length; i++) {
            let path = `/${parts[i]}`;
            let item = { path, enabled: true, list: [] };
            current.list.push(item);
            current = item;
        }

        for (let i = 0; i < items.length; i++) {
            if (items[i].directory) {
                let item = { path: items[i].url, enabled: items[i].inside > 0, list: [] };
                current.list.push(item);
            }
        }
        tree = result;
        treeApi = JSON.stringify(result);
        localStorage.setItem('tree_json', treeApi)
    } else {
        tree = JSON.parse(treeApi);
        if (tree.path != `/${parts[0]}`) {
            localStorage.setItem('tree_json', '')
            renderTree(parts);
        }
    }
}

let mainDataTree = null;
function loadDataApiTree(path) {
    if (ajaxTreeCall != null && ajaxTreeCall != undefined) ajaxTreeCall.abort()
    const url = mainDataTree == null ? '' : '&path=\'' + encodeURIComponent(path) + '\''
    ajaxTreeCall = $.ajax({
        url: '/api/files/tree?recursion=1' + url,
        type: 'GET',
        contentType: 'text/html',
        processData: false,
        success: function(data) {
            let needAgain = false;
            try {
                if (mainDataTree == null) {
                    mainDataTree = data;
                    needAgain = path != '/files/';
                } else {
                    insertTreeData(data, mainDataTree.list);
                }
                dataTree = mainDataTree;
                renderTreeView(dataTree)
            } catch (error) {
                console.error(error)
            }
            if (statusOnline == -1) checkStatus();
            if (needAgain) loadDataApiTree(path);
        },
        error: function(xhr, status, error) {
            if (error != 'Unauthorized' && !xhr.responseText.startsWith('<!DOCTYPE html>'))
                console.error('error - [' + xhr.responseText + '] status - ['+ status +'] error - ['+ error +'] serv - ['+ statusOnline +']');
        }
    });
    ajaxTreeCall.fail(function(jqXHR, textStatus, errorThrown) {
        if (jqXHR.status === 401) {
            dialogServLogin();
        }
    });
}
function insertTreeData(item, list) {
    const foundIndex = list.findIndex(child => child.url === item.url);
    if (foundIndex !== -1) {
        list[foundIndex] = item;
        return true;
    } else {
        for (const child of list) {
            if (insertTreeData(item, child.list)) {
                return true;
            }
        }
    }
    return false;
}
function findTreeData(list = dataTree.list, url) {
    let dataTreeUrl = dataTree.url.endsWith('/') ? dataTree.url : (dataTree.url + '/');
    let urlPath = url.endsWith('/') ? url : (url + '/');
    if (urlPath == dataTreeUrl) return dataTree;
    let foundItem = null;

    list.some(child => {
        let childUrl = child.url.endsWith('/') ? child.url : (child.url + '/');
        if (childUrl === urlPath) {
            foundItem = child;
            return true;
        }
        if (child.list) {
            foundItem = findTreeData(child.list, urlPath);
            if (foundItem) return true;
        }
        return false;
    });

    return foundItem;
}
function sortTreeData(list) {
    var sortBy = localStorage.getItem('sortBy');
    var sortAz = localStorage.getItem('sortAz');
    list.forEach(function(item) {
        sortTreeData(item.list);
    });
    list.sort(function(a, b) {
        if (sortBy === 'date') {
            return sortByDate(a, b);
        } else if (sortBy === 'name') {
            return sortByName(sortAz, a, b);
        }
        return 0;
    });
}
function deleteTreeItemByUrl(url, list = dataTree.list) {
    for (let i = 0; i < list.length; i++) {
        if (compareLinks(list[i].url, url)) {
            list.splice(i, 1);
            break;
        }
        if (partOfLink(url, list[i].url)) {
            deleteTreeItemByUrl(url, list[i].list)
            break;
        }
    }
}
function renameTreeItemByUrl(url, oldName, newName, list = dataTree.list) {
    for (let i = 0; i < list.length; i++) {
        if (compareLinks(list[i].url, url)) {
            list[i].name = newName;
            list[i].url = list[i].url.replace(new RegExp(`/${oldName}(\/)?$`), `/${newName}$1`);
            break;
        }
        if (partOfLink(url, list[i].url)) {
            renameTreeItemByUrl(url, oldName, newName, list[i].list)
            break;
        }
    }
}
function createTreeItemByFile(file, list = dataTree.list) {
    let url = file.url;
    let lastIndex = file.url.lastIndexOf('/');
    if (lastIndex !== -1) {
        url = file.url.substring(0, file.url.lastIndexOf('/', file.url.length - 2) + 1);
    }
    for (let i = 0; i < list.length; i++) {
        if (compareLinks(list[i].url, url)) {
            let item = { name: file.name,
                         lvl: `${file.url.split('/').length - 3}`,
                         url: file.url,
                         date: file.date,
                         inside: "0",
                         list: [] }
            list[i].list.push(item);
            break;
        }
        if (partOfLink(url, list[i].url)) {
            createTreeItemByFile(file, list[i].list)
            break;
        }
    }
}
function renderTreeView(data) {
    sortTreeData(data.list);

    let container = $('<div class="tree_container"></div>');
    $('#tree-view .view').empty().append(container);
    let c1 = partOfLink($('#btn-upload').attr('action'), data.url) ? '' : 'close';
    let isCurrent = compareLinks($('#btn-upload').attr('action'), data.url) ? 'current' : '';
    let li = $(`
            <li role="none" class="tree-node"><div class="tree-item ${isCurrent} flex ${c1}">
                <p class="enabled"></p>${svgFolder}
                <span class="tree-anchor">${data.name}</span>
            </div></li>`);
    let currentView = $(`<ul class="tree-container" path="${data.url}" role="group" style="width: fit-content; padding-bottom: 30px;"></ul>`);
    renderTreeItem(li, data.list);
    container.append(currentView.append(li));
    renderTreeClicks(li, data);
}
function renderTreeClicks(li, item) {
    li.find('p.enabled').first().off('click').on('click', function() {
        const li = $(this).parent().parent();
        li.find('li.tree-node').removeClass('close');
        li.find('.tree-item.flex').removeClass('close');
        li.find('li.tree-node').addClass('close');
        li.find('.tree-item.flex').addClass('close');
        if (li.hasClass('close')) {
            li.removeClass('close');
            $(this).parent().removeClass('close');
            if (item.list.length !== 0 && item.lvl >= 3 && item.list[0].inside == -1) {
                if (ajaxTreeCall != null && ajaxTreeCall != undefined) ajaxTreeCall.abort()
                const url = mainDataTree == null ? '' : '&path=\'' + encodeURIComponent(li.parent().attr('path')) + '\''
                ajaxTreeCall = $.ajax({
                    url: '/api/files/tree?recursion=1' + url,
                    type: 'GET',
                    contentType: 'text/html',
                    processData: false,
                    success: function(data) {
                        let needAgain = false;
                        try {
                            insertTreeData(data, dataTree.list);
                            renderTreeItem(li, data.list);
                            renderTreeClicks(li, data);
                        } catch (error) {
                            console.error(error)
                        }
                    },
                    error: function(xhr, status, error) {
                        renderTreeItem(li, item.list);
                        renderTreeClicks(li, item);
                    }
                });
            } else {
                renderTreeItem(li, item.list);
                renderTreeClicks(li, item);
            }
        } else {
            li.addClass('close');
            $(this).parent().addClass('close');
            li.find('.tree-children').remove();
        }
    });
    li.find('svg').first().off('click').on('click', function() {
        const li = $(this).parent().parent();
        const link = li.parent().attr('path');
        const currLink = $('#btn-upload').attr('action');
        if (link != currLink && link != 'undefined') {
            loadDataApi(li.parent().attr('path'));
        }
    });
    li.find('span').first().off('click').on('click', function() {
        const li = $(this).parent().parent();
        const link = li.parent().attr('path');
        const currLink = $('#btn-upload').attr('action');
        if (link != currLink && link != 'undefined') {
            loadDataApi(li.parent().attr('path'));
        }
        if ($('.container_center').hasClass('no-click')) {
            $('#toggle').click();
        }
    });
}

function renderTreeItem(itemView, list) {
    for (let i = 0; i < list.length; i++) {
        // let c = list[i].list.length > 0 ? 'enabled' : '';
        const item = list[i];
        let name = item.name;
        try {
          name = decodeURI(name.replace('%25', '%'));
        } catch (e) {}
        const c = item.list.length == 0 ? 'disabled' : 'enabled';
        const icon = item.inside <= 0 && item.date != 'undefined' ? svgFolderEmpty : svgFolder;

        const c1 = $('#btn-upload').attr('action') != undefined && $('#btn-upload').attr('action').startsWith(item.url) ? '' : 'close';
        const isCurrent = $('#btn-upload').attr('action') == item.url ? 'current' : '';
        const li = $(`
            <li role="none" class="tree-node ${c1}"><div class="tree-item ${isCurrent} flex ${c1}${item.date == 'undefined' ? ' undefined' : ''}">
                <p class="${c}"></p>${icon}
                <span class="tree-anchor">${name}</span>
            </div></li>`);
        const v = $(`<ul class="tree-children" path="${item.date != 'undefined' ? item.url : 'undefined'}" role="group"></ul>`);
        itemView.append(v.append(li));
        if (item.list.length > 0 && c1 == '') {
            renderTreeItem(li, item.list)
        }
        renderTreeClicks(li, item);
    }
}

function compareLinks(link1, link2) {
    if (link1 == undefined || link2 == undefined) {
        return false;
    }
    try {
        let encodedLink2 = link2.split('/').map(encodeURIComponent).join('/');
        let decodedLink2 = link2.split('/').map(decodeURIComponent).join('/');
        return link1 == link2 || link1 == encodedLink2 || link1 == decodedLink2;
    } catch (e) {
        return link1 == link2;
    }
}
function partOfLink(parent, child) {
    if (parent == undefined || child == undefined) {
        return false;
    }
    try {
        let encodedChild = child.split('/').map(encodeURIComponent).join('/');
        let decodedChild = child.split('/').map(decodeURIComponent).join('/');
        return parent.startsWith(child) || parent.startsWith(encodedChild) || parent.startsWith(decodedChild);
    } catch (e) {
        return parent.startsWith(child);
    }
}

var lastSelectedIndex = -1;
function renderItems() {
    selectedItems = [];
    updSelectedView();
    let showAs = localStorage.getItem('showAs');
    let containerClass = (showAs === 'grid') ? 'file-grid-container' : 'file-list-container';
    let divItemsContainer = $('<div id="items-list"></div>').addClass(containerClass);
    let breakAdded = true;

    for (let i = 0; i < items.length; i++) {
        let file = items[i];
        let name = file.name;
        try {
          name = decodeURI(name.replace('%25', '%'));
        } catch (e) {}
        let type = (file.directory) ? 'folder' : 'file';
        let size_max = file.directory && !var_can_folder_size ? ' ' : (' [' + file.size_max + '] ');
        let alt = name + size_max + formatDate(file.date);

        let selectedIndex = selectedItems.findIndex(existingItem => areEqual(existingItem, file));
        let checked = 'checked'
        if (selectedIndex == -1) {
            checked = ''
        }
        let typeIcon = (file.directory) ? svgFolder : svgFile;
        if (file.date == 'undefined') {
            typeIcon = typeIcon.replace('<svg', '<svg style="color: var(--color-error-view);"')
        }
        if (file.directory && file.inside <= 0 && file.date != 'undefined') typeIcon = svgFolderEmpty;
        let fileExt = '';
        if (!file.directory) {
            if (file.name != undefined && file.name.indexOf('.') > 0) {
                let e = file.name.split('.').pop().toUpperCase();
                let c = 'file-ext';
                if (e.length >= 7) {
                    e = e.substring(0, 5) + '…';
                }
                if (e.length > 6) c += ' file-ext-7';
                else if (e.length > 5) c += ' file-ext-6';
                else if (e.length > 4) c += ' file-ext-5';
                fileExt = '<p class="'+c+'">' + e + '</p>';
            }
        }


        let date = formatDate(file.date);
        let itemView;
        let size = showAs === 'grid' ? 'width="180" height="124"' : 'width="114" height="100"';
        const input = file.inside == '-1' ? 
            `<input id="select-item-${i}" type="checkbox" class="checkbox" disabled>` : 
            `<input id="select-item-${i}" type="checkbox" class="checkbox ${checked}">`;
        if (showAs === 'grid') {
            let summ = '<span class="size_text">' + file.size_max + '</span>';
            if (file.directory && !var_can_folder_size) {
                summ = '';
            }
            itemView = $(
                `<div id="${type}-item-${i}" pos="${i}" path="${file.url}" title="${name} [${file.size_max}] ${date}" class="dataview_item" type="button" tabindex="0">
                    <div class="fmanager_card_preview">
                      <span class="icon fmanager_icon">
                        ${typeIcon}
                        ${fileExt}
                      </span>
                      <div class="hover" style="background-color:transparent;">
                        <div class="c-box">${input}</div>
                        <div class="m-icon file-settings">${svgMore}</div>
                      </div>
                    </div>
                    <div class="fmanager_card_panel">
                        <span class="fmanager_card_name">
                            <span class="name_text">${name}</span>
                            ${summ}
                        </span>
                    </div>
                </div>`);
        } else {
            let summ = file.size_max + ' • ';
            if (file.directory && !var_can_folder_size) {
                summ = '';
            }
            itemView = $(
                `<div id="${type}-item-${i}" pos="${i}" path="${file.url}" title="${name} [${file.size_max}] ${date}" class="dataview_item list flex" type="button" tabindex="0">
                    <div class="c-box">${input}</div>
                    <span class="icon fmanager_icon list">
                        ${typeIcon}
                        ${fileExt}
                    </span>
                    <div class="fmanager_card_panel list">
                        <span class="name_text">${name}</span>
                        <span class="size_text">${summ}${date}</span>
                    </div>
                    <div class="m-icon file-settings list">${svgMore}</div>
                </div>`);
        }
        if (file.directory) {
            breakAdded = false;
        }
        if (!breakAdded && !file.directory && !divItemsContainer.is(':empty')) {
            breakAdded = true;
            divItemsContainer.append($('<div class="flex-breaker-horiz"></div>'));
        }
        divItemsContainer.append(itemView);
        if (!file.directory) {
            itemView.on('click', function() {
                createDialogFile(file);
            });
        } else {
            itemView.on('click', function() {
                if (file.inside == '-1') {
                    dialogAlertError(str_error_permission);
                } else {
                    loadDataApi(file.url, $(this));
                }
            });
            itemView.find('.file-settings').on('click', function(e) {
                e.stopPropagation();
                hideContextMenu();
                createDialogFile(file);
            });
        }

        if (file.mimeType != undefined && file.mimeType.startsWith('image') && use_thumb) {
            let imageView = $('<img style="display:none; object-fit: cover; ">').attr({
                width: showAs === 'grid' ? 180 : 120,
                height: showAs === 'grid' ? 124 : 100,
                src: `${file.url}${use_thumb ? '?type=thumb' : ''}`,
            });
//            let canvasView = $('<canvas class="loaded" style="object-fit: cover; ">').attr({
//                width: showAs === 'grid' ? 180 : 120,
//                height: showAs === 'grid' ? 124 : 100,
//            }).prependTo(itemView.find('.fmanager_icon'));
            let image = imageView.get(0);
            image.onload = function() {
                if (!use_thumb) {
                    if (!imageView.hasClass('loaded')) imageView.addClass('loaded');
                    if (!imageView.hasClass('hide')) imageView.css('display', '');

//                    let canvas = canvasView.get(0);
//                    let ctx = canvas.getContext('2d');
//                    canvas.width = showAs === 'grid' ? 180 : 120;
//                    canvas.height = showAs === 'grid' ? 124 : 100;
//
//                    let sourceWidth = image.naturalWidth;
//                    let sourceHeight = image.naturalHeight;
//                    let aspectRatio = sourceWidth / sourceHeight;
//                    let destWidth = canvas.width;
//                    let destHeight = canvas.height;
//                    let destX = 0;
//                    let destY = 0;
//                    if (aspectRatio < canvas.width / canvas.height) {
//                        destWidth = canvas.width;
//                        destHeight = canvas.width / aspectRatio;
//                        destY = (canvas.height - destHeight) / 2;
//                    } else {
//                        destWidth = canvas.height * aspectRatio;
//                        destHeight = canvas.height;
//                        destX = (canvas.width - destWidth) / 2;
//                    }
//                    ctx.drawImage(image, 0, 0, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight);
//                    $(canvas).prependTo(itemView.find('.fmanager_icon'));
//                    imageView.prependTo(itemView.find('.fmanager_icon'));
                } else {
                    imageView.prependTo(itemView.find('.fmanager_icon'));
                    imageView.css('display', '');
                }
                itemView.find('.fmanager_icon svg, .fmanager_icon p').css('display', 'none');
            };
        } else if (file.mimeType != undefined && file.mimeType.startsWith('video') && use_thumb) {
            let imageView = $('<img style="display:none; object-fit: cover; ">').attr({
                width: showAs === 'grid' ? 180 : 120,
                height: showAs === 'grid' ? 124 : 100,
                src: `${file.url}?type=thumb`,
            });
            let image = imageView.get(0);
            image.onload = function() {
                imageView.css('display', '');
                imageView.prependTo(itemView.find('.fmanager_icon'));
                itemView.find('.fmanager_icon svg, .fmanager_icon p').css('display', 'none');
                itemView.find('.fmanager_icon').append(`<div class="inside">${svgPlayCircle}</div>`);
            }
        }
        itemView.find('input').off('change').on('change', function(e) {
            if (shiftPressed && lastSelectedIndex != -1) {
                var direction = lastSelectedIndex < i ? 1 : -1;
                var itemsToAdd = [];
                for (let x = lastSelectedIndex; (direction === 1 ? x <= i : x >= i); x += direction) {
                    itemsToAdd.unshift(items[x]);
                }
                selectedItems = [];
                selectedItems.push(...itemsToAdd.filter(item => item.inside != '-1'));
            } else {
                if (selectedItems.indexOf(file) == -1) {
                    lastSelectedIndex = i;
                    if (file.inside != '-1') selectedItems.push(file);
                } else {
                    selectedItems.splice(selectedItems.indexOf(file), 1);
                }
            }
            if (selectedItems.length == 0) {
                lastSelectedIndex = -1;
            }
            updSelectedView();
        });
        itemView.on('contextmenu', function(e) {
            e.stopPropagation();
            e.preventDefault();
            var options = [
                { id: 0, name: str_open, icon: svgOpen, enable: (var_can_read || file.directory) && file.inside != '-1' },
                { id: 2, name: str_server_rename, icon: svgEdit, enable: var_can_write && file.inside != '-1' },
                { id: 4, name: str_server_move + '...', icon: svgMove, enable: var_can_write && file.inside != '-1' },
                undefined,
                { id: 1, name: !file.directory ? str_server_down : str_server_downzip, icon: !file.directory ? svgDownload : svgZip, enable: var_can_read && file.inside != '-1' },
                { id: 3, name: str_server_delete, icon: svgDelete, enable: var_can_write && file.inside != '-1' }
            ];
            showContextMenu(options, function(selectedOption) {
                if (!selectedOption.enable) {
                    dialogAlertError(file.inside != '-1' ? str_error_permission : 'Can\'t read');
                    return;
                }
                switch (selectedOption.id) {
                    case 1:
                        if (!file.directory) {
                            download(file.url);
                        } else {
                            downloadZip([file])
                        }
                        break;
                    case 2:
                        fileRename(file, itemView);
                        break;
                    case 3:
                        fileDelete(file, itemView);
                        break;
                    case 4:
                        let filesArr = [];
                        filesArr.push(file);
                        filesMove(filesArr, itemView);
                        break;
                    default:
                    let a = $(`<a id="fileDown01" href="${file.url}" target="_blank" style="display:none;"></a>`);
                        $('body').append(a);
                        a[0].click();
                        setTimeout(function() {
                            a.remove();
                        }, 1000);
                        break;
                }
            });
        });
        itemView.find('.c-box').on('click', function() {
            hideContextMenu();
            event.stopPropagation();
        });
    }
    if (!divItemsContainer.is(':empty')) {
        $('#contentFiles').append(divItemsContainer);
        divItemsContainer.append($('<div class="space-200"></div>'));
    }
}
function drawThumb(image) {
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    let aspectRatio = image.width / image.height;
    canvas.width = 200;
    canvas.height = canvas.width / aspectRatio;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL();
}

function areEqual(item1, item2) {
    return item1.url === item2.url;
}

function updSelectedView() {
    for (var i = 0; i < items.length; i++) {
        let item = items[i];
        let type = item.directory ? 'folder' : 'file';
        let itemView = $(`#${type}-item-${i}`);
        if (item.inside != '-1') itemView.find('input').prop("checked", selectedItems.indexOf(item) != -1);
    }
    if (selectedItems.length == 0) {
        $('#selected-btns').remove();
        $('#selected-text').remove();
        $('#btn-left-rss').css("display", rss_enabled ? 'flex' : 'none');
        $('#breadcrumbs-btns').css('display', '');
        $('#breadcrumbs-links').css('display', '');
        $('#breadcrumbs-links').parent().css('background-color', '');
        $('#breadcrumbs-links').parent().css('margin-right', '');
    } else {
        $('#selected-btns').remove();
        $('#selected-text').remove();
        let btnSelectCancel = $(`<button type="button" role="tab" tabindex="0" class="space-item space-compact icon-tr" style="margin-right: 0; color:var(--color-button-text)" data-original-title="${str_server_cancel}" data-toggle="tooltip">
              ${svgCancel}
            </button>`);
        btnSelectCancel.hover(
            function () {
                showTooltip($(this));
            },
            function () {
                hideTooltip();
            }
        );
        btnSelectCancel.on('click', function(e) {
            selectedItems = [];
            updSelectedView();
        });
        let btnSelectMove = $(`<button type="button" role="tab" tabindex="0" class="space-item space-compact icon-tr${var_can_write ? '' : ' opacity-disable'}" style="margin-inline: 0; color:var(--color-button-text)" data-original-title="${str_server_move}" data-toggle="tooltip">
              ${svgMove}
            </button>`);
        btnSelectMove.hover(
            function () {
                showTooltip($(this));
            },
            function () {
                hideTooltip();
            }
        );
        btnSelectMove.on('click', function(e) {
            if (var_can_write) {
                filesMove(selectedItems);
            } else {
                dialogAlertError(str_error_permission);
            }
        });
        let btnSelectDownload = $(`<button type="button" role="tab" tabindex="0" class="space-item space-compact icon-tr${var_can_read ? '' : ' opacity-disable'}" style="margin-inline: 0; color:var(--color-button-text)" data-original-title="${str_server_downzip}" data-toggle="tooltip">
              ${svgZip}
            </button>`);
        btnSelectDownload.hover(
            function () {
                showTooltip($(this));
            },
            function () {
                hideTooltip();
            }
        );
        btnSelectDownload.on('click', function(e) {
            if (var_can_read) {
                downloadZip(selectedItems);
            } else {
                dialogAlertError(str_error_permission);
            }
        });
        let btnSelectDelete = $(`<button type="button" role="tab" tabindex="0" class="space-item space-compact icon-tr${var_can_write ? '' : ' opacity-disable'}" style="margin-left: 0; color:var(--color-button-text)" data-original-title="${str_server_delete}" data-toggle="tooltip">
              ${svgDelete}
            </button>`);
        btnSelectDelete.hover(
            function () {
                showTooltip($(this));
            },
            function () {
                hideTooltip();
            }
        );
        btnSelectDelete.on('click', function(e) {
            if (var_can_write) {
                filesSelectedDelete(btnSelectDelete);
            } else {
                dialogAlertError(str_error_permission);
            }
        });
        let selectedBtns = $(`<div id="selected-btns" class="el_box" style="margin:0; padding: 0; flex: none;"></div>`);
        let selectedText = $(`<div id="selected-text" class="el_box">${str_selected}:${selectedItems.length}</div>`);
        let container = $('#breadcrumbs-btns').parent();
        container.css('background-color', 'var(--color-button)');
        container.append(selectedBtns.append(btnSelectCancel).append(btnSelectMove).append(btnSelectDownload).append(btnSelectDelete)).append(selectedText);
        $('#btn-left-rss').css('display', 'none');
        $('#breadcrumbs-btns').css('display', 'none');
        $('#breadcrumbs-links').css('display', 'none');
    }
}

function reRenderItems() {
    $('#contentFiles').empty();
    renderItems();
}

function filesSelectedDelete(view) {
    let point = { x: $('body').outerWidth()/2, y: $('body').outerHeight()/2};
    if (view != undefined) {
        point.x = view.offset().left + view.outerWidth() / 2;
        point.y = view.offset().top + view.outerHeight() / 2;
    }
    let sum = '';
    for (var i = 0; i < selectedItems.length; i++) {
        let name = selectedItems[i].name;
        try {
          name = decodeURI(name);
        } catch (e) {}
        sum += name;
        if (i < selectedItems.length - 1) {
            sum += ', ';
        }
    }
    let callback = {positive: function() {
        filesDeleteCallback(selectedItems, view);
        return true;
    }, negative: function() {return true;}}
    let dialog = createDialogAlert(str_server_delete + ':' + selectedItems.length, sum, str_server_delete, undefined, true, point, callback);
    dialog.find('.alert-title').prepend(svgDelete);
}

function fileDelete(file, view) {
    let point = { x: $('body').outerWidth()/2, y: $('body').outerHeight()/2};
    if (view != undefined) {
        point.x = view.offset().left + view.outerWidth() / 2;
        point.y = view.offset().top + view.outerHeight() / 2;
    }
    let callback = {positive: function() {
        let files = [];
        files.push(file);
        filesDeleteCallback(files, view);
        return true;
    }, negative: function() {return true;}}
    let name = file.name;
    try {
      name = decodeURI(name);
    } catch (e) {}
    let dialog = createDialogAlert(name, file.url, str_server_delete, undefined, true, point, callback);
    dialog.find('.alert-title').prepend(svgDelete);
}
function filesDeleteCallback(files, view) {
    let namesArray = [];
    for (var i = 0; i < files.length; i++) {
        let name = files[i].name;
        try {
          name = decodeURI(name);
        } catch (e) {}
        namesArray.push(name);
    }
    let p = $('#btn-upload').attr('action')
    showLoaderFiles();
    ajaxCall = $.ajax({
        url: '/api/files/delete',
        contentType: "application/json",
        type: 'POST',
        data: JSON.stringify({ names: namesArray, path: p }),
        success: function(data) {
            hideLoaderFiles();
            removeDialog();
            for (var i = 0; i < files.length; i++) {
                items.splice(items.indexOf(files[i]), 1);
            }
            reRenderItems();
            if (dataTree != undefined) {
                let rend = false;
                for (var i = 0; i < files.length; i++) {
                    if (files[i].directory) {
                        deleteTreeItemByUrl(files[i].url);
                        rend = true;
                    }
                }
                if (rend) renderTreeView(dataTree);
            }
            if (statusOnline == -1) checkStatus();
        },
        error: function(xhr, status, error) {
            ajaxErrorMsg(xhr, status, error, view);
        }
    });
    ajaxCall.fail(function(jqXHR, textStatus, errorThrown) {
        if (jqXHR.status === 401) {
            dialogServLogin();
        }
    });
}
function fileMoveCallback(files, path, view) {
    let pathsArray = [];
    for (var i = 0; i < files.length; i++) {
        pathsArray.push(files[i].url);
    }
    showLoaderFiles();
    ajaxCall = $.ajax({
        url: '/api/files/move',
        contentType: "application/json",
        type: 'POST',
        data: JSON.stringify({ paths: pathsArray, pathEnd: path }),
        success: function(data) {
            removeDialog();
            if (dataTree != undefined) {
                for (var i = 0; i < files.length; i++) {
                    if (files[i].directory) {
                        deleteTreeItemByUrl(files[i].url);
                    }
                }
            }
            loadDataApi($('#btn-upload').attr('action'), $('#btn-refresh'));
            if (statusOnline == -1) checkStatus();
        },
        error: function(xhr, status, error) {
            ajaxErrorMsg(xhr, status, error, view);
        }
    });
    ajaxCall.fail(function(jqXHR, textStatus, errorThrown) {
        if (jqXHR.status === 401) {
            dialogServLogin();
        }
    });
}
function filesMove(files, view = undefined) {
    let callback = {positive: function(result) {
        let callbackAlert = {positive: function() {
            fileMoveCallback(files, result, view);
            return true;
        }, negative: function() {
            return true;
        }}
        let namesArray = [];
        for (var i = 0; i < files.length; i++) {
            try {
                namesArray.push(decodeURI(files[i].name));
            } catch (e) {
                namesArray.push(files[i].name);
            }
        }
        let point = { x: $('body').outerWidth()/2, y: $('body').outerHeight()/2};
        if (view != undefined) {
            point.x = view.offset().left + view.outerWidth() / 2;
            point.y = view.offset().top + view.outerHeight() / 2;
        }
        let dialog = createDialogAlert(str_server_move, `[${namesArray.join(', ')}]<br><br><b>${result}</b>`, undefined, undefined, true, point, callbackAlert);
        dialog.find('.alert-title').prepend(svgMove);
        return true;
    }, negative: function() {
        return true;
    }}
    dialogAlertFolders(files, str_server_move, callback, view);
}

function fileRename(file, view) {
    let callback = {positive: function() {return true;}, negative: function() {return true;}}
    callback.positive = function(result) {
        let nName = result;
        if (file.name != nName && nName != '') {
            showLoaderFiles();
            ajaxCall = $.ajax({
                url: '/api/files/rename',
                type: 'POST',
                data: JSON.stringify({ name: result, path: file.url }),
                contentType: false,
                processData: false,
                success: function(data) {
                    hideLoaderFiles();
                    if (file.directory) {
                        if (dataTree != undefined) {
                            renameTreeItemByUrl(file.url, file.name, nName);
                            renderTreeView(dataTree);
                        }
                    }
                    file.url = file.url.replace(new RegExp(`/${file.name}(\/)?$`), `/${nName}$1`);
                    file.name = result;
                    if (hasDialog()) {
                        let newContent = getDialogFile(file);
                        toggleDialogFull(isDialogFull, newContent.find('#dialog-content'));
                        $('#dialog-full').append(newContent);
                        $('#dialog-item').remove();
                        recreateDialogFull(newContent, file);
                    }
                    reRenderItems();
                    if (statusOnline == -1) checkStatus();
                },
                error: function(xhr, status, error) {
                    ajaxErrorMsg(xhr, status, error, view);
                }
            });
            ajaxCall.fail(function(jqXHR, textStatus, errorThrown) {
                if (jqXHR.status === 401 && statusOnline != -1) {
                    dialogServLogin();
                }
            });
        } else {
            fileRename(file, view);
        }
        return true;
    }
    let name = file.name;
    try {
      name = decodeURI(name);
    } catch (e) {}
    dialogAlertEdit(str_server_rename, name, str_server_ok, svgEdit, callback,view);
}

function sendFiles(files, url) {
    if (files.length != 0) {
        var arrFiles = [];
        for (var i = 0; i < files.length; i++) {
            if (files[i] instanceof File) {
                arrFiles.push(files[i])
            }
        }
        var filesToUpload = Array.from(arrFiles).filter(function(file) {
            return file.type !== "application/x-directory" && file.type !== "inode/directory";
        });
        if (filesToUpload.length != 0) createDialogUploadFiles(filesToUpload, url);
    }
}

function focusAndPlaceCaretAtEnd(el) {
    el.focus();
    if (typeof window.getSelection != "undefined" && typeof document.createRange != "undefined") {
        var range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);

    } else if (typeof document.body.createTextRange != "undefined") {
        var textRange = document.body.createTextRange();
        textRange.moveToElementText(el);
        textRange.collapse(false);
        textRange.select();
    }
}

function renderBreadcrumbsUrl(url) {
    let container = $("#breadcrumb-view");
    container.empty();
    let trimmedUrl = url;
    if (trimmedUrl.startsWith('http')) {
        trimmedUrl = trimmedUrl.split('/').slice(3).join('/');
    } else if (trimmedUrl.startsWith('/')) {
        trimmedUrl = trimmedUrl.split('/').slice(1).join('/');
    }
    if (trimmedUrl.endsWith('/')) trimmedUrl = trimmedUrl.substring(0, trimmedUrl.length - 1);
    let parts = trimmedUrl.split('/');
    renderTree(parts);
    let buildUrl = ""
    for (var i = 0; i < parts.length; i++) {
        let p = parts[i].replaceAll('%25', '%');
        buildUrl+= "/" + parts[i].replaceAll('%25', '%');
        if (i == 0) p = str_home
        if (p.startsWith('//') || p == "//") p = p.replace("//", "/");
        if (buildUrl.startsWith('//') || buildUrl == "//") buildUrl = buildUrl.replace("//", "/");
        let active = (i == parts.length - 1) ? ' active' : '';
        let link = $(`<a href="${buildUrl}/">${p}</a>`);
        link.on('click', function(e) {
            e.preventDefault();
            loadDataApi($(this).attr('href'), $(this));
        });

        container.append($(`<li class="b-item ${active}" path="${buildUrl}"></li>`).append(link));
    }
    container.scrollLeft(container[0].scrollWidth);
}

function formatDate(timestamp) {
    try {
        if (timestamp != '') {
            const date = new Date(parseInt(timestamp));
            const day = ('0' + date.getDate()).slice(-2);
            const month = ('0' + (date.getMonth() + 1)).slice(-2);
            const year = date.getFullYear();
            const hours = ('0' + date.getHours()).slice(-2);
            const minutes = ('0' + date.getMinutes()).slice(-2);
            const seconds = ('0' + date.getSeconds()).slice(-2);
            return day + '.' + month + '.' + year + ' ' + hours + ':' + minutes + ':' + seconds;
        }
    } catch(e) {}
    return timestamp;
}

function clearSelected() {
    selectedItems = [];
    shiftPressed = false;
    ctrlPressed = false;
    updSelectedView();
}

function isText(name) {
    let end = 'x';
    if (name.indexOf('.') > -1) {
        end = name.split('.').pop().toLowerCase();
    } else {
        return false;
    }
    const validExtensions = [
        '.txt', '.md', '.html', '.htm', '.xml', '.json', '.csv', '.tsv', '.log',
        '.conf', '.cfg', '.ini', '.yaml', '.yml', '.c', '.cpp', '.h', '.hpp',
        '.java', '.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.less', '.php',
        '.py', '.rb', '.pl', '.sh', '.bat', '.cmd', '.sql', '.r', '.matlab', '.m',
        '.asm', '.tex', '.lisp', '.lua', '.xhtml', '.shtml', '.jsp', '.asp', '.aspx',
        '.csharp', '.cs', '.vb', '.vbs', '.svg', '.rtf', '.doc', '.docx', '.xls',
        '.xlsx', '.ppt', '.pptx', '.pdf', '.odt', '.ods', '.odp', '.odg', '.odf',
        '.epub', '.chm', '.hlp', '.reg', '.ps1', '.kt', '.m3u', '.m3u8', '.trace',
        '.pem', '.cer', '.map', '.mjs', '.mf', '.logcat', '.save'
    ];
    return validExtensions.includes(`.${end}`);
}

function isArchive(mimeType) {
    const archiveTypes = [
        'application/x-7z-compressed',
        'application/x-rar-compressed',
        'application/gzip',
        'application/x-tar',
        'application/zip'
    ];

    return archiveTypes.includes(mimeType);
}

function Timer(callback, delay) {
    let timerId;
    this.start = function() {
        clearTimeout(timerId);
        timerId = setTimeout(callback, delay);
    };
    this.startNow = function() {
        clearTimeout(timerId);
        timerId = setTimeout(callback, 0);
    };
    this.clear = function() {
        clearTimeout(timerId);
    };
}
var socketCall;
var timerReconnect = new Timer(function() {
    // console.log('timerReconnect '+new Date().toLocaleTimeString() + ' ' + var_check_connection);
    statusOnline = -1;
    if (socketCall != null && socketCall != undefined && socketCall.readyState === WebSocket.OPEN) {
        socketCall.onclose = null;
        socketCall.onerror = null;
        socketCall.close();
    }
    socketCall = null;
    reconnectServ();
}, 15000);
var tryReconnect = 0;
var maxTryReconnect = 2;
function checkStatus() {
    // console.log('checkStatus '+new Date().toLocaleTimeString() + ' ' + var_check_connection);
    if (var_check_connection) {
        timerReconnect.start();
        $('.status-title').css('display', '');
        $('.status-text').text('connecting');
        $('.status-title p').css('color', 'orange');
        var protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        if (socketCall != null && socketCall != undefined && socketCall.readyState === WebSocket.OPEN) {
            socketCall.onclose = null;
            socketCall.onerror = null;
            socketCall.close();
        }
        socketCall = null;
        try {
            statusOnline = 0;
            socketCall = new WebSocket(protocol + window.location.host + '/api/files/status');
            socketCall.onopen = function(event) {
                tryReconnect = 0;
                statusOnline = 1;
                $('.status-text').text('online');
                $('.status-title p').css('color', 'green');
        //        console.log('socketCall.onopen'+new Date().toLocaleTimeString());
                timerReconnect.start();
            };
            socketCall.onmessage = function(event) {
    //            console.log(event.data + ' socketCall.onmessage '+new Date().toLocaleTimeString());
                if (event.data === 'Unauthorized' && statusOnline != -1) {
                    dialogServLogin();
                }
                timerReconnect.start();
            };
            socketCall.onclose = function(event) {
    //            console.error(event);
    //            console.log(event + ' socketCall.onclose [' + event.code + '] ' + new Date().toLocaleTimeString());
                statusOnline = -1;
                timerReconnect.startNow();
            };
            socketCall.onerror = function (error) {
//                console.error(error);
    //            console.log(error + ' socketCall.onerror [' + event.code + '] ' + new Date().toLocaleTimeString());
                statusOnline = -1;
                timerReconnect.startNow();
            };
        } catch (error) {
            console.error(error);
            statusOnline = -1;
            timerReconnect.startNow();
        }
    } else {
        statusOnline = 0;
        $('.status-title').css('display', 'none');
    }
}
var isReconnect = false;
function reconnectServ(error = undefined) {
//    console.log(`reconnectServ ${isReconnect} ${tryReconnect} `+new Date().toLocaleTimeString());
    if (!isReconnect) {
        if (tryReconnect != maxTryReconnect) {
            isReconnect = true;
            tryReconnect += 1;
            $('.status-text').text('connecting');
            $('.status-title p').css('color', 'orange');
            setTimeout(function() {
                isReconnect = false
                checkStatus();
            }, 3000);
        } else dialogServIsOff(error);
    }
}
var dialogServIsShow = false;
function dialogServIsOff(error = undefined) {
    if (!dialogServIsShow) {
        dialogServIsShow = true;
        $('.status-text').text('offline');
        $('.status-title p').css('color', 'red');
        let callback = {positive: function() {
            dialogServIsShow = false;
            tryReconnect = 0;
            checkStatus();
            return true;
        }, negative: function() {
            tryReconnect = 0;
            dialogServIsShow = false;
            return true;
        }}
        let icon = `<svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" fill="red" class="bi bi-trash3" viewBox="0 0 16 16">
                              <path d="M10.706 3.294A12.6 12.6 0 0 0 8 3C5.259 3 2.723 3.882.663 5.379a.485.485 0 0 0-.048.736.52.52 0 0 0 .668.05A11.45 11.45 0 0 1 8 4q.946 0 1.852.148zM8 6c-1.905 0-3.68.56-5.166 1.526a.48.48 0 0 0-.063.745.525.525 0 0 0 .652.065 8.45 8.45 0 0 1 3.51-1.27zm2.596 1.404.785-.785q.947.362 1.785.907a.482.482 0 0 1 .063.745.525.525 0 0 1-.652.065 8.5 8.5 0 0 0-1.98-.932zM8 10l.933-.933a6.5 6.5 0 0 1 2.013.637c.285.145.326.524.1.75l-.015.015a.53.53 0 0 1-.611.09A5.5 5.5 0 0 0 8 10m4.905-4.905.747-.747q.886.451 1.685 1.03a.485.485 0 0 1 .047.737.52.52 0 0 1-.668.05 11.5 11.5 0 0 0-1.811-1.07M9.02 11.78c.238.14.236.464.04.66l-.707.706a.5.5 0 0 1-.707 0l-.707-.707c-.195-.195-.197-.518.04-.66A2 2 0 0 1 8 11.5c.374 0 .723.102 1.021.28zm4.355-9.905a.53.53 0 0 1 .75.75l-10.75 10.75a.53.53 0 0 1-.75-.75z"/>
                            </svg>`
        dialogAlertError(str_server_offline, error, undefined, str_server_reconnect, undefined, icon, callback);
    }
}

async function download(url) {
//    try {
//        const fileHandle = await window.showSaveFilePicker();
//        const writableStream = await fileHandle.createWritable({
//            keepExistingData: false,
//            suggestedName: 'filename.txt',
//            name: 'filename.txt'
//        });
//        const response = await fetch(url);
//        await response.body.pipeTo(writableStream);
//        if (writableStream.state != 'closed' && writableStream.state != undefined) {
//            await writableStream.close();
//        }
//        console.log('saved');
//    } catch (err) {
//        console.error('Error save', err);
        let a = $(`<a id="fileDown01" href="${url}?type=download" download style="display:none;"></a>`);
        $('body').append(a);
        a[0].click();
        setTimeout(function() {
            a.remove();
        }, 1000);
//    }
}

function downloadZip(items) {
    createDialogZip(items, $('#btn-upload').attr('action'));
    clearSelected();
}

function ajaxErrorMsg(xhr, status, error, view) {
    console.error('status - ['+ status +'] error - ['+ error +'] serv - ['+ statusOnline +']');
    hideLoaderFiles();
    if (error == 'Unauthorized') {
        dialogServLogin();
    } else if (!xhr.responseText.startsWith('<!DOCTYPE html>')) {
        if (statusOnline == -1) {
            dialogServIsOff();
        } else if (status != 'abort' && error != 'Unauthorized') {
            hideLoaderFiles();
            let e = xhr.responseText;
            let msg = '';
            try {
                msg = JSON.parse(e).message;
                e = JSON.parse(e).error;
            } catch (error) {
                console.error(error);
            }
            dialogAlertError(e + ' ['+ error +']', msg, view);
        }
    }
}









