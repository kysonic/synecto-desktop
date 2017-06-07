/**
 * It is an entry point of entire Designmapp
 * Here we go with windows, keys, trays and another stuff.
 */

const electron = require('electron');
const {app, globalShortcut, BrowserWindow, Menu, Tray} = electron;
const osLocale = require('os-locale');
const locales = {
    ru: require('./locales/ru.json'),
    en: require('./locales/en.json')
}

const axios = require('axios');

const electronGoogleOauth = require('electron-google-oauth');

let browserLanguage = 'en';

osLocale().then(locale => browserLanguage=locale.substr(0,2));

// Configs
app.setName('Designmap');

const path = require('path');
const url = require('url');
const config = require('./config');

const WINDOW_DIMS = {width: 400,height:390};

const os = /^win/.test(process.platform) ? 'win':'mac';

const HOT_KEYS = {
    win: {
        makeFullScreenShot: 'PrintScreen',
        makeFramedScreenShot: 'Ctrl+PrintScreen',
        uploadFiles: 'Ctrl+Alt+U'
    },
    mac: {
        makeFullScreenShot: 'Cmd+4',
        makeFramedScreenShot: 'Cmd+Option+4',
        uploadFiles: 'Cmd+Option+U'
    }
}

// Data store

const db = require('./main/db');

let tray = null;
let system = null;
let user = null;
let screen = 'login';

db.loadDatabase(async (err)=>{
    if(err) throw new Error(err);
    system = await db.findOneAsync({system:true});
    if(!system) system = await db.insertAsync({system: true, account: false, language: browserLanguage});
    if(!system.account) return this.showLoginForm();
    user = await db.findOneAsync({user:true,_userId:system.account});
    this.showToolbar();
});



// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow,
    overlayWindow



const createWindow =  ()=>{
    // Create the browser window.
    mainWindow = new BrowserWindow({width: WINDOW_DIMS.width, height: WINDOW_DIMS.height, show:false, frame: false, resizable: true})

    // and load the index.html of the main.
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, './renderer/index.html'),
        protocol: 'file:',
        slashes: true
    }))

    //mainWindow.webContents.openDevTools()
    // ShortCuts
    globalShortcut.register(HOT_KEYS[os].makeFullScreenShot,()=>mainWindow.webContents.send('makeSnapshot'));
    globalShortcut.register(HOT_KEYS[os].makeFramedScreenShot,()=>mainWindow.webContents.send('makeFramedSnapshot'));
    /*globalShortcut.register(HOT_KEYS[os].uploadFiles,()=>mainWindow.webContents.send('uploadFiles'));*/

    mainWindow.webContents.on('did-finish-load',()=>{
        mainWindow.webContents.send('appChange','system',system);
        mainWindow.webContents.send('appChange','user',user);
        mainWindow.webContents.send('appChange','screen',screen);
        mainWindow.webContents.send('appChange','browserLanguage',browserLanguage);
        mainWindow.webContents.send('appChange','config',config);
        mainWindow.center();
    });

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your main supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
    })

    // Emitted when the window is closed.
    mainWindow.on('blur', function () {
        if(user) mainWindow.hide();
    })
}


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
})

app.on('activate', function () {
    // On OS X it's common to re-create a window in the main when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    }
});

function showLoginForm(){
    mainWindow.center();
    mainWindow.setSize(470,575);
    mainWindow.show();
    tray?tray.destroy():null;
}

module.exports.logout = async function(){
    await db.updateAsync({_id:system._id},{$set:{account:false}});
    showLoginForm();
    mainWindow.webContents.send('appChange','user',null);
    mainWindow.webContents.send('appChange','screen','login');
    app.dock.show();
}

module.exports.showLoginForm = showLoginForm.bind(this);

module.exports.showToolbar = function(){
    mainWindow.hide();
    this.setupTray();
    mainWindow.setSize(400,390);
    screen="toolbar";
}

module.exports.setupTray = function(){
    tray = new Tray(path.join(__dirname,'../assets/images/tray.png'));
    const contextMenu = Menu.buildFromTemplate([
        {label: _translate('Open dashboard'), type: 'normal',click: this.openDashBoard},
        {label: _translate('Take a shot'), accelerator: HOT_KEYS[os].makeFullScreenShot, type: 'normal',click: ()=>{mainWindow.webContents.send('makeSnapshot');}},
        {label: _translate('Take a framed shot'), accelerator: HOT_KEYS[os].makeFramedScreenShot, type: 'normal',click: ()=>{mainWindow.webContents.send('makeFramedSnapshot');}},
        /*{label: _translate('Upload files'), accelerator: HOT_KEYS[os].uploadFiles, type: 'normal',click: ()=>{mainWindow.webContents.send('uploadFiles');}},*/
        {label: _translate('Logout'), type: 'normal',click: this.logout },
        {label: _translate('Exit'), type: 'normal', click:()=>{app.quit();}}
    ]);

    tray.setToolTip('Designmap');
    tray.setContextMenu(contextMenu);

    tray.on('right-click', this.openDashBoard);
    app.dock.hide();
}

module.exports.createOverlayWindow = function(){
    const {width, height} = electron.screen.getPrimaryDisplay().workAreaSize
    overlayWindow = new BrowserWindow({fullscreen:false, width: width, height: height, show:true, transparent:true, frame: false, resizable: false});
    overlayWindow.loadURL(url.format({
        pathname: path.join(__dirname, './renderer/overlay.html'),
        protocol: 'file:',
        slashes: true
    }));
    // Clean up
    overlayWindow.on('closed', function () {
        overlayWindow = null
    });
};

module.exports.makeFramedScreenShot = function(data) {
    mainWindow.webContents.send('makeFramedScreenShot', data);
}
module.exports.closeOverlayWindow = function(data){
    overlayWindow.destroy();
}
module.exports.hideMainWindow = function(){
    mainWindow.hide();
}
module.exports.showMainWindow = function(){
    mainWindow.show();
}
module.setLoadingSize = function(){
    mainWindow.setSize(200,200);
}
module.setToolbarSize = function(){
    mainWindow.setSize(400,390);
}
module.exports.hideOverlayWindow = function(){
    overlayWindow.hide();
}
module.exports.openDashBoard = function(){
    const {x,y,width} = tray.getBounds();
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    mainWindow.setPosition(x-WINDOW_DIMS.width+20,y-WINDOW_DIMS.height);
}

function _translate(msg) {
    const translated = locales[system.language][msg];
    return translated?translated.message:msg;
}

const browserWindowParams = {
    'use-content-size': true,
    center: true,
    show: true,
    resizable: false,
    'always-on-top': true,
    'standard-window': true,
    'auto-hide-menu-bar': true,
    'node-integration': false
};



module.exports.gogoleSignIn = async function(){
    let goaData = await db.findOneAsync({'goa':true});
    if(!goaData) goaData = await _fetchGoaData();
    const response = await axios.get(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${goaData.access_token}`);
    return response.data;
}

async function _fetchGoaData(){
    const googleOauth = electronGoogleOauth(browserWindowParams);
    // retrieve access token and refresh token
    const goaData = await googleOauth.getAccessToken(
        ['https://www.googleapis.com/auth/plus.me',
         'https://www.googleapis.com/auth/userinfo.profile',
         'openid','email','profile'
        ],
        '32127497436-69kgln3ll1ch0p8mhjcgqqv1c6c72h06.apps.googleusercontent.com',
        'cg_-cpgzt3xgemmquOmvNq5L'
    );
    // Save creds in db
    await db.updateAsync({'goa':true},Object.assign({goa:true},goaData),{upsert:true});
    return goaData;
}




