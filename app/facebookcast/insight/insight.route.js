// app/facebookcast/insight/insight.routes.js

'use strict';

const express = require('express');
const insightService = require('./insight.service');

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        const params = {
            castrBizId: req.query.castrBizId,
            castrLocId: req.query.castrLocId,
            promotionId: req.query.promotionId,
            dateRange: req.query.dateRange,
        };
        if (!params.castrBizId && !params.castrLocId) throw new Error('Missing query param: must provide either \'castrBizId\' or \'castrLocId\'');
        res.json(await insightService.getPromotionInsights(params, false));
    } catch (err) {
        next(err);
    }
});

router.get('/mock', async (req, res, next) => {
    try {
        const params = {
            castrBizId: req.query.castrBizId,
            castrLocId: req.query.castrLocId,
            promotionId: req.query.promotionId,
            dateRange: req.query.dateRange,
        };
        if (!params.castrBizId && !params.castrLocId) throw new Error('Missing query param: must provide either \'castrBizId\' or \'castrLocId\'');
        res.json(await insightService.getPromotionInsights(params, true));
    } catch (err) {
        next(err);
    }
});

module.exports = router;
