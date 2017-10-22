// app/routes.js

'use strict';

const express = require('express');
const projectRouter = require('./facebookcast/project/project.route');
const campaignRouter = require('./facebookcast/campaign/campaign.route');

const router = express.Router();

router.get('/', (req, res) => {
    res.send('It\'s alive!!!');
});

router.use('/project', projectRouter);
router.use('/campaign', campaignRouter);


module.exports = router;
