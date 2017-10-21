// server.js

'use strict';

require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const mongoDB = require('./app/db');
const logger = require('./app/utils').logger();
const routes = require('./app/routes');

const app = express();
const port = process.env.PORT;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

Promise.all([mongoDB.connectCastrDB(), mongoDB.connectFBCastDB()])
    .then(() => {
        app.use('/', routes);

        app.listen(port, () => {
            logger.debug(`we are live on ${port}`);
        });
    })
    .catch((err) => {
        logger.error('Application failed to launch');
    });
