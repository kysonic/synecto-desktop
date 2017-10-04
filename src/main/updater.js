const request = require('request-promise');
const co = require('co');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process')
const {app,dialog} = require('electron');
const fork = require('child_process').fork;

const locales = {
    ru: require('../../assets/locales/ru.json'),
    en: require('../../assets/locales/en.json')
}
let system = {};

class Updater {
    constructor(opts){
        this.opts = opts;
        system = opts.system;
    }
    checkForUpdates(loadingFn){
        co.wrap(function*(){
            const response = yield request(this.opts.updateFeedUrl+`?v=${this.opts.appVersion}&os=${this.opts.os}`);
            const data = JSON.parse(response);
            if(data.status!=='update') return;
            const choice = dialog.showMessageBox(
                {
                    type: 'question',
                    buttons: [_translate('Yes'), _translate('No')],
                    title: _translate('New Release'),
                    message: _translate('Do yo want to update?')
                });

            if(choice==1) return;
            loadingFn();
            // Download file
            const dbFilePath = path.join(require('os').homedir(),'Synecto','app.'+data.version+'.update');
            const file = fs.createWriteStream(dbFilePath);
            http.get(data.url+'/app.asar', function(response) {
                response.pipe(file);

                file.on('finish', function() {
                    const newPath = path.join(__dirname,'../../../','app.'+data.version+'.update');
                    const newPathAsar = path.join(__dirname,'../../../','app.asar');
                    const stream = fs.createReadStream(dbFilePath).pipe(fs.createWriteStream(newPath));
                    stream.on('finish',()=>{
                        const child = fork(path.join(__dirname,'./replacer.js'),[],{env:{FROM:newPath,TO:newPathAsar},stdio: 'pipe'});
                        //app.exit(0);
                    });
                    file.close(()=>{});
                });
            }).on('error', function(err) {
                fs.unlink(data.url+'/app.asar');
            });

        }.bind(this))()
    }
}

function _translate(msg) {
    const translated = locales[system.language]?locales[system.language][msg]:null;
    return translated?translated.message:msg;
}

module.exports = Updater;