var electronInstaller = require('electron-winstaller');
var resultPromise = electronInstaller.createWindowsInstaller({
    appDirectory: './dist/win-unpacked/',
    outputDirectory: './dist',
    authors: 'Anton Miroshnichenko',
    exe: 'designmapp.exe'
});

resultPromise.then(() => console.log("It worked!"), (e) => console.log(`No dice: ${e.message}`));