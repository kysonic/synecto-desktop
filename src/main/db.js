const path = require('path');
const url = require('url');
const Datastore = require('nedb');
const bluebird = require('bluebird');

bluebird.promisifyAll(Datastore.prototype);

const dbFilePath = path.join(require('os').homedir(),'designmapp.db');
//const dbFilePath = path.join(__dirname,'../..','designmapp.db');
const db = new Datastore({ filename: dbFilePath, autoload: false });

module.exports = db;

