const $ = jQuery = require('jquery');
const admzip = require('adm-zip');
const randstr = require("randomstring");
const asciidoctor = require('asciidoctor.js')();

const fs  = require('fs');
const os  = require('os');
const path  = require('path');
const shell = require('electron').shell;

const options = {safe: 'unsafe', doctype: 'article', header_footer: true, attributes: ['copycss']};

var randstrOpts = {length:6, capitalization:"lowercase"};
var textRenderers = {};
var toDelete = [];

var fileLoaders = {};

// Deletes the given file or directory.
var rm = (item) => {
    try {
        var stat = fs.statSync(item);
        if(stat.isFile()){
            fs.unlinkSync(item);
        } else if(stat.isDirectory()){
            rmdir(item);
        }
    } catch (err) {
        // TODO: Ignoring for now...
    }
}

// Taken from `http://stackoverflow.com/a/31918120/789078`.
var rmdir = (dir) => {
    var list = fs.readdirSync(dir);
    for (var i = 0; i < list.length; i++) {
        var filename = path.join(dir, list[i]);
        var stat = fs.statSync(filename);
        if(filename == "." || filename == "..") {
            // Ignore special names.
        } else if(stat.isFile()){
            fs.unlinkSync(filename);
        } else if(stat.isDirectory()) {
            rmdir(filename);
        }
    }
    fs.rmdirSync(dir);
};

var cleanUp = () => {
    for (let i of toDelete) {
        rm(i);
    }
    toDelete = [];
}

var makeTmpDir = (name="") => {
    if(!name) {
        name = "doctrine-"
        name += randstr.generate(randstrOpts);
    }
    dpath = path.join(os.tmpdir(), name);
    fs.mkdirSync(dpath);
    toDelete.push(dpath);
    return(dpath);
}

var renderMarkDown = (text) => {
}

var renderAsciiDoc = (text) => {
    text = text.toString('utf8');
    var output = asciidoctor.convert(text, options);
    return(output);
}

var setTitle = (txt) => {
    $("#title").html(txt);
}

var updateSidebar = (fpath) => {
    var base = path.basename(fpath);
    $("#sidebar > a").each(function () {
        if (base == $(this).text()) {
            $(this).addClass("active");
        } else {
            $(this).removeClass("active");
        }
        // console.log($(this));
    });
}

var setSidebar = (items, title) => {
    var sidebar = $("#sidebar");
    sidebar.empty();
    sidebar.append(`<h5 class="nav-group-title">${title}</h5>`);
    for (var i = 0; i < items.length; i++) {
        const item = items[i];
        var attrs = "nav-group-item";
        if (item.active) {
            attrs = attrs.concat(" active");
        }
        fpath = escape(item.fpath);
        // TODO: Consider replacing with `loadFile()`.
        sidebar.append(`<a class="${attrs}" onclick="loadTextFile('${fpath}', true);">${item.name}</a>`);
    }
    sidebar.show();
}

var initSidebar = (dpath, title) => {
    const items = fs.readdirSync(dpath);
    console.log(items);
    var rendered = false;
    baritems = [];
    for (var i = 0; i < items.length; i++) {
        const ipath = path.join(dpath, items[i]);
        const ext = path.extname(ipath);
        if (ext in textRenderers) {
            baritems.push({name:items[i], fpath:ipath, active:false});
        } else {
            continue;
        }
        if (rendered) {
            continue;
        }
        if (loadFile(ipath, false)) {
            rendered = true;
            baritems[baritems.length - 1].active = true;
        }
    }
    setSidebar(baritems, title);
    return rendered;
}

var loadZipFile = (fpath) => {
    const zip = new admzip(fpath);
    const tpath = makeTmpDir();
    zip.extractAllTo(tpath);
    process.chdir(tpath);
    return initSidebar(tpath, "Archive Contents");
}

var loadTextFile = (fpath, fromsidebar=false) => {
    fpath = unescape(fpath);
    const webview = document.getElementById('rendered');
    const ext = path.extname(fpath);
    if (!(ext in textRenderers)) {
        return false;
    }

    const dir = path.dirname(fpath);
    process.chdir(dir);
    const text = fs.readFileSync(fpath);
    const name = path.join(dir, "__temp-doctrine-" + randstr.generate(randstrOpts) + ".html");
    const output = textRenderers[ext](text);
    toDelete.push(name);
    fs.writeFileSync(name, output);
    webview.loadURL("file:///" + name);
    setTitle(path.basename(fpath));
    if (fromsidebar) {
        updateSidebar(fpath);
    } else {
        $("#sidebar").hide();
    }
    return true;
}

var loadDirectory = (dpath) => {
    return initSidebar(dpath, "Directory Contents");
}

var loadFile = (fpath, clean=true) => {
    var ext = path.extname(fpath);
    if (fs.statSync(fpath).isDirectory()) {
        ext = "dir";
    }
    if (!(ext in fileLoaders)) {
        return false;
    }
    if (clean) {
        cleanUp();
    }
    $('#rendered').empty().html("Loading...");
    return fileLoaders[ext](fpath);
}

var setupWindow = () => {
    window.ondragover = () => {
        return false;
    }
    window.ondragleave = window.ondragend = () => {
        return false;
    }
    window.ondrop = (evt) => {
        evt.preventDefault();
        for (let f of evt.dataTransfer.files) {
            if(loadFile(f.path)) {
                break;
            }
        }
    }
    window.onbeforeunload = (evt) => {
        cleanUp();
    }
    $("#sidebar").hide();
}

const setupWebview = () => {
    const webview = document.getElementById('rendered');
    webview.addEventListener('will-navigate', (evt) => {
        // console.log(`link ${evt.url}`);
        // Order is important or URL will open in both external browser and webview!
        if(evt.url.startsWith("file:///")) {
            loadFile(evt.url.slice(8))
        } else {
            shell.openExternal(evt.url); // Must be first!
            webview.stop(); // Must be second!
        }
        // evt.preventDefault(); // Has no effect...
    });
}

$(document).on('click', 'a[href^="http"]', function(evt) {
    evt.preventDefault();
    shell.openExternal(this.href);
});

$(document).ready(() => {
    fileLoaders['dir'] = loadDirectory;
    fileLoaders['.zip'] = loadZipFile;
    fileLoaders['.txt'] = loadTextFile;
    // fileLoaders['.md'] = loadTextFile;
    textRenderers['.txt'] = renderAsciiDoc;
    textRenderers['.md'] = renderMarkDown;
    setupWindow();
    setupWebview();
});
