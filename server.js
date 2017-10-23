// server.js

'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoDB = require('./app/db');
const logger = require('./app/utils').logger();
const adsSdk = require('facebook-ads-sdk');

const app = express();
const port = process.env.PORT;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

mongoDB.isReady()
    .then(() => {
        logger.debug('Databases are ready');

        app.use('/', (req, res, next) => {
            logger.debug(`# ${req.method} ${req.path}`);
            next();
        });

        const routes = require('./app/routes'); // eslint-disable-line global-require
        app.use('/', routes);

        app.use((err, req, res, next) => {
            if (err) {
                let error = err;
                while (error.error) error = error.error;
                logger.error(error);
                res.send({
                    success: false,
                    message: err.message,
                    error: error,
                });
            }
        });

        app.listen(port, () => {
            logger.debug(`we are live on ${port}`);
        });
    })
    .catch((err) => {
        logger.error(err);
        logger.error('Application failed to launch');
    });
