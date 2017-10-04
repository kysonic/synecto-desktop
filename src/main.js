/**
 * It is an entry point of entire Syenctoapp
 * Here we go with windows, keys, trays and another stuff.
 */
const electron = require("electron");
const {app, globalShortcut, BrowserWindow, Menu, Tray, dialog} = electron;
const {autoUpdater} = require("electron-updater");
const osLocale = require("os-locale");
const co = require('co');

const locales = {
    ru: require('../assets/locales/ru.json'),
    en: require('../assets/locales/en.json')
}
const axios = require('axios');
const gapi = require('./main/gapi');

let browserLanguage = 'en';

osLocale().then(locale => browserLanguage=locale.substr(0,2));

const isDev = process.defaultApp || /[\\/]electron-prebuilt[\\/]/.test(process.execPath) || /[\\/]electron[\\/]/.test(process.execPath);

// Configs
app.setName('Syencto');

const path = require('path');
const url = require('url');
const config = require('./config');

const WINDOW_DIMS = {width: 400,height:390};

const os = /^win/.test(process.platform) ? 'win':'mac';

config.os = os;

const HOT_KEYS = {
    win: {
        makeFullScreenShot: 'PrintScreen',
        makeFramedScreenShot: 'Ctrl+PrintScreen',
    },
    mac: {
        makeFullScreenShot: 'Cmd+4',
        makeFramedScreenShot: 'Cmd+Option+4'
    }
}

// Auto updating
const appVersion = require('../package.json').version;
const updateFeedUrl = `${config.updateServerUrl}/app/updates/latest`;


// Data store

const db = require('./main/db');

let tray = null;
let system = null;
let user = null;
let screen = 'login';

db.loadDatabase(co.wrap(function * (err) {
    if(err) throw new Error(err);
    system = yield db.findOneAsync({system:true});
    if(!system) system = yield db.insertAsync({system: true, account: false, language: browserLanguage});
    if(!system.account) return showLoginForm();
    user = yield db.findOneAsync({user:true,_userId:system.account});
    showToolbar();
    if(isDev) return;
    // Check updates after a few seconds after start
    autoUpdater.checkForUpdates();
    autoUpdater.on('update-downloaded', (ev, info) => {
        // Wait 5 seconds, then quit and install
        // In your application, you don't need to wait 5 seconds.
        // You could call autoUpdater.quitAndInstall(); immediately
        setTimeout(function() {
            const choice = dialog.showMessageBox(
                {
                    type: 'question',
                    buttons: [_translate('Yes'), _translate('No')],
                    title: _translate('New Release'),
                    message: _translate('Do yo want to update?')
                });

            if(choice==1) return;
            autoUpdater.quitAndInstall();
        }, 5000);
    });


    /*const updateFeed = `${config.updateServerUrl}/app/updates/latest`;
    autoUpdater.setFeedURL(updateFeed + '?v=' + appVersion+'&os='+os);
    setTimeout(()=>{
        autoUpdater.checkForUpdates();
    },1000);
    autoUpdater.on('update-available',()=>{
        const choice = dialog.showMessageBox(
            {
                type: 'question',
                buttons: [_translate('Yes'), _translate('No')],
                title: _translate('New Release'),
                message: _translate('Do yo want to update?')
            });

        if(choice==1) return;
        autoUpdater.quitAndInstall();
    });*/
    /*const updater =new Updater({updateFeedUrl,os,appVersion,system});
    setTimeout(()=>{
        updater.checkForUpdates(()=>{
            setLoadingSize();
            mainWindow.show();
            mainWindow.webContents.send('appChange','screen','loading');
        });
    },1000)*/
}));

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
        mainWindow.webContents.send('appChange','appVersion',appVersion);
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
        if(system && system.account) mainWindow.hide();
    });
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

const logout = co.wrap(function * logout(){
    system.account = false;
    yield db.updateAsync({_id:system._id},{$set:{account:false}});
    showLoginForm();
    mainWindow.webContents.send('appChange','user',null);
    mainWindow.webContents.send('appChange','screen','login');
    if(app.dock) app.dock.show();
    mainWindow.show();
});


function showToolbar(){
    mainWindow.hide();
    setupTray();
    mainWindow.setSize(400,390);
    screen="toolbar";
}

function setupTray(){
    tray = new Tray(path.join(__dirname,`../assets/images/tray-${os}.png`));
    const contextMenu = Menu.buildFromTemplate([
        {label: _translate('Open dashboard'), type: 'normal',click: openDashBoard},
        {label: _translate('Take a shot'), accelerator: HOT_KEYS[os].makeFullScreenShot, type: 'normal',click: ()=>{mainWindow.webContents.send('makeSnapshot');}},
        {label: _translate('Take a framed shot'), accelerator: HOT_KEYS[os].makeFramedScreenShot, type: 'normal',click: ()=>{mainWindow.webContents.send('makeFramedSnapshot');}},
        /*{label: _translate('Upload files'), accelerator: HOT_KEYS[os].uploadFiles, type: 'normal',click: ()=>{mainWindow.webContents.send('uploadFiles');}},*/
        {label: _translate('Logout'), type: 'normal',click: logout },
        {label: _translate('Exit'), type: 'normal', click:()=>{app.quit();}}
    ]);

    tray.setToolTip('Synecto');
    tray.setContextMenu(contextMenu);

    tray.on(os=='mac'?'right-click':'click', openDashBoard);
    if(app.dock) app.dock.hide();
}

function createOverlayWindow(){
    const {width, height} = electron.screen.getPrimaryDisplay().workAreaSize;
    overlayWindow = new BrowserWindow({
        fullscreen:false,
        width: width,
        height: height,
        show:true,
        transparent:true,
        frame: false,
        resizable: false,
        skipTaskbar: true,
        alwaysOnTop:true,
    });
    overlayWindow.loadURL(url.format({
        pathname: path.join(__dirname, './renderer/overlay.html'),
        protocol: 'file:',
        slashes: true
    }));
    // Global shotrcuts
    globalShortcut.register('Esc',()=>overlayWindow?overlayWindow.webContents.send('closeOverlay'):()=>{});
    globalShortcut.register('Enter',()=>overlayWindow?overlayWindow.webContents.send('applyOverlayAction'):()=>{});
    // Clean up
    overlayWindow.on('closed', function () {
        overlayWindow = null
        globalShortcut.unregister('Esc');
        globalShortcut.unregister('Enter');
    });
    overlayWindow.focus();
};

function makeFramedScreenShot(data) {
    mainWindow.webContents.send('makeFramedScreenShot', data);
}
function closeOverlayWindow(data){
    overlayWindow.destroy();
}
function hideMainWindow(){
    mainWindow.hide();
}
function showMainWindow(){
    mainWindow.show();
}
function setLoadingSize(){
    mainWindow.setSize(400,150,true);
}
function setToolbarSize(){
    mainWindow.setSize(400,390);
}
function hideOverlayWindow(){
    overlayWindow.hide();
}
function openDashBoard(){
    const {x,y,width} = tray.getBounds();
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    //mainWindow.setPosition(x-WINDOW_DIMS.width+20,y-WINDOW_DIMS.height);
}

function _translate(msg) {
    const translated = locales[system.language]?locales[system.language][msg]:null;
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

const googleClient = gapi(browserWindowParams);


const gogoleSignIn = co.wrap(function * gogoleSignIn(){
    let goaData = yield db.findOneAsync({'goa':true});
    if(!goaData) goaData = yield _fetchGoaData();
    if(goaData.foulDate<new Date().getTime()) goaData = yield _refreshToken(goaData);
    const response = yield axios.get(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${goaData.access_token}`);
    return response.data;
});


const _changeLanguage = co.wrap(function * _changeLanguage(language){
    system.language = language;
    if(!tray) return;
    const contextMenu = Menu.buildFromTemplate([
        {label: _translate('Open dashboard'), type: 'normal',click: openDashBoard},
        {label: _translate('Take a shot '+os),  type: 'normal',click: ()=>{mainWindow.webContents.send('makeSnapshot');}},
        {label: _translate('Take a framed shot '+os), type: 'normal',click: ()=>{mainWindow.webContents.send('makeFramedSnapshot');}},
        /*{label: _translate('Upload files'), accelerator: HOT_KEYS[os].uploadFiles, type: 'normal',click: ()=>{mainWindow.webContents.send('uploadFiles');}},*/
        {label: _translate('Logout'), type: 'normal',click: this.logout },
        {label: _translate('Exit'), type: 'normal', click:()=>{app.quit();}}
    ]);
    tray.setContextMenu(contextMenu);
});

const _fetchGoaData = co.wrap(
    function * _fetchGoaData(){
        // retrieve access token and refresh token
        const goaData = yield googleClient.getAccessToken(
            ['https://www.googleapis.com/auth/plus.me',
                'https://www.googleapis.com/auth/userinfo.profile',
                'openid','email','profile'
            ],
            '32127497436-69kgln3ll1ch0p8mhjcgqqv1c6c72h06.apps.googleusercontent.com',
            'cg_-cpgzt3xgemmquOmvNq5L'
        );
        // Establish expiration date
        const d = new Date();
        goaData.foulDate = d.getTime() + goaData.expires_in*1000;
        // Save creds in db
        yield db.updateAsync({'goa':true},Object.assign({goa:true},goaData),{upsert:true});
        return goaData;
    }
)

const _refreshToken = co.wrap(function * refreshToken(goaData){
    const response = yield googleClient.refreshToken('32127497436-69kgln3ll1ch0p8mhjcgqqv1c6c72h06.apps.googleusercontent.com','cg_-cpgzt3xgemmquOmvNq5L',goaData.refresh_token);
    const updatedGoa = Object.assign(goaData,response);
    updatedGoa.foulDate = new Date().getTime() + response.expires_in*1000;
    yield db.updateAsync({'goa':true},updatedGoa,{upsert:true});
    return updatedGoa;
});

function getOs(){
    return os;  
};

module.exports = {gogoleSignIn,openDashBoard,hideOverlayWindow,setToolbarSize,setLoadingSize,showMainWindow,
        hideMainWindow,closeOverlayWindow,makeFramedScreenShot,createOverlayWindow,setupTray,showToolbar,
        showLoginForm,logout,_changeLanguage,getOs};




