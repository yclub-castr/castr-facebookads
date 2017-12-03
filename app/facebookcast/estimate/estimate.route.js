// app/facebookcast/estimate/estimate.route.js

'use strict';

const express = require('express');
const locale = require('../../constants').locale;
const estimateService = require('./estimate.service');

const router = express.Router();

router.get('/adset', async (req, res, next) => {
    try {
        const params = {
            adsetId: req.query.adsetId,
            adsetIds: req.query.adsetIds,
            fields: req.query.fields,
            castrBizId: req.query.castrBizId,
        };
        if (!params.adsetId && !params.adsetIds) throw new Error('Missing params: must provide `adsetId`');
        res.json(await estimateService.getAdSetEstimate(params));
    } catch (err) {
        next(err);
    }
});

router.get('/account', async (req, res, next) => {
    try {
        const params = {
            castrBizId: req.query.castrBizId,
            optimizationGoal: req.query.optimizationGoal,
            promotedObject: req.query.promotedObject,
            targetingSpec: req.query.targetingSpec,
        };
        if (!params.castrBizId) throw new Error('Missing params: must provide `castrBizId`');
        res.json(await estimateService.getAccountEstimate(params));
    } catch (err) {
        next(err);
    }
});

module.exports = router;
