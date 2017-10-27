// app/routes.js

'use strict';

const express = require('express');
const projectRouter = require('./facebookcast/project/project.route');
const campaignRouter = require('./facebookcast/campaign/campaign.route');
const adsetRouter = require('./facebookcast/adset/adset.route');
const adRouter = require('./facebookcast/ad/ad.route');
const creativeRouter = require('./facebookcast/creative/creative.route');
const pixelRouter = require('./facebookcast/pixel/pixel.route');

const router = express.Router();

router.get('/', (req, res) => {
    res.send('It\'s alive!!!');
});

router.use('/project', projectRouter);
router.use('/campaign', campaignRouter);
router.use('/adset', adsetRouter);
router.use('/ad', adRouter);
router.use('/creative', creativeRouter);
router.use('/pixel', pixelRouter);

module.exports = router;
