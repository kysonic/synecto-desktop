const path = require('path');
const Datastore = require('nedb');
const bluebird = require('bluebird');

bluebird.promisifyAll(Datastore.prototype);
const db = new Datastore({ filename: path.join(__dirname,'../db/data.db'), autoload: false });

module.exports = db;

