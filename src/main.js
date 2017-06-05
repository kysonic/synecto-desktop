/**
 * It is an entry point of entire Designmap SCR Application
 * Here we go with windows, keys, trays and another stuff.
 */

const electron = require('electron');
const {app, globalShortcut, BrowserWindow, Menu, Tray} = electron;
const osLocale = require('os-locale');

const path = require('path');
const url = require('url');
const config = require('./config');

const WINDOW_DIMS = {width: 400,height:390};

// Data store

const db = require('./main/db');

let browserLanguage = 'en';

osLocale().then(locale => browserLanguage=locale.substr(0,2));

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
    globalShortcut.register('Control+PrintScreen',()=>{
        mainWindow.webContents.send('makeSnapshot');
    });

    globalShortcut.register('Command+Option+4',()=>{
        mainWindow.webContents.send('makeSnapshot');
    });

    mainWindow.webContents.on('did-finish-load',()=>{
        mainWindow.webContents.send('appChange','system',system);
        mainWindow.webContents.send('appChange','user',user);
        mainWindow.webContents.send('appChange','screen',screen);
        mainWindow.webContents.send('appChange','config',config);
    });

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your main supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
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
}

module.exports.showLoginForm = showLoginForm.bind(this);

module.exports.showToolbar = function(){
    mainWindow.hide();
    this.setupTray();
    mainWindow.setSize(400,390);
    screen="toolbar";
}

module.exports.setupTray = function(){
    tray = new Tray(path.join(__dirname,'../assets/images/tray.png'))

    const contextMenu = Menu.buildFromTemplate([
        {label: 'Take a shot', type: 'normal',click: ()=>{mainWindow.webContents.send('makeSnapshot');}},
        {label: 'Logout', type: 'normal',click: this.logout },
        {label: 'Exit', type: 'normal', click:()=>{app.quit();}}
    ]);

    tray.setToolTip('Designmap');
    tray.setContextMenu(contextMenu);

    tray.on('right-click', () => {
        const {x,y,width} = tray.getBounds();
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
        mainWindow.setPosition(x-WINDOW_DIMS.width+20,y-WINDOW_DIMS.height);
    });
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


