// app/facebookcast/estimate/estimate.route.js

'use strict';

const express = require('express');
const locale = require('../../constants').locale;
const estimateService = require('./estimate.service');

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        const params = {
            castrBizId: req.query.castrBizId,
            optimizationGoal: req.query.optimizationGoal,
            promotedObject: req.query.promotedObject,
            targetingSpec: req.query.targetingSpec,
        };
        if (!params.castrBizId) throw new Error('Missing params: must provide `castrBizId`');
        res.json(await estimateService.getEstimate(params));
    } catch (err) {
        next(err);
    }
});

module.exports = router;
