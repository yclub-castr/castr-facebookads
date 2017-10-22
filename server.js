// server.js

'use strict';

require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const mongoDB = require('./app/db');
const logger = require('./app/utils').logger();
const adsSdk = require('facebook-ads-sdk');

const app = express();
const port = process.env.PORT;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

mongoDB.isReady()
    .then(() => {
        logger.debug('Databases are ready');

        app.use('/', (req, res, next) => {
            logger.debug('# Incoming Request');
            logger.debug(`# ${req.method} ${req.originalUrl}`);
            next();
        });

        const routes = require('./app/routes'); // eslint-disable-line global-require
        app.use('/', routes);

        app.listen(port, () => {
            adsSdk.FacebookAdsApi.init(process.env.ADMIN_SYS_USER_TOKEN);
            logger.debug(`we are live on ${port}`);
        });
    })
    .catch((err) => {
        logger.error(err);
        logger.error('Application failed to launch');
    });
