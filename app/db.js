// app/db.js

'use strict';

const logger = require('./utils').logger();
const MongoClient = require('mongodb');

let castrDB;
let fbCastDB;

module.exports = {
    connectCastrDB() {
        return new Promise((resolve, reject) => {
            MongoClient.connect(`mongodb://${process.env.CASTR_DB_USER}:${process.env.CASTR_DB_PW}@ds123400.mlab.com:23400/${process.env.CASTR_DB_HOST}`)
                .then((database) => {
                    castrDB = database;
                    logger.debug('CastrDB connected');
                    resolve();
                })
                .catch((err) => {
                    logger.error('CastrDB connection failed');
                    reject(new Error(err.message));
                });
        });
    },
    connectFBCastDB() {
        return new Promise((resolve, reject) => {
            MongoClient.connect(`mongodb://${process.env.FBCAST_DB_USER}:${process.env.FBCAST_DB_PW}@ds149412.mlab.com:49412/${process.env.FBCAST_DB_HOST}`)
                .then((database) => {
                    fbCastDB = database;
                    logger.debug('FBCastDB connected');
                    resolve();
                })
                .catch((err) => {
                    logger.error('FBCastDB connection failed');
                    reject(new Error(err.message));
                });
        });
    },
    getCastrDB() { return castrDB; },
    getFBCastDB() { return fbCastDB; },
    ObjectId: MongoClient.ObjectId,
};
