// app/routes.js

'use strict';

const express = require('express');
const projectRouter = require('./facebookcast/project/project.route');
const campaignRouter = require('./facebookcast/campaign/campaign.route');
const adsetRouter = require('./facebookcast/adset/adset.route');
const adRouter = require('./facebookcast/ad/ad.route');
const creativeRouter = require('./facebookcast/creative/creative.route');
const pixelRouter = require('./facebookcast/pixel/pixel.route');
const targetingRouter = require('./facebookcast/targeting/targeting.route');
const previewRouter = require('./facebookcast/preview/preview.route');
const insightRouter = require('./facebookcast/insight/insight.route');
const adlabelRouter = require('./facebookcast/adlabel/adlabel.route');
const estimateRouter = require('./facebookcast/estimate/estimate.route');
const adstudyRouter = require('./facebookcast/adstudy/adstudy.route');
const budgetRouter = require('./facebookcast/budget/budget.route');
const blocklistRouter = require('./facebookcast/blocklist/blocklist.route');
const customAudienceRouter = require('./facebookcast/customaudience/customaudience.route');

// Temporary routing
// const masterRouter = require('./master/master.route');

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
router.use('/targeting', targetingRouter);
router.use('/preview', previewRouter);
router.use('/insight', insightRouter);
router.use('/adlabel', adlabelRouter);
router.use('/estimate', estimateRouter);
router.use('/adstudy', adstudyRouter);
router.use('/budget', budgetRouter);
router.use('/blocklist', blocklistRouter);
router.use('/custom-audience', customAudienceRouter);

// Temporary routing
// router.use('/master', masterRouter);

module.exports = router;
