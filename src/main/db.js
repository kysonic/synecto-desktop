const path = require('path');
const Datastore = require('nedb');
const bluebird = require('bluebird');
const mkdirp =require('mkdirp');

bluebird.promisifyAll(Datastore.prototype);
const homedir = require('os').homedir();
mkdirp.sync(path.join(homedir,'Designmap'));
const dbFilePath = path.join(homedir,'Designmap','designmapp.db');
//const dbFilePath = path.join(__dirname,'../..','designmapp.db');
const db = new Datastore({ filename: dbFilePath, autoload: false });

module.exports = db;

