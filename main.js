const electron = require('electron')
const {app, globalShortcut, BrowserWindow, Menu, Tray} = electron


const path = require('path')
const url = require('url')

const WINDOW_DIMS = {width: 250,height:80};


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
    // Create the browser window.
    mainWindow = new BrowserWindow({width: WINDOW_DIMS.width, height: WINDOW_DIMS.height, show:false, frame: false})

    // and load the index.html of the app.
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }))

    globalShortcut.register('Control+PrintScreen',()=>{
        mainWindow.webContents.send('ping', 'makeSnapshot');
    });

    globalShortcut.register('Command+Option+4',()=>{
        mainWindow.webContents.send('ping', 'makeSnapshot');
    });

    //mainWindow.webContents.openDevTools()

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
    })

    tray = new Tray(path.join(__dirname,'assets/tray.png'))

    const contextMenu = Menu.buildFromTemplate([
        {label: 'Take a shot', type: 'normal',click: ()=>{mainWindow.webContents.send('ping', 'makeSnapshot');}},
        {label: 'Exit', type: 'normal', click:()=>{app.quit();}}
    ])
    tray.setToolTip('Designmap')
    tray.setContextMenu(contextMenu)

    tray.on('right-click', () => {
        const {x,y,width} = tray.getBounds();
        mainWindow.setPosition(x-WINDOW_DIMS.width+width,y-WINDOW_DIMS.height);
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
    });
}


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow()
    }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
