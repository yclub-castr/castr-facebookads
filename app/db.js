// app/db.js

'use strict';

const logger = require('./utils').logger();
const mongoose = require('mongoose');

let castrDB;
let fbCastDB;

const castrDBPromise = new Promise((resolve, reject) => {
    const castrDBUri = `mongodb://${process.env.CASTR_DB_USER}:${process.env.CASTR_DB_PW}@ds123400.mlab.com:23400/${process.env.CASTR_DB_HOST}`;
    castrDB = mongoose.createConnection(castrDBUri, { useMongoClient: true });
    castrDB.once('open', () => {
        logger.debug('CastrDB connected');
        resolve(castrDB);
    });
    castrDB.on('error', (err) => {
        logger.error('CastrDB connection failed');
        reject(new Error(err.message));
    });
});

const fbCastDBPromise = new Promise((resolve, reject) => {
    const fbCastDBUri = `mongodb://${process.env.FBCAST_DB_USER}:${process.env.FBCAST_DB_PW}@ds149412.mlab.com:49412/${process.env.FBCAST_DB_HOST}`;
    fbCastDB = mongoose.createConnection(fbCastDBUri, { useMongoClient: true });
    fbCastDB.once('open', () => {
        logger.debug('FBCastDB connected');
        resolve(fbCastDB);
    });
    fbCastDB.on('error', (err) => {
        logger.error('FBCastDB connection failed');
        reject(new Error(err.message));
    });
});

module.exports = {
    isReady() { return Promise.all([castrDBPromise, fbCastDBPromise]); },
    castrDB: castrDB,
    fbCastDB: fbCastDB,
    mongoose: mongoose,
};
