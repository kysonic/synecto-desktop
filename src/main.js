/**
 * It is an entry point of entire Designmap SCR Application
 * Here we go with windows, keys, trays and another stuff.
 */

const electron = require('electron');
const {app, globalShortcut, BrowserWindow, Menu, Tray} = electron;

const path = require('path');
const url = require('url');

const WINDOW_DIMS = {width: 250,height:80};

// Data store

const db = require('./main/db');


let tray = null;
let system = null;
let user = null;

db.loadDatabase(async (err)=>{
    if(err) throw new Error(err);
    system = await db.findOneAsync({system:true});
    if(!system) system = await db.insertAsync({system: true, account: false});
    if(!system.account) return this.showLoginForm();
    user = await db.findOneAsync({user:true,_id:system.account});
    this.showToolbar();
});



// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow



function createWindow () {
    // Create the browser window.
    mainWindow = new BrowserWindow({width: WINDOW_DIMS.width, height: WINDOW_DIMS.height, show:false, frame: false, resizable: true})

    // and load the index.html of the main.
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }))

    //mainWindow.webContents.openDevTools()
    globalShortcut.register('Control+PrintScreen',()=>{
        mainWindow.webContents.send('ping', 'makeSnapshot');
    });

    globalShortcut.register('Command+Option+4',()=>{
        mainWindow.webContents.send('ping', 'makeSnapshot');
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

module.exports.showLoginForm = function(){
    mainWindow.center();
    const currentPosition = mainWindow.getPosition();
    mainWindow.setPosition(currentPosition[0]-120,currentPosition[1]);
    mainWindow.setSize(470,575);
    mainWindow.show();
    mainWindow.webContents.send('appVarChange', {var:'screen',val:'login'});
    tray?tray.destroy():null;
};

module.exports.showToolbar = function(){
    mainWindow.setSize(200,575);
    mainWindow.hide();
    mainWindow.webContents.send('appVarChange', {var:'screen',val:'toolbar'});
    this.setupTray();
}

module.exports.setupTray = function(){
    tray = new Tray(path.join(__dirname,'../assets/images/tray.png'))

    const contextMenu = Menu.buildFromTemplate([
        {label: 'Take a shot', type: 'normal',click: ()=>{mainWindow.webContents.send('ping', 'makeSnapshot');}},
        {label: 'Exit', type: 'normal', click:()=>{app.quit();}}
    ]);

    tray.setToolTip('Designmap');
    tray.setContextMenu(contextMenu);

    tray.on('right-click', () => {
        const {x,y,width} = tray.getBounds();
        mainWindow.setPosition(x-WINDOW_DIMS.width+width,y-WINDOW_DIMS.height);
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    });
}
