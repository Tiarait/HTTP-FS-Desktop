var isDialogFull = false;
var mediaElement = null;
var canvas = null;
var image = null;

function hasDialog() {
    return $('body').find('#dialog-bg').length > 0;
}
function clearRes() {
    timerDialogPlayMedia.clear();
    if (mediaElement != null) {
        mediaElement.get(0).pause();
        mediaElement.get(0).currentTime = 0;
    }
    mediaElement = null;
    canvas = null;
    if (image != null) {
        image.src = '';
    }
    image = null;
}
function removeDialog() {
    if (hasDialog() || isDialogFull) {
        clearRes();
        isDialogFull = false;
        let oldDialog = $('body').find('#dialog-full');
        $('#dialog-bg').css('backdrop-filter', 'blur(0px)');
        oldDialog.css('transform', 'translateY(100%)');
        setTimeout(function() {
            $('#dialog-bg').remove();
        }, animDelay);
    }
}
function createDialogFull(content, item) {
    hideContextMenu();
    if (hasDialog()) {
        removeDialog();
        setTimeout(function() {
            createDialogFull(content, item);
        }, animDelay + 50);
    } else {
        isDialogFull = false;
        content.css('opacity', '0');
        let dialogFull = $('<div id="dialog-full" class="dialog full" style="transform: translateY(100%); transition: '+animDelay+'ms linear;"></div>');
        let dialogBg = $('<div id="dialog-bg" class="dialog bg"></div>').append(dialogFull);
        dialogBg.on('click', function() {
            removeDialog();
        });
        dialogFull.on('click', function(event) {
            hideContextMenu();
            event.stopPropagation();
        });
        $('body').append(dialogBg);
        $('#dialog-bg').css('backdrop-filter', 'blur(3px)');
        content.css('opacity', '0');
        dialogFull.append(content);
        recreateDialogFull(content, item)
    }
}
function recreateDialogFull(content, item) {
    let dialogFull = $('#dialog-full');
    let dialogBg = $('#dialog-bg');

    dialogFull.off('mousewheel').off('touchstart').off('touchmove');

    setTimeout(function() {
        dialogFull.css('transform', 'translateY(0%)');
    }, 50);
    setTimeout(function() {
        let btnCancel = $(`<button type="button" id="dialogBtnCancel" style="margin:0" role="tab" tabindex="0" class="space-item space-compact icon dialog" data-original-title="${str_server_cancel}" data-toggle="tooltip">
                  ${svgCancel}
                </button>`);
        btnCancel.off('click').on('click', function(e) {
            removeDialog();
        });
        let btnFull = $(`<button type="button" style="margin:0" role="tab" tabindex="0" class="space-item space-compact icon dialog" data-original-title="${str_fullscreen}" data-toggle="tooltip">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrows-fullscreen" viewBox="0 0 16 16">
                  <path fill-rule="evenodd" d="M5.828 10.172a.5.5 0 0 0-.707 0l-4.096 4.096V11.5a.5.5 0 0 0-1 0v3.975a.5.5 0 0 0 .5.5H4.5a.5.5 0 0 0 0-1H1.732l4.096-4.096a.5.5 0 0 0 0-.707m4.344 0a.5.5 0 0 1 .707 0l4.096 4.096V11.5a.5.5 0 1 1 1 0v3.975a.5.5 0 0 1-.5.5H11.5a.5.5 0 0 1 0-1h2.768l-4.096-4.096a.5.5 0 0 1 0-.707m0-4.344a.5.5 0 0 0 .707 0l4.096-4.096V4.5a.5.5 0 1 0 1 0V.525a.5.5 0 0 0-.5-.5H11.5a.5.5 0 0 0 0 1h2.768l-4.096 4.096a.5.5 0 0 0 0 .707m-4.344 0a.5.5 0 0 1-.707 0L1.025 1.732V4.5a.5.5 0 0 1-1 0V.525a.5.5 0 0 1 .5-.5H4.5a.5.5 0 0 1 0 1H1.732l4.096 4.096a.5.5 0 0 1 0 .707"/>
                </svg>
            </button>`);
        btnFull.off('click').on('click', function() {
            isDialogFull = !dialogFull.hasClass("height100");
            toggleDialogFull(isDialogFull, dialogFull.find('#dialog-content'));
        });
        content.find('#dialog-title-btns').append(btnFull).append(btnCancel);
        content.find('#dialog-title-btns').off('click').on('click', function(e) {
            if (e.clientX >= btnCancel.offset().left) {
                e.stopPropagation();
                e.preventDefault();
                removeDialog();
            }
        });
        
        content.find('*[data-toggle="tooltip"]').hover(
            function () {
                showTooltip($(this));
            }, 
            function () {
                hideTooltip();
            }
        );
        let startY;
        let startX;
        dialogFull.off('touchstart').on('touchstart', function(event) {
            startY = event.touches[0].clientY;
            startX = event.touches[0].clientX;
        });
        dialogFull.off('touchmove').on('touchmove', function(event) {
            let deltaY = event.touches[0].clientY - startY;
            let deltaX = event.touches[0].clientX - startX;
            if (deltaX < -100) {
                dialogNextItem();
            } else if (deltaX > 100) {
                dialogPrevItem();
            } else if (deltaY < -100) {
                isDialogFull = true;
                toggleDialogFull(isDialogFull, content.find('#dialog-content'));
            } else if (deltaY > 100) {
                isDialogFull = false;
                toggleDialogFull(isDialogFull, content.find('#dialog-content'));
            }
        });
        dialogFull.on('mousewheel', function(event) {
            let deltaX = event.deltaX || event.detail || event.wheelDelta || event.originalEvent.deltaX || 0;
            if (deltaX > -5 && deltaX < 5) {
                handlerDialogScroll(content, item);
            }
        });
        
    }, 50);
    setTimeout(function() {
        content.css('opacity', '1');
    }, animDelay + 50);
    content.css('transform', 'translateX(0%)');
}
function recreateDialogFullNoAnim(content, item) {
    let dialogFull = $('#dialog-full');
    let dialogBg = $('#dialog-bg');

    dialogFull.off('mousewheel').off('touchstart').off('touchmove');
    let btnCancel = $(`<button type="button" id="dialogBtnCancel" style="margin:0" role="tab" tabindex="0" class="space-item space-compact icon dialog" data-original-title="${str_server_cancel}" data-toggle="tooltip">
          ${svgCancel}
        </button>`);
    btnCancel.off('click').on('click', function() {
        removeDialog();
    });
    let btnFull = $(`<button type="button" id="dialogBtnFull" style="margin:0" role="tab" tabindex="0" class="space-item space-compact icon dialog" data-original-title="${str_fullscreen}" data-toggle="tooltip">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrows-fullscreen" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M5.828 10.172a.5.5 0 0 0-.707 0l-4.096 4.096V11.5a.5.5 0 0 0-1 0v3.975a.5.5 0 0 0 .5.5H4.5a.5.5 0 0 0 0-1H1.732l4.096-4.096a.5.5 0 0 0 0-.707m4.344 0a.5.5 0 0 1 .707 0l4.096 4.096V11.5a.5.5 0 1 1 1 0v3.975a.5.5 0 0 1-.5.5H11.5a.5.5 0 0 1 0-1h2.768l-4.096-4.096a.5.5 0 0 1 0-.707m0-4.344a.5.5 0 0 0 .707 0l4.096-4.096V4.5a.5.5 0 1 0 1 0V.525a.5.5 0 0 0-.5-.5H11.5a.5.5 0 0 0 0 1h2.768l-4.096 4.096a.5.5 0 0 0 0 .707m-4.344 0a.5.5 0 0 1-.707 0L1.025 1.732V4.5a.5.5 0 0 1-1 0V.525a.5.5 0 0 1 .5-.5H4.5a.5.5 0 0 1 0 1H1.732l4.096 4.096a.5.5 0 0 1 0 .707"/>
            </svg>
        </button>`);
    btnFull.off('click').on('click', function() {
        isDialogFull = !dialogFull.hasClass("height100");
        toggleDialogFull(isDialogFull, content);
    });
    content.find('#dialog-title-btns').append(btnFull).append(btnCancel);
    content.find('#dialog-title-btns').off('click').on('click', function(e) {
        if (e.clientX >= btnCancel.offset().left) {
            e.stopPropagation();
            e.preventDefault();
            removeDialog();
        }
    });
    
    content.find('*[data-toggle="tooltip"]').hover(
        function () {
            showTooltip($(this));
        }, 
        function () {
            hideTooltip();
        }
    );
    let startY;
    let startX;
    dialogFull.off('touchstart').on('touchstart', function(event) {
        startY = event.touches[0].clientY;
        startX = event.touches[0].clientX;
    });
    dialogFull.off('touchmove').on('touchmove', function(event) {
        let deltaY = event.touches[0].clientY - startY;
        let deltaX = event.touches[0].clientX - startX;
        if (deltaX < -100) {
            dialogNextItem();
        } else if (deltaX > 100) {
            dialogPrevItem();
        } else if (deltaY < -100) {
            isDialogFull = true;
            toggleDialogFull(isDialogFull, content.find('#dialog-content'));
        } else if (deltaY > 100) {
            isDialogFull = false;
            toggleDialogFull(isDialogFull, content.find('#dialog-content'));
        }
    });
    dialogFull.on('mousewheel', function(event) {
        let deltaX = event.deltaX || event.detail || event.wheelDelta || event.originalEvent.deltaX || 0;
        if (deltaX > -5 && deltaX < 5) {
            handlerDialogScroll(content, item);
        }
    });
}

function handlerDialogScroll(content, item) {
    let dialogFull = $('#dialog-full');
    dialogFull.off('mousewheel').off('touchstart').off('touchmove');
    let title = content.find('.title.dialog');
    dialogFull.off('mousewheel').on('mousewheel', function(event) {
        let deltaY = event.deltaY || event.detail || event.wheelDelta || event.originalEvent.deltaY;
        let deltaX = event.deltaX || event.detail || event.wheelDelta || event.originalEvent.deltaX;
        if (deltaY < -20) { 
            isDialogFull = false;
            toggleDialogFull(isDialogFull, dialogFull.find('#dialog-content'));
        } else if (deltaY > 20) { 
            isDialogFull = true;
            toggleDialogFull(isDialogFull, dialogFull.find('#dialog-content'));
        } else if (deltaX > 20) {
            dialogNextItem();
        } else if (deltaX < -20) {
            dialogPrevItem();
        }
    });
}

function dialogNextItem() {
    if (hasDialog()) {
        let ind = parseInt($('#dialog-item').attr('item_pos'), 10) + 1;
        var nextItem = (ind < items.length) ? items[ind] : null;
        if (nextItem != null) {
            let newContent = getDialogFile(nextItem);
            newContent.css('transform', 'translateX(100%)');
            toggleDialogFull(isDialogFull, newContent.find('#dialog-content'));
            $('#dialog-item').css('transform', 'translateX(-100%)');
            $('#dialog-full').off('mousewheel');
            $('#dialog-full').append(newContent);
            setTimeout(function() {
                $('#dialog-item').remove();
                recreateDialogFull(newContent, nextItem);
            }, animDelay/2);
        }
    }
}
function dialogPrevItem() {
    if (hasDialog()) {
        let ind = parseInt($('#dialog-item').attr('item_pos'), 10) - 1;
        var prevItem = (ind >= 0) ? items[ind] : null;
        if (prevItem != null) {
            let newContent = getDialogFile(prevItem);
            toggleDialogFull(isDialogFull, newContent.find('#dialog-content'));
            newContent.css('transform', 'translateX(-100%)');
            $('#dialog-item').css('transform', 'translateX(100%)');
            $('#dialog-full').off('mousewheel');
            $('#dialog-full').append(newContent);
            setTimeout(function() {
                $('#dialog-item').remove();
                recreateDialogFull(newContent, prevItem);
            }, animDelay/2);
        }
    }
}

var timerDialogFull = new Timer(function() {
    $('#dialogImageFull').css('display', '');
}, animDelay + 100);
function toggleDialogFull(open, dialogContent) {
    let dialogFull = $('#dialog-full');
    let dialogInfo = dialogContent.find('#dialog-info');
    let dialogItem = $('#dialog-item');
    let dialogImage = $('#dialogImageFull');
    if (open) {
        if (!dialogFull.hasClass('height100')) {
            dialogImage.css('display', 'none');
            timerDialogFull.start();
        }
        dialogFull.addClass('height100');
        dialogContent.css('max-height', '90%');
    } else {
        if (dialogFull.hasClass('height100')) {
            dialogImage.css('display', 'none');
            timerDialogFull.start();
        }
        dialogFull.removeClass('height100');
        dialogContent.css('max-height', '');
    }
}
function createDialogUpload() {
    let container = $('<div class="flex" style="flex-direction:column; height: 100%;"></div>');
    
    let title = $('<div class="title dialog flex noselect"><span class="navbar-brand">'+str_upload+'</span></div>').append($('<div id="dialog-title-btns"></div>'));
    let content = $('<div class="flex" style="padding: 20px; overflow: hidden; height: 100%; justify-content: space-between;"></div>');
    let url = $('#btn-upload').attr("action");
    if ($('body').outerWidth() > 500) {
        let drop = $(`<form id="drop-zone" style="">
                <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color:var(--color-button-icon); flex-direction: column;">
                    ${svgUpload}
                    DROP ZONE
                </div>
            </form>`);
        drop.on('click', function() {
            $('input#uploadFilesElem').click();
        });
        content.append(drop);

        ['dragenter', 'dragover'].forEach(eventName => {
            drop.on(eventName, function(e) { 
                e.preventDefault();
                drop.attr("style","opacity: 1; color:var(--color-button-hover); border-style: dashed;");
                drop.find('svg').attr("style","width: 80%; height: 80%;");
            });
        });
        drop.on('dragleave', function(e) { 
            e.preventDefault();
            drop.attr("style","");
            drop.find('svg').attr("style","");
        });
        drop.on('drop', function(e) { 
            e.preventDefault();
            drop.attr("style","");
            drop.find('svg').attr("style","");
            let dt = e.originalEvent.dataTransfer.files;
            var arrFiles = [];
            for (var i = 0; i < dt.length; i++) {
                if (dt[i] instanceof File) {
                    console.log(dt[i].type)
                    arrFiles.push(dt[i])
                }
            }
            var filesToUpload = Array.from(arrFiles).filter(function(file) {
                return file.type !== "application/x-directory" && file.type !== "inode/directory";
            });
            if (filesToUpload.length != 0)  sendFiles(filesToUpload, url);
        });
    }
    let btnFiles = $(`<button type="button" tabindex="0" class="dialog space-item space-compact">
      <span role="img" class="space-item-icon">${svgFile}</span>
      <div class="space-item-text">${str_files}</div>
    </button>`);
    btnFiles.on('click', function() {
        $('input#uploadFilesElem').click();
    });
    let btnFolder = $(`<button type="button" tabindex="0" class="dialog space-item space-compact">
      <span role="img" class="space-item-icon">${svgFolder}</span>
      <div class="space-item-text">${str_folder}</div>
    </button>`);
    btnFolder.on('click', function() {
        $('input#uploadFolderElem').click();
    });
    //TODO proVersion
//    let btnUrl = $(`<button type="button" tabindex="0" class="dialog space-item space-compact">
//      <span role="img" class="space-item-icon">${svgLink}</span>
//      <div class="space-item-text">URL</div>
//    </button>`);
//    btnUrl.on('click', function() {
//        let callback = {positive: function() {return true;}, negative: function(){return true;}}
//        callback.positive = function(result) {
//            dialogAlertError('TODO uploadurl', btnUrl);
//            return true;
//        }
//        dialogAlertEdit('URL', '', str_upload, svgLink, callback, btnUrl);
//    });
    let btns = $(`<div class="flex wrap" style="flex-direction:column; flex: 3 0 auto; height: 100%;"></div>`).append(btnFiles).append(btnFolder);//.append(btnUrl)

    var isFolderUploadSupported = 'webkitdirectory' in document.createElement('input');
    if (isFolderUploadSupported) {
        content.append(btns);
    }
    
    createDialogFull(container.append(title).append(content));
}

function createDialogFile(item) {
    createDialogFull(getDialogFile(item), item);
}

var timerDialogPlayMedia = new Timer(function() {
    if (mediaElement != null)
        mediaElement.get(0).play();
}, 1200);
function getDialogFile(item) {
    clearRes();
    let svgIcon = !item.directory ? svgFile : (item.inside == '0' ? svgFolderEmpty : svgFolder);
    let ind = items.indexOf(item);
    let container = $(`<div item_pos="${ind}" id="dialog-item" class="flex" style=""></div>`);
    
    let btnRight = $(`<button type="button" role="tab" tabindex="0" class="space-item space-compact icon dialog ${(ind + 1) <= items.length - 1 ? '' : ' opacity-disable'}" style="margin:0">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-caret-right-fill" viewBox="0 0 16 16">
                  <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/>
                </svg>
            </button>`);
        btnRight.on('click', function() {
            dialogNextItem();
        });
    let btnLeft = $(`<button type="button" role="tab" tabindex="0" class="space-item space-compact icon dialog ${ind > 0 ? '' : ' opacity-disable'}" style="margin:0">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-caret-left-fill" viewBox="0 0 16 16">
                  <path d="m3.86 8.753 5.482 4.796c.646.566 1.658.106 1.658-.753V3.204a1 1 0 0 0-1.659-.753l-5.48 4.796a1 1 0 0 0 0 1.506z"/>
                </svg>
            </button>`);
        btnLeft.on('click', function() {
            dialogPrevItem();
        });


    let name = item.name;
    try {
      name = decodeURI(name);
    } catch (e) {}
    let url = item.url;
    let title = $(`<div class="title dialog flex noselect"><div class="navbar-brand">
            ${svgIcon}
            <p class="space-item-text" style="margin-left: 5px; width: 100%; overflow: hidden;">${name}</p>
        </div></div>`).append($('<div id="dialog-title-btns"></div>').append(btnLeft).append(btnRight));
    let content = $(`<div id="dialog-content" class="flex height100" style="transition: ${animDelay}ms linear"></div>`);

    let previewContent = $(svgIcon);
//    let previewContent = $(`<iframe width="100%" height="100%" src="${item.url}?type=iframe"></iframe>`);
//    let previewContent = $(`<embed src="${item.url}?type=iframe" type="${item.mimeType}" width="100%" height="100%">`);
    if (item.mimeType.startsWith('image')) {
        previewContent = $(`<img id="dialogImageFull" loading="eager" fetchpriority="high" style="object-fit: contain;"/>`);
        if (use_thumb) {
            previewContent.css('background-image', 'url(' + url + '?type=thumb)');
        }
        image = previewContent.get(0);
        image.src = url;
    } else if (isText(item.name)) {
        previewContent = $(`<iframe width="100%" height="100%" src="${url}?type=text"></iframe>`);
    } else if (item.mimeType.startsWith('audio')) {
        previewContent = $('<div id="audio-container"></div>');
        mediaElement = $(`<audio controls="" style="width: 100%;margin: auto;height: 100%;" name="media"><source src="${url}" type="audio/mpeg"></audio>`);
        canvas = $('<canvas id="audio-visualizer" width="500" height="150"></canvas>');
        mediaElement.off('canplay').on('canplay', function() {
            timerDialogPlayMedia.start();
        });

        var el = $('<div class="d-flex-column mediaview" style="background: transparent;"></div>');
        previewContent.append(canvas);
        previewContent.append(mediaElement);
        visualizeAudio(mediaElement.get(0), canvas.get(0));
    } else if (item.mimeType.startsWith('video')) {
        mediaElement = $(`<video style="width: 100%;height: 100%;" controls="" name="media">
            <source src="${url}" type="${item.mimeType}">
    		<source src="${url}" type="video/mp4; codecs=hevc">
    		<source src="${url}" type="video/mp4; codecs=vp9,opus">
    		<source src="${url}" type="video/mp4">
    		Your browser does not support HTML5 video.
        </video>`);
        previewContent = mediaElement;
        mediaElement.off('canplay').on('canplay', function() {
            timerDialogPlayMedia.start();
        });
    }

    content.append($(`<form id="dialog-preview" style=""></form>`)
        .append($(`<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color:var(--color-button-icon);"></div>`)
        .append(previewContent)));


    let btnOpen = $(`<button type="button" role="tab" tabindex="0" class="dialog-circle-icon space-item space-compact icon-tr${var_can_read ? '' : ' opacity-disable'}" data-original-title="${str_open}" data-toggle="tooltip">
                    ${svgOpen}
                    </button>`);
    btnOpen.off('click').on('click', function() {
        if (var_can_read) {
            $('#dialog-info').find('a')[0].click();
        } else {
            dialogAlertError(str_error_permission, btnOpen);
        }
    });
    let btnDownload = $(`<button type="button" role="tab" tabindex="0" class="dialog-circle-icon space-item space-compact icon-tr${var_can_read ? '' : ' opacity-disable'}" data-original-title="${!item.directory ? str_server_down : str_server_downzip}" data-toggle="tooltip">
                    ${item.directory? svgZip : svgDownload}
                    </button>`);
    btnDownload.off('click').on('click', function() {
        if (var_can_read) {
            if (!item.directory) {
                download(url);
            } else {
                downloadZip([item])
            }
        } else {
            dialogAlertError(str_error_permission, btnDownload);
        }
    });
    let btnRename = $(`<button type="button" role="tab" tabindex="0" class="dialog-circle-icon space-item space-compact icon-tr${var_can_write ? '' : ' opacity-disable'}" data-original-title="${str_server_rename}" data-toggle="tooltip">
                    ${svgEdit}
                    </button>`);
    btnRename.off('click').on('click', function() {
        if (var_can_write) {
            fileRename(item, btnRename);
        } else {
            dialogAlertError(str_error_permission, btnRename);
        }
    });
    let btnMove = $(`<button type="button" role="tab" tabindex="0" class="dialog-circle-icon space-item space-compact icon-tr${var_can_write ? '' : ' opacity-disable'}" data-original-title="${str_server_move}" data-toggle="tooltip">
                    ${svgMove}
                    </button>`);
    btnMove.off('click').on('click', function() {
        if (var_can_write) {
            let filesArr = [];
            filesArr.push(item);
            filesMove(filesArr, btnMove);
        } else {
            dialogAlertError(str_error_permission, btnRename);
        }
    });
    let btnDelete = $(`<button type="button" role="tab" tabindex="0" class="dialog-circle-icon space-item space-compact icon-tr${var_can_write ? '' : ' opacity-disable'}" data-original-title="${str_server_delete}" data-toggle="tooltip">
                    ${svgDelete}
                    </button>`);
    btnDelete.off('click').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (var_can_write) {
            fileDelete(item, btnDelete)
        } else {
            dialogAlertError(str_error_permission, btnDelete);
        }
    });
    let btns = $(`<div class="flex wrap"></div>`).append(btnOpen).append(btnRename).append(btnMove).append(btnDownload).append(btnDelete);

    let size_max = item.directory && !var_can_folder_size ? '' : `<span class="size_text">${item.size_max}</span>`;
    let itemContent = $(`<div class="flex wrap info"">
            <span class="name_text">${name}</span>
            <span class="size_text">${!item.directory ? item.mimeType : 'folder'}</span>
            ${size_max}
            <span class="size_text">${formatDate(item.date)}</span>
            <a href="${url}" target="_blank" class="size_text no-click">${url}</a>
        </div>`).append(btns).append(btns);
    let itemSumm = $(`<div id="dialog-info" class="flex wrap"></div>`).append(itemContent).append(btns);

    let t = $(`<div class="flex" style="transition: ${animDelay}ms linear; background: black;height: 10px;"></div>`);
    return container.append(title).append(content.append(itemSumm));
}

function hasDialogAlerts() {
    return $('body').find('.dialog.bg.alert').length > 0 || $('body').find('.alert-dialog').length > 0;
}
function hasDialogAlertOnly() {
    return $('body').find('.dialog.bg.alert').length > 0;
}
function removeDialogAlerts() {
    if (hasDialogAlerts() && $(`.alert-dialog.uncancabled`).length == 0) {
        let oldDialog = $('body').find('.alert-dialog.cancabled');
        $('.dialog.bg.alert').css('backdrop-filter', 'blur(0px)');
        $('.dialog.bg.alert').css('background-color', '');
//        oldDialog.css('transform', 'translate(-50%, -50%) scale(0)');
        oldDialog.css('opacity', '0');
//        if (oldDialog.attr('pos_y')) {
//            oldDialog.css('top', oldDialog.attr('pos_y') + 'px');
//            oldDialog.css('left', oldDialog.attr('pos_x') + 'px');
//        }
        $('body').find('.dialog.bg').css('transition', animDelay + 'ms linear');
        setTimeout(function() {
            $('body').find('.dialog.bg.alert').remove();
        }, animDelay);
    }
}
function removeDialogAlert(dialog) {
//    dialog.css('transform', 'translate(-50%, -50%) scale(0)');
    dialog.css('opacity', '0');
//    if (dialog.attr('pos_y')) {
//        dialog.css('top', dialog.attr('pos_y') + 'px');
//        dialog.css('left', dialog.attr('pos_x') + 'px');
//    }
    if ($(`.alert-dialog`).length == 1 || ($(`.alert-dialog`).length == 2 && $(`.alert-hidden`).length == 1)) {
        $('body').find('.dialog.bg').css('transition', animDelay + 'ms linear');
        $('.dialog.bg.alert').css('backdrop-filter', 'blur(0px)');
        $('.dialog.bg.alert').css('background-color', '');
    }
    setTimeout(function() {
        if ($(`.alert-dialog`).length == 1 || ($(`.alert-dialog`).length == 2 && $(`.alert-hidden`).length == 1)) {
            $('.dialog.bg.alert').remove()
        } else {
            dialog.remove();
        }
    }, animDelay);
}

function createDialogAlert(title, msg = undefined, btnOk = str_server_ok, btnCancel = str_server_cancel, cancabled = true, point, callback = undefined) {
    hideContextMenu();
//    let dialogFull = $(`<div class="alert-dialog ${cancabled? 'cancabled' : 'uncancabled'}" pos_x='${point.x}' pos_y='${point.y}' style="top:${point.y}px; left:${point.x}px; transform: translate(-50%, -50%) scale(0); opacity:0; transition: ${animDelay}ms linear; ${colorBgDialog}"></div>`);
    let dialogFull = createDialogAlertView(title, msg, btnOk, btnCancel, cancabled, point, callback);
    let dialogBg;
    if (!hasDialogAlertOnly()) {
        dialogBg = $('<div class="dialog bg alert"></div>').append(dialogFull);
        $('body').append(dialogBg);
        setTimeout(function() {
            $('body').find('.dialog.bg').css('transition', 'none');
        }, animDelay);
    } else {
        dialogBg = $('.dialog.bg.alert');
        let m = $(`.alert-dialog`).length;
        let hasHidden = $(`.alert-hidden`).length
        if (hasHidden > 0) m -= hasHidden;
        if (m > 0) {
            dialogFull.css('margin-top', m+'%');
            dialogFull.css('margin-left', m+'%');
        }
    }
    setTimeout(function() {
        dialogBg.css('backdrop-filter', 'blur(3px)');
        dialogBg.css('background-color', 'var(--color-shadow)');
//        dialogFull.css('transform', 'translate(-50%, -50%) scale(1)');
        dialogFull.css('opacity', '1');
        dialogFull.css('top', '');
        dialogFull.css('left', '');
    }, 50);
    dialogBg.append(dialogFull);
    dialogBg.off('click').on('click', function() {
        removeDialogAlerts();
    });
    return dialogFull;
}
function createDialogAlertView(title, msg = undefined, btnOk = str_server_ok, btnCancel = str_server_cancel, cancabled = true, point, callback = undefined) {
    let view = $(`<div class="alert-dialog ${cancabled? 'cancabled' : 'uncancabled'}" pos_x='${point.x}' pos_y='${point.y}' style="transform: translate(-50%, -50%) scale(1); opacity:0; transition: ${animDelay}ms linear;"></div>`);
    view.on('click', function(event) {
        hideContextMenu();
        event.stopPropagation();
    });
    view.append($(`<div class="alert-title"><span>${title}</span></div>`))
    if (msg != undefined && msg != '[object Object]') {
        view.append($(`<div class="alert-msg">${msg}</div>`))
    }
    let btnsView = $(`<div class="alert-btns flex noselect"></div>`);
    if (btnCancel != '' && btnCancel != undefined) {
        let btnCancelView = $(`<button type="button" tabindex="0" class="dialog space-item space-compact alert-btn-cancel">
          <div class="space-item-text">${btnCancel}</div>
        </button>`);
        btnCancelView.on('click', function() {
            if (callback != undefined) {
                if (callback.negative()) removeDialogAlert(view);
            }
        });
        btnsView.append(btnCancelView);
    }

    let btnOkView = $(`<button type="button" tabindex="0" class="dialog space-item space-compact alert-btn-ok">
      <div class="space-item-text">${btnOk || str_server_ok}</div>
    </button>`);
    btnOkView.on('click', function() {
        if (callback != undefined) {
            let result = $('.dialogEditable').text() || '';
            if (callback.positive(result)) {
                removeDialogAlert(view);
            }
        } else {
            removeDialogAlert(view);
        }
    });
    view.append(btnsView.append(btnOkView));
    return view;
}
function dialogAlertError(item, desc, view) {
    dialogAlertError(item, desc, view, undefined, undefined, undefined, undefined);
}
function dialogAlertError(item, view) {
    dialogAlertError(item, undefined, view, undefined, undefined, undefined, undefined);
}
function dialogAlertError(item, desc, view = undefined, btnOk = undefined, btnCancel = undefined, icon = undefined, callback = undefined) {
    let point = { x: $('body').outerWidth()/2, y: $('body').outerHeight()/2};
    if (view != undefined) {
        point.x = view.offset().left + view.outerWidth() / 2;
        point.y = view.offset().top + view.outerHeight() / 2;
    }
    let ic = icon || `<svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" fill="red" class="bi bi-exclamation-triangle-fill" viewBox="0 0 16 16">
                            <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/>
                          </svg>`
    let dialog = createDialogAlert(item, desc, btnOk || str_server_ok, btnCancel || undefined, false, point, callback);
    if (btnCancel == undefined) {
        dialog.find('button.alert-btn-cancel').remove();
    }
    dialog.find('.alert-title').prepend($(icon));
    // dialog.css('box-shadow', '0px 0px 20px 0px var(--color-error)');
}

function dialogAlertCustom(html, callback) {
    let point = { x: $('body').outerWidth()/2, y: $('body').outerHeight()/2};
    let dialog = createDialogAlert('', '', '', '', false, point, undefined);
    dialog.find('.alert-title').remove();
    dialog.find('.alert-btns').remove();
    dialog.find('.alert-msg').html(html);
    dialog.find('.alert-msg').css('padding-top', '20px');

    let btnCancel = $(`<button type="button" style="margin:0; position: absolute; top: 0; right: 0;" role="tab" tabindex="0" class="space-item space-compact icon dialog" data-original-title="${str_server_cancel}" data-toggle="tooltip">
            ${svgCancel}
        </button>`);
    btnCancel.off('click').on('click', function() {
        removeDialogAlert(dialog);
        if (callback != undefined) {
            callback.negative();
        }
    });
    dialog.append(btnCancel);
}

function dialogAlertEdit(title, subtitle, btnOk, icon, callback, view) {
    let point = { x: $('body').outerWidth()/2, y: $('body').outerHeight()/2};
    if (view != undefined) {
        point.x = view.offset().left + view.outerWidth() / 2;
        point.y = view.offset().top + view.outerHeight() / 2;
    }
    let dialog = createDialogAlert(title, subtitle, btnOk, undefined, true, point, callback);
    dialog.find('.alert-title').prepend($(icon));
    let editable = dialog.find('.alert-msg');
    editable.attr('contenteditable', 'true');
    editable.addClass('dialogEditable');
    editable.on('keydown', function(e) {
        if (e.keyCode === 13) {
            e.preventDefault();
            dialog.find('.alert-btn-ok').click();
        }
    });
    var els = document.getElementsByClassName("dialogEditable");
    Array.prototype.forEach.call(els, function(el) {
        focusAndPlaceCaretAtEnd(el);
    });
}

function dialogAlertFolders(files, btnOk, callback, view) {
    let point = { x: $('body').outerWidth()/2, y: $('body').outerHeight()/2};
    if (view != undefined) {
        point.x = view.offset().left + view.outerWidth() / 2;
        point.y = view.offset().top + view.outerHeight() / 2;
    }
    var filePath = files[0].url;
    if (filePath.endsWith('/')) {
        filePath = filePath.replace(/\/$/, '');
    }
    filePath = filePath.substring(0, filePath.lastIndexOf('/') + 0);
    let dialog = createDialogAlert(filePath, '', btnOk, undefined, true, point, callback);
    dialog.addClass("alert-folders");
    dialog.find('.alert-title').prepend($(svgFolder));
    let pathsArray = [];
    for (var i = 0; i < files.length; i++) {
        pathsArray.push(files[i].url.endsWith('/') ? files[i].url.replace(/\/$/, '') : files[i].url);
    }
    selectPath(dialog, filePath, pathsArray);
    dialog.find('.alert-btn-ok').off('click').on('click', function() {
        let nPath = dialog.find('.alert-title').attr('title');
        if (callback != undefined && filePath != nPath) {
            callback.positive(nPath);
            removeDialogAlert(dialog);
        }
    });
    return dialog;
}
function selectPath(dialog, path, originalPaths) {
    dialog.find('.alert-title span').text(path.split('').reverse().join(''));
    dialog.find('.alert-title').attr('title', path);
    let content = $('<div></div>');
    dialog.find('.alert-msg').html('');
    let filePath = originalPaths[0].endsWith('/') ? originalPaths[0] : originalPaths[0].substring(0, originalPaths[0].lastIndexOf('/') + 0);
    dialog.find('.alert-btn-ok').css('opacity', filePath == path ? 0.3 : 1)
    if (path.split('/').length > 2) {
        let backP = path.substring(0, path.lastIndexOf('/'));
        let backLink = $('<div class="folder-item back"></div>');
        let backLinkP = $('<p></p>');
        backLink.append(backLinkP);
        backLinkP.text('[....] ');
        backLink.off('click').on('click', function() {
            event.preventDefault();
            selectPath(dialog, backP, originalPaths);
        });
        content.append(backLink);
    }
    let item = findTreeData(dataTree.list, path);
    if (item != null) for (const child of item.list) {
        let childUrl = child.url.endsWith('/') ? child.url.replace(/\/$/, '') : child.url;
        if (child.directory && originalPaths.indexOf(childUrl) == -1) {
            let itemView = $(`<div class="folder-item${child.date == 'undefined' ? ' undefined' : ''}"></div>`);
            let icon = child.inside > 0 || child.date == 'undefined' ? svgFolder : svgFolderEmpty;
            itemView.append($(icon)).append($(`<p>${child.name}</p>`))
            content.append(itemView);
            itemView.off('click').on('click', function() {
                event.preventDefault();
                if (child.date != 'undefined') {
                    if (child.list.length !== 0 && child.lvl >= 3 && child.list[0].inside == -1) {
                        if (ajaxTreeCall != null && ajaxTreeCall != undefined) ajaxTreeCall.abort()
                        const url = mainDataTree == null ? '' : '&path=\'' + encodeURIComponent(path) + '\''
                        ajaxTreeCall = $.ajax({
                            url: '/api/files/tree?recursion=1' + url,
                            type: 'GET',
                            contentType: 'text/html',
                            processData: false,
                            success: function(data) {
                                try {
                                    insertTreeData(data, dataTree.list);
                                } catch (error) {
                                    console.error(error);
                                }
                                selectPath(dialog, childUrl, originalPaths);
                            },
                            error: function(xhr, status, error) {
                                console.error(error);
                            }
                        });
                    } else {
                        selectPath(dialog, childUrl, originalPaths);
                    }
                }
            });
        }
    }
    dialog.find('.alert-msg').append(content);
}

function visualizeAudio(audioElement, canvas) {
    var audioContext = new (window.AudioContext || window.webkitAudioContext)();
    var analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    var dataArray = new Uint8Array(analyser.frequencyBinCount);

    var source = audioContext.createMediaElementSource(audioElement);
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    function draw() {
        drawVisualization(ctx, canvas, analyser, dataArray);
        requestAnimationFrame(draw);
    }

    var ctx = canvas.getContext('2d');
    $(audioElement).off('play').on('play', function() {
        draw();
    });

    $(audioElement).off('pause').on('pause', function() {
        cancelAnimationFrame(draw);
    });
}

function drawVisualization(ctx, canvas, analyser, dataArray) {
    analyser.getByteFrequencyData(dataArray);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1b8dc4';
    ctx.strokeStyle = '#1b8dc4';
    ctx.lineWidth = 4;
    let x = 0;
    var barWidth = canvas.width / dataArray.length;

    for (var i = 0; i < dataArray.length; i++) {
        var barHeight = dataArray[i];
        ctx.beginPath();
        ctx.moveTo(4 + 2 * i * barWidth + barWidth / 2, 178 - barWidth / 2);
        ctx.lineTo(4 + 2 * i * barWidth + barWidth / 2, 178 - dataArray[i] * 0.65 - barWidth / 2);
        ctx.stroke();
    }
}

function createDialogIframe(link, view = undefined) {
    hideContextMenu();
    let point = { x: $('body').outerWidth()/2, y: $('body').outerHeight()/2};
    if (view != undefined) {
        point.x = view.offset().left + view.outerWidth() / 2;
        point.y = view.offset().top + view.outerHeight() / 2;
    }
//    let dialogFull = $(`<div class="alert-dialog cancabled iframe" pos_x='${point.x}' pos_y='${point.y}' style="top:${point.y}px; left:${point.x}px; transform: translate(-50%, -50%) scale(0); opacity:0; transition: ${animDelay}ms linear; ${colorBgDialog}"></div>`);
    let dialogFull = $(`<div class="alert-dialog cancabled iframe" pos_x='${point.x}' pos_y='${point.y}' style="transform: translate(-50%, -50%) scale(1); opacity:0; transition: ${animDelay}ms linear;"></div>`);
    let dialogBg;
    if (!hasDialogAlertOnly()) {
        dialogBg = $('<div class="dialog bg alert"></div>').append(dialogFull);
        $('body').append(dialogBg);
        setTimeout(function() {
            $('body').find('.dialog.bg').css('transition', 'none');
        }, animDelay);
    } else {
        dialogBg = $('.dialog.bg.alert');
    }
    setTimeout(function() {
        dialogBg.css('backdrop-filter', 'blur(3px)');
        dialogBg.css('background-color', 'var(--color-shadow)');
//        dialogFull.css('transform', 'translate(-50%, -50%) scale(1)');
        dialogFull.css('opacity', '1');
        dialogFull.css('top', '');
        dialogFull.css('left', '');
    }, 50);
    dialogBg.append(dialogFull);
    dialogFull.on('click', function(event) {
        hideContextMenu();
        event.stopPropagation();
    });
    dialogBg.off('click').on('click', function() {
        removeDialogAlerts();
    });
    let frame = $(`<iframe width="100%" height="100%" src="${link}"></iframe>`);
    frame.on('error', function() {
        removeDialogAlerts();
    });
    dialogFull.append(frame)

    return dialogFull;
}

var filesPercents = [];
function calculatePercents(callback) {
    let p = 0;
    for (var i = 0; i < filesPercents.length; i++) {
        p += parseFloat(filesPercents[i].percent);
    }
    const averagePercent = (p / filesPercents.length).toFixed(1);
    averagePercent
    callback(averagePercent);
}
var filesToUpload = [];
var ajaxToUpload = [];
var filesUploadedCount = 0;
var filesUploadCount = 0;
function createDialogUploadFiles(files, url) {
    var dialog = $('');
    if ($('#alert-upload').length == 0) {
        filesUploadCount = files.length;
        filesUploadedCount = 0;
        ajaxToUpload = [];
        filesPercents = [];
        filesToUpload = [];
        let point = { x: $('body').outerWidth()/2, y: $('body').outerHeight()/2};
        let callback = {positive: function() {return true;}, negative: function(){return true;}}
        dialog = createDialogAlertView(`${filesUploadedCount}/${filesUploadCount} 0.0%`, '', str_server_hide, str_server_cancel_all, false, point, callback);
        dialog.attr('id', 'alert-upload');
        dialog.addClass('alert-hidden');
        dialog.addClass('noselect');
        dialog.find('.alert-title').prepend(`<div class="svg">${svgUpload}</div>`);
        let btnHide = $(`<div id="upload-alert-hide" class="svg" style="cursor:pointer;">${svgDown}</div>`);
        btnHide.off('click').on('click', function() {
            if (dialog.hasClass('dialog-hide')) {
                dialog.css('top', '40%');
                dialog.css('left', '50%');
                btnHide.css('transform', 'none');
                dialog.off('click');
                setTimeout(function() {
                    dialog.removeClass('dialog-hide');
                    dialog.css('top', '');
                    dialog.css('left', '');
                    $('.dialog-hide').each(function(index) {
                        $(this).css('top', 'calc(100% - 70px - ' + (52 * index) + 'px)');
                    });
                }, animDelay/2);
            } else {
                dialog.addClass('dialog-hide');
                $('.dialog-hide').each(function(index) {
                    $(this).css('top', 'calc(100% - 70px - ' + (52 * index) + 'px)');
                });
                btnHide.css('transform', 'rotate(180deg)');
                setTimeout(function() {
                    dialog.off('click').on('click', function() {
                        btnHide.click();
                    });
                }, animDelay * 2);
            }
        });
        dialog.find('.alert-title').append(btnHide);
        callback.positive = function(result) {
            if (filesUploadedCount == filesUploadCount) {
                filesToUpload = [];
                ajaxToUpload = [];
                filesPercents = [];
                dialog.css('opacity', '0');
                setTimeout(function() {
                    dialog.remove();
                }, animDelay);
                if (filesUploadedCount != 0) {
                    let curLink = $('#btn-upload').attr('action')
                    if (url == curLink) loadDataApi(curLink);
                }
            } else {
                btnHide.click()
            }
            return false;
        }
        callback.negative = function(result) {
            for (var i = 0; i < ajaxToUpload.length; i++) {
                let ajaxUploadCancel = ajaxToUpload[i];
                if (ajaxUploadCancel != null && ajaxUploadCancel != undefined) ajaxUploadCancel.abort();
                ajaxUploadCancel = null;
            }
            filesToUpload = [];
            filesPercents = [];
            ajaxToUpload = [];
            dialog.css('opacity', '0');
            setTimeout(function() {
                dialog.remove();
            }, animDelay);
            if (filesUploadedCount != 0) {
                let curLink = $('#btn-upload').attr('action')
                if (url == curLink) loadDataApi(curLink);
            }
            return false;
        }
        $('body').append(dialog);
        setTimeout(function() {
            dialog.css('opacity', '1');
            dialog.css('width', dialog.outerWidth()+'px');
        }, 50);
    } else {
        dialog = $('#alert-upload');
        filesUploadCount += files.length;
        if (dialog.hasClass('dialog-hide')) {
            dialog.find('#upload-alert-hide').click();
        }
        dialog.find('.alert-btn-cancel').css('display', 'block');
        dialog.find('.alert-btn-ok .space-item-text').text(str_server_hide);
    }

    let content = dialog.find('.alert-msg');
    let titleView = dialog.find('.alert-title span');
    content.addClass('noselect');
    for (var i = 0; i < files.length; i++) {
        let file = files[i];
        let percent = {id: i, fileUrl: url + file.name, percent: 0};
        filesToUpload.push(file);
        filesPercents.push(percent);
        let fileView = $(`<div id="upload-item-${i}" pos="${i}" path="${url}" title="${file.name} [${byteToMax(file.size)}] [${file.type}]" name="${file.name}" class="dataview_item list flex" type="button" tabindex="0" style="cursor: default;">
                <span class="icon fmanager_icon list">${svgFile}</span>
                <div class="fmanager_card_panel list">
                    <span class="name_text">${file.name}</span>
                    <span class="size_text">${url.endsWith('/') ? url : (url + '/')}${file.webkitRelativePath || file.name}</span>
                    <span class="item-progress">0.0% / ${byteToMax(file.size)}</span>
                </div>
                <div class="m-icon file-settings list">${svgCancel}</div>
            </div>`);
        let progress = fileView.find('.item-progress');
        let dataItems = new FormData();
        dataItems.append('path', url);
        dataItems.append('files[]', file);
        let ajaxUpload = null;
        let xhrFun = function() {
            let xhr = new window.XMLHttpRequest();
            xhr.upload.addEventListener('progress', function(evt) {
                if (evt.lengthComputable) {
                    percent.percent = ((evt.loaded / evt.total) * 100).toFixed(1);
                    progress.css('background-size', percent.percent + '% 100%');
                    progress.text(percent.percent + `% / ${byteToMax(file.size)}`);
                    if (percent == "100.0") {
                        fileView.addClass('bg-success');
                        if (filesToUpload.indexOf(file) > -1) {
                            filesUploadedCount += 1;
                            filesToUpload.splice(filesToUpload.indexOf(file), 1);
                        }
                    }
                    calculatePercents(function(p) {
                        titleView.text(`${filesUploadedCount}/${filesUploadCount} (${p}%)`);
                    });
                } else {
                    console.error('error lengthComputable :'+evt.lengthComputable);
                    fileView.addClass('bg-error');
                }
            }, false);
            xhr.upload.addEventListener('abort', function(evt) {}, false);
            return xhr;
        }
        let successFun = function(data) {
            fileView.find('.m-icon.file-settings').html(svgCancel);
            if (ajaxToUpload.indexOf(ajaxUpload) > -1) {
                ajaxToUpload.splice(ajaxToUpload.indexOf(ajaxUpload), 1);
            }
            ajaxUpload = null;
            fileView.addClass('bg-success');
            if (filesToUpload.indexOf(file) > -1) {
                filesUploadedCount += 1;
                filesToUpload.splice(filesToUpload.indexOf(file), 1);
                calculatePercents(function(p) {
                    titleView.text(`${filesUploadedCount}/${filesUploadCount} (${p}%)`);
                });
            }
            if (filesToUpload.length == 0) {
                dialog.find('.alert-btn-cancel').css('display', 'none');
                dialog.find('.alert-btn-ok .space-item-text').text(str_server_ok);
                if (dialog.hasClass('dialog-hide')) {
                    dialog.find('#upload-alert-hide').click();
                }
            }
        }
        let errorFun = function(xhr, status, error) {
            if (ajaxToUpload.indexOf(ajaxUpload) > -1) {
                ajaxToUpload.splice(ajaxToUpload.indexOf(ajaxUpload), 1);
            }
            if (status != 'abort') {
                console.error('error - [' + xhr.responseText + '] status - ['+ status +'] error - ['+ error +']');
//                fileView.find('.m-icon.file-settings').css('opacity', '0');
//                fileView.find('.m-icon.file-settings').addClass('no-click');
                fileView.find('.m-icon.file-settings').html(svgReload);
                fileView.find('span.size_text').text(error);
                fileView.addClass('bg-error');
            }
            if (filesToUpload.indexOf(file) > -1) {
                filesUploadCount -= 1;
                filesToUpload.splice(filesToUpload.indexOf(file), 1);
                filesPercents.splice(filesPercents.indexOf(percent), 1);
            }
            calculatePercents(function(p) {
                titleView.text(`${filesUploadedCount}/${filesUploadCount} (${p}%)`);
            });
            if (filesToUpload.length == 0) {
                dialog.find('.alert-btn-cancel').css('display', 'none');
                dialog.find('.alert-btn-ok .space-item-text').text(str_server_ok);
                if (dialog.hasClass('dialog-hide')) {
                    dialog.find('#upload-alert-hide').click();
                }
            }
            ajaxUpload = null;
        }
        ajaxUpload = ajaxUploadCall( dataItems, xhrFun, successFun, errorFun);
        ajaxToUpload.push(ajaxUpload);
        fileView.find('.m-icon.file-settings').on('click', function() {
            if ($(this).parent().hasClass('bg-error')) {
                $(this).parent().removeClass('bg-error');
                filesToUpload.push(file);
                percent.percent = 0;
                filesPercents.push(percent);
                // filesUploadedCount -= 1;
                filesUploadCount += 1;
                calculatePercents(function(p) {
                    titleView.text(`${filesUploadedCount}/${filesUploadCount} (${p}%)`);
                });
                ajaxUpload = ajaxUploadCall( dataItems, xhrFun, successFun, errorFun);
                ajaxToUpload.push(ajaxUpload);
                fileView.find('.m-icon.file-settings').html(svgCancel);
            } else {
                $(this).parent().remove();
                if (ajaxToUpload.indexOf(ajaxUpload) > -1) {
                    ajaxToUpload.splice(ajaxToUpload.indexOf(ajaxUpload), 1);
                }
                if (ajaxUpload != null && ajaxUpload != undefined) ajaxUpload.abort();
                ajaxUpload = null;
                if (filesToUpload.indexOf(file) > -1) {
                    filesUploadCount -= 1;
                    filesToUpload.splice(filesToUpload.indexOf(file), 1);
                    filesPercents.splice(filesPercents.indexOf(percent), 1);
                }
                if (filesToUpload.length == 0) {
                    dialog.find('.alert-btn-cancel').css('display', 'none');
                    dialog.find('.alert-btn-ok .space-item-text').text(str_server_ok);
                }
                calculatePercents(function(p) {
                    titleView.text(`${filesUploadedCount}/${filesUploadCount} (${p}%)`);
                });
                if (dialog.find('.dataview_item').length == 0) {
                    filesToUpload = [];
                    filesPercents = [];
                    ajaxToUpload = [];
                    dialog.css('opacity', '0');
                    setTimeout(function() {
                        dialog.remove();
                    }, animDelay);
                    if (filesUploadedCount != 0) {
                        let curLink = $('#btn-upload').attr('action')
                        if (url == curLink) loadDataApi(curLink);
                    }
                }
            }
        });
        content.append(fileView);
    }
    calculatePercents(function(p) {
        titleView.text(`${filesUploadedCount}/${filesUploadCount} (${p}%)`);
    });
}

function ajaxUploadCall(dataItems, xhrFun, successFun, errorFun) {
    return $.ajax({
        xhr: xhrFun,
        url: '/api/files/upload',
        type: 'POST',
        data: dataItems,
        contentType: false,
        processData: false,
        success: successFun,
        error: errorFun
    });
}

function byteToMax(byte) {
    byte = parseFloat(byte);
    if (isNaN(byte) || byte == null || byte == undefined || byte == 0) return "0 b";
    var result = byte + " b";
    if (byte > 1024) {
        var kb = byte / 1024;
        result = kb.toFixed(2) + " Kb";
        if (kb > 1024) {
            var mb = kb / 1024;
            result = mb.toFixed(2) + " Mb";
            if (mb > 1024) {
                var gb = mb / 1024;
                result = gb.toFixed(2) + " Gb";
            }
        }
    }
    return result;
}

function dialogServLogin() {
    if ($('body').find('#dialog-login').length <= 0) {
        let bg = null;
        if ($('body').find('.dialog.bg.alert').length > 0) {
            bg = $('body').find('.dialog.bg.alert');
        } else {
            bg = $('<div class="dialog bg alert" style="backdrop-filter: blur(3px); background-color: var(--color-shadow); transition: none 0s ease 0s;"></div>');
            $('body').append(bg);
        }
        let dialog = $(`
            <div id="dialog-login" class="alert-dialog uncancabled" style="transform: translate(-50%, -50%) scale(1); opacity: 1; transition: all 150ms linear 0s;">
                <div class="alert-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
                      <path fill-rule="evenodd" d="M8 0c-.69 0-1.843.265-2.928.56-1.11.3-2.229.655-2.887.87a1.54 1.54 0 0 0-1.044 1.262c-.596 4.477.787 7.795 2.465 9.99a11.8 11.8 0 0 0 2.517 2.453c.386.273.744.482 1.048.625.28.132.581.24.829.24s.548-.108.829-.24a7 7 0 0 0 1.048-.625 11.8 11.8 0 0 0 2.517-2.453c1.678-2.195 3.061-5.513 2.465-9.99a1.54 1.54 0 0 0-1.044-1.263 63 63 0 0 0-2.887-.87C9.843.266 8.69 0 8 0m0 5a1.5 1.5 0 0 1 .5 2.915l.385 1.99a.5.5 0 0 1-.491.595h-.788a.5.5 0 0 1-.49-.595l.384-1.99A1.5 1.5 0 0 1 8 5"></path>
                    </svg>
                    <span>${str_login_to}</span>
                </div>
                <div class="flex">
                    <input class="alert-msg dialogEditable login" type="text" placeholder="${str_login}">
                    <input class="alert-msg dialogEditable pass" type="password" placeholder="${str_pass}">
                </div>
                <div class="alert-btns flex noselect">
                    <button id="btn-login" type="button" tabindex="0" class="dialog space-item space-compact alert-btn-ok">
                        <div class="space-item-text">${str_login}</div>
                    </button>
                </div>
            </div>`);
        dialog.find('#btn-login').off('click').on('click', function() {
            login();
        });
        dialog.find('input.dialogEditable').off('keydown').on('keydown', function(e) {
            if (e.keyCode === 13) {
                e.preventDefault();
                login();
            }
        });
        bg.append(dialog);
    }
}

function createDialogZip(files, p) {
    var socketZip = null;
    var filename = 'HttpFs-files-' + files.length + '.zip'
    var protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    var chunks = [];
    var namesArray = [];
    var totalSize = 0;

    for (var i = 0; i < files.length; i++) {
        namesArray.push(files[i].name)
    };

    let point = { x: $('body').outerWidth()/2, y: $('body').outerHeight()/2};
    let callback = {positive: function() {return true;}, negative: function(){return true;}}
    let dialog = createDialogAlertView(`Zip: (0/${files.length})... 00%`, 'Preparation', str_server_hide, str_server_cancel, false, point, callback);
    //dialog.attr('id', 'alert-upload');
    dialog.addClass('alert-hidden');
    dialog.addClass('noselect');
    dialog.find('.alert-title').prepend(`<div class="svg">${svgZip}</div>`);
    let btnHide = $(`<div class="svg" style="cursor:pointer;">${svgDown}</div>`);
    btnHide.off('click').on('click', function() {
        if (dialog.hasClass('dialog-hide')) {
            dialog.css('top', '40%');
            dialog.css('left', '50%');
            btnHide.css('transform', 'none');
            dialog.off('click');
            setTimeout(function() {
                dialog.removeClass('dialog-hide');
                dialog.css('top', '');
                dialog.css('left', '');
                $('.dialog-hide').each(function(index) {
                    $(this).css('top', 'calc(100% - 70px - ' + (52 * index) + 'px)');
                });
            }, animDelay/2);
        } else {
            dialog.addClass('dialog-hide');
            $('.dialog-hide').each(function(index) {
                $(this).css('top', 'calc(100% - 70px - ' + (52 * index) + 'px)');
            });
            btnHide.css('transform', 'rotate(180deg)');
            setTimeout(function() {
                dialog.off('click').on('click', function() {
                    btnHide.click();
                });
            }, animDelay * 2);
        }
    });
    dialog.find('.alert-title').append(btnHide);
    callback.positive = function(result) {
        btnHide.click()
        return false;
    }
    callback.negative = function(result) {
        if (socketZip != null) socketZip.close();
        socketZip = null;
        dialog.css('opacity', '0');
        setTimeout(function() {
            dialog.remove();
        }, animDelay);
        return false;
    }
    $('body').append(dialog);
    setTimeout(function() {
        dialog.css('opacity', '1');
        dialog.css('width', dialog.outerWidth()+'px');
    }, 50);

    let content = dialog.find('.alert-msg');
    let titleView = dialog.find('.alert-title span');
    content.addClass('noselect');
    socketZip = new WebSocket(protocol + window.location.host + '/api/files/download-zip');
    socketZip.onopen = function(event) {
        socketZip.send(JSON.stringify({ names: namesArray, path: p }));
    };
    socketZip.onmessage = function(event) {
        if (event.data instanceof ArrayBuffer) {
            dialogAlertError('Error ZIP', 'Wrong data [ArrayBuffer]', undefined);
            setTimeout(function() {
                callback.negative();
            }, 1000);
        } else if (event.data instanceof Blob) {
            chunks.push(event.data);
        } else {
            var data = JSON.parse(event.data);
            if (data && data.progress !== undefined) {
                if (data.progress.indexOf("%") >= 0) {
                    titleView.text(data.progress);
                }
                content.text(data.progress);
            } else if (data && data.error !== undefined) {
                dialogAlertError('Error ZIP', data.error, undefined);
                createDialogWarn(el, str_server_ok);
                content.text(data.error);
                setTimeout(function() {
                    callback.negative();
                }, 1000);
            }
            if (data && data.filename !== undefined) {
                filename = data.filename;
                totalSize = data.totalSize;
                var blob = new Blob(chunks);
                var downloadLink = document.createElement('a');
                downloadLink.href = URL.createObjectURL(blob);
                downloadLink.download = filename;
                downloadLink.click();
                URL.revokeObjectURL(downloadLink.href);
                setTimeout(function() {
                    callback.negative();
                }, 1000);
            }
        }
    };
    socketZip.onclose = function(event) {
        socketZip = null;
    };
}